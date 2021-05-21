'use strict';

import { basename, DownloaderStatus, EDownloaderStats, EDownloaderType, ETaskStats, Task, TaskStatus } from '../common.js';
import Aria2 from '../lib/downloader-aria2.js';
import { DownloaderBase } from '../lib/downloader-base.js';



var tasks = [];
function saveTasks() {
  let ts = tasks.map((el) => el.task); 
  browser.storage.local.set({tasks: ts});
}

var enableCap = false;
var defaultDerName = '';
var derList = [];
function getDownloader(name) {
  let i=0;
  while(i<derList.length) {
    if(derList[i].name === name)
      return derList[i];
    i++;
  }
  return null;
}

function createDownloaderFromConfig(config) {
  switch(config.type) {
    case EDownloaderType.aria2:
      let down = new Aria2(config.name);
      down.fromConfig(config);
      return down;
  }
}

// get all config
browser.storage.local.get(null).then(item => {
  if(typeof(item.enableCap) === 'boolean') {
    enableCap = item.enableCap;
  }
  if(item.tasks) {
    item.tasks.forEach((el) => {
      tasks.push({task: el, taskStatus: new TaskStatus()});
    });
  }
  if(item.downloaderList) {
    item.downloaderList.forEach(function(el, index) {
      if(item[el])
        derList.push(createDownloaderFromConfig(item[el]));
      else
        browser.storage.local.remove(el);
    });
  }
  if(item.defaultDownloader) {
    defaultDerName = item.defaultDownloader;
  } 
});

var storageListeners = new Map();
function addStorageListener(keymatch, add, remove, change) {
  let empty = function() {};
  storageListeners.set(keymatch, {add: add||empty, remove: remove||empty, change: change||empty});
}

addStorageListener('enableCap',
  (key, value) => enableCap = value.newValue,
  null,
  (key, value) => enableCap = value.newValue
)

addStorageListener('downloader_', 
  function(key, value) {
    derList.push(createDownloaderFromConfig(value.newValue));
    if(!defaultDerName) {
      browser.storage.local.set({defaultDownloader: value.newValue.name});
    }
  },
  function(key, value) {
    let name = DownloaderBase.idToName(key);
    for(let i=0;i<derList.length;i++) {
      if(derList[i].name === name) {
        derList.splice(i, 1);
        if(name === defaultDerName) {
          browser.storage.local.remove('defaultDownloader');
        }
        return;
      }
    }
  },
  function(key, value) {
    let name = DownloaderBase.idToName(key);
    let der = derList.find(el => el.name === name);
    if(der) {
      der.fromConfig(value.newValue);
    }
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
    let rename = new RegExp(key);
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
var downloadersPort = null;

browser.runtime.onConnect.addListener(function(port) {
    if (port.name === 'popup') {
        refreshTask(port.postMessage);
        let tid = setInterval(function() {
          sendToPopup(port.postMessage);
        }, 500);
        port.onMessage.addListener(function(message) {
          let cmd = message.command;
          if(cmd === 'removeTask') {
            removeTask(message.data);
          }
        })
        port.onDisconnect.addListener(function(p) {
          clearInterval(tid);
          console.log('popup disconnected');
        });
        console.log('popup connected');
        popupPort = port;
    } else if(port.name === 'downloaders') {
      let tid = setInterval(function() {
        sendToDownloadrs(port.postMessage);
      }, 1000);
      port.onDisconnect.addListener(function() {
        clearInterval(tid);
      });
      sendToDownloadrs(port.postMessage);
      downloadersPort = port;
    } else if(port.name === 'request') {
      port.onMessage.addListener((message) => {
        if(typeof(message.id) !== 'number') return;
        let id = message.id;
        const cmd = message.message.command;
        const data = message.message.data;
        if(cmd === 'enableCap') {
          enableCap = data;
          browser.storage.local.set({enableCap: enableCap});
          port.postMessage({id: id});
        }
        else if(cmd === 'removeTask') {
          removeTask(data);
          port.postMessage({id: id});
        } else if(cmd === 'addTask') {
          let der = getDownloader(data.downloader);
          der.addTask(data.url, data.params).then((result) => {
            addTask(result);
            console.log(id);
            port.postMessage({id: id, message: result});
          });
        }
      });
    }
});

function getTaskIndex(task) {
  for(let i=0;i<tasks.length;i++) {
    let cmp = tasks[i].task;
    if(task.key == cmp.key && task.downloader == cmp.downloader)
      return i;
  }
  return null;
}

function addTask(task) {
  tasks.push({task: task, taskStatus: new TaskStatus()});
  saveTasks();
}

function removeTask(task) {
  let i = 0;
  while(i<tasks.length) {
    let cmp = tasks[i].task;
    if(cmp.downloader == task.downloader && cmp.key == task.key) {
      tasks.splice(i,1);
      saveTasks();
      return;
    }
    i++;
  }
}

browser.downloads.onCreated.addListener(function handleCreated(item) {
  //cookies.getAll()
  //item.referrer
  if(!enableCap) return;
  let der = getDownloader(defaultDerName);
  if(!der || der.status.stats !== EDownloaderStats.ok)
    return;

  der.addTask(
    item.url,
    {
      filename: basename(item.filename), 
    }
  ).then(v => {
    addTask(v);
  });

  browser.downloads.cancel(item.id);
  browser.downloads.erase({id: item.id});
});


function refreshTask(sender) {
  tasks.forEach(el => {
    if(el.taskStatus) {
      el.taskStatus.newStatus = true;
    }
  });
  sendToPopup(sender);
  tasks.forEach(el => {
    if(el.taskStatus) {
      el.taskStatus.stats = ETaskStats.downloading;
    }
  });
}

function sendToDownloadrs(sender) {
  let derStatusMap = {};
  for(let i=0;i<derList.length;i++) {
    let der = derList[i];
    derStatusMap[DownloaderBase.nameToId(der.name)] = der.status;
  }
  sender({command: 'downloaders', data: derStatusMap});
}



// update derList tasklist
function update() {
  console.log(derList, tasks, defaultDerName);
  derList.forEach(function(el) {
    if(el.status.stats !== EDownloaderStats.ok) return;
    el.getStat().then(function(result) {
      el.status = result;
    });
  });

  for(let i=tasks.length-1;i >= 0;i--) {
    let task = tasks[i].task;
    let taskStatus = tasks[i].taskStatus;
    let der = getDownloader(task.downloader);

    if(!der || der.status.stats !== EDownloaderStats.ok) continue;

    // skip
    if(taskStatus && (taskStatus.stats === ETaskStats.complete || taskStatus.stats === ETaskStats.removed)) 
      continue;

    der.getTaskStatus(task).then(result => {
      let index = i;
      if(task.key != tasks[i].task.key)
        index = getTaskIndex(task);
      if(index === null) return;
      if(tasks[index].task.name !== tasks[index].taskStatus.name) {
        tasks[index].task.name = tasks[index].taskStatus.name;
        saveTasks();
        console.log('-------', 'savetasks');
      }
      else if(result) {
        tasks[index].taskStatus = result;
      } else {
        tasks[index].taskStatus.stats = ETaskStats.removed;
        tasks[index].taskStatus.newStatus = true;
      }
    });
  }

}

function sendToPopup(sender) {
  if(!sender) return;
  let derStatusList = [];
  for(let i=0;i<derList.length;i++) {
    derStatusList.push(derList[i].status);
  }
  sender({command: 'downloaderStatus', data: derStatusList});

  tasks.forEach(function(el, index) {
    if(!el.taskStatus || !el.taskStatus.newStatus) return;
    el.taskStatus.newStatus = false;
    if(el.taskStatus.stats === ETaskStats.removed) {
      removeTask(el.task);
      sender({command: 'removeTask', data: el.task});
    }
    else {
      sender({command: 'setTask', data: {task: el.task, taskStatus: el.taskStatus}});
    }
  });
};

setInterval(update, 1000);
