'use strict';

import { Dsender } from './dsender.js';
import { DownloaderTaker } from './downloadTaker.js';

import { DownloaderBase } from '../lib/downloader-base.js';

var dsender = new Dsender();
dsender.tmgr.updateInterval = 1000;


function createDownCallback({url, name, referer, size}) {
  browser.cookies.getAll({url: referer}).then((cookies) => {
    const cookie = cookies.map((el) => el.name+'='+el.value).join('; ');
    const params = new URLSearchParams({
      url, referer, cookie, 
      ua: window.navigator.userAgent, 
      name,size, type: 'url',
      popup: 'true'
    });
    browser.windows.create({
      url: '/pages/new-task/index.html?' + params.toString(),
      width: 600,
      height: 400,
      type: 'popup'
    });
  });
};
var dTaker = new DownloaderTaker(createDownCallback);

function setMonitor(enable) {
  if(enable)
    dTaker.startMonitor({webrequest: true});
  else
    dTaker.stopMonitor();
}

var defaultDerName = '';

// get all config
browser.storage.local.get(['enableCap', 'defaultDownloader']).then(item => {
  if(typeof(item.enableCap) === 'boolean') {
    setMonitor(item.enableCap);
  }
  if(item.defaultDownloader) {
    defaultDerName = item.defaultDownloader;
  } 
});

var storageListeners = new Map();
function addStorageListener(keymatch, add, remove, change) {
  const empty = function() {};
  storageListeners.set(keymatch, {add: add||empty, remove: remove||empty, change: change||empty});
}

addStorageListener('enableCap',
  (key, value) => setMonitor(value.newValue),
  null,
  (key, value) => setMonitor(value.newValue)
)

addStorageListener('downloader_', 
  function(key, value) {
    dsender.tmgr.setDownloader(value.newValue);
  },
  function(key, value) {
    const name = DownloaderBase.idToName(key);
    dsender.tmgr.removeDownloader(name);
  },
  function(key, value) {
    dsender.tmgr.setDownloader(value.newValue);
  }
)
addStorageListener('defaultDownloader',
  function(key, value) {
    console.log(value);
    defaultDerName = value.newValue;
  },
  null,
  function(key, value) {
    console.log(value);
    defaultDerName = value.newValue;
  }
); 

browser.storage.onChanged.addListener(function(changes, area) {
  storageListeners.forEach(function(svalue, key) {
    const rename = new RegExp(key);
    Object.entries(changes).forEach(function([key, value]) {
      if(key.match(rename)) {
        if(typeof(value.oldValue) === 'undefined')
          svalue.add(key, value);
        else if(typeof(value.newValue) === 'undefined')
          svalue.remove(key, value);
        else
          svalue.change(key, value);
      }
    });
  });
});


// connections 
var popupPort = null;

browser.runtime.onConnect.addListener(function(port) {
    if(port.name === 'request') {
      port.onMessage.addListener((message) => {
        if(typeof(message.id) !== 'number') return;
        const id = message.id;
        const cmd = message.message.command;
        const data = message.message.data;
        const sendOk = (result) => {
          if(!port.disconnected)
            port.postMessage({id: id, message: result}
        )};
        const sendError = (reason) => port.postMessage({id: id, error: reason.toString()});
        
        if(cmd === 'sync') {
          if(data) dsender.tmgr.updateStatus(true);
          const derStatus = dsender.tmgr.getDownloaderStatus()
          const taskItems = dsender.tmgr.getTaskStatus().filter((el) => {
            const newStatus = el.status.newStatus;
            if(newStatus)
              el.status.newStatus = false;
            return newStatus;
          });
          sendOk({downloaderStatus: derStatus, taskItems: taskItems});
        }
        else if(cmd === 'downloaderStatus') {
          sendOk(dsender.tmgr.getDownloaderStatus());
        }
        else if(cmd === 'removeTask') {
          dsender.tmgr.removeTask(data).then(sendOk, sendError);
        } else if(cmd === 'deleteTask') {
          dsender.tmgr.removeTask(data, true).then(sendOk, sendError);
        } else if(cmd === 'pauseTask' || cmd === 'resumeTask') {
          dsender.tmgr.taskAction(cmd, data).then(sendOk, sendError);
        } else if(cmd === 'addTask') {
          const p = data.params;
          if(p.btParams && p.btParams.torrentData) {
            fetch(p.btParams.torrentData).then((r) => r.blob()).then((r) => {
              p.btParams.torrentData = r;
              return dsender.tmgr.addTask(data.params, data.downloader);
            }).then(sendOk, sendError);
          } else  {
            dsender.tmgr.addTask(data.params, data.downloader).then(sendOk, sendError);
          }
        }
      });
      port.onDisconnect.addListener(function(p) { p.disconnected = true; })
    }
});


browser.contextMenus.create({
  id: "send",
  title: "Send with Dsender",
  contexts: ['link'],
  documentUrlPatterns: ['*://*/*']
});

browser.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "send") {
    if(DownloaderBase.isMagnet(info.linkUrl)) {
      const params = new URLSearchParams({popup: true, type: 'btMagnet', magnet: info.linkUrl});
      browser.windows.create({
        url: '/pages/new-task/index.html?' + params.toString(),
        width: 500,
        height: 280,
        type: 'popup'
      });
    } else {
      createDownCallback({ url: info.linkUrl, name: DownloaderBase.getMagnetInfo(info.linkUrl).name, referer: info.pageUrl, size: null});
    }
  }
});