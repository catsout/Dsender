'use strict';
import '../lib/wrapFetch.js';

import { openPopupWindow } from './window-open.js';
import { Dsender } from './dsender.js';


var dsender = new Dsender();

browser.runtime.onConnect.addListener(function(port) {
    if(port.name === 'popup') {
      dsender.tmgr.updateInterval = 1000;
      port.onDisconnect.addListener(function() {
        dsender.tmgr.updateInterval = 3000;
      })
    }
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
        } else if(cmd === 'refresh') {
          dsender.tmgr.updateStatus(true);
          sendOk();
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
        } else if(cmd === 'openWindow') {
          openPopupWindow(data.id, data.params);
          sendOk();
        } else if(cmd === 'downloaderOption') {
          dsender.tmgr.getDownloaderOption(data).then(sendOk, sendError);
        } else if(cmd === 'setDownloaderOption') {
          dsender.tmgr.setDownloaderOption(data.name, data.options).then(sendOk, sendError);
        }
      });
      port.onDisconnect.addListener(function(p) { p.disconnected = true; })
    }
});

dsender.tmgr.updateInterval = 3000;