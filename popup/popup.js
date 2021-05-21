import '../lib/widget-progress.js';
import '../lib/widget-bytelabel.js';
import '../lib/widget-taskitem.js';
import '../lib/widget-pageroute.js';
import '../lib/widget-statsbar.js';
import '../lib/widget-button.js';
import '../lib/widget-switch.js';
import '../lib/widget-messagebar.js';

import {DownloaderStatus, Task, TaskStatus} from '../common.js'
import { DownloaderBase } from '../lib/downloader-base.js';

import { MessagePort } from '../lib/message.js';


var backport = new MessagePort();
backport.connect('request');

// dom functions
const $ = document.querySelector.bind(document);
var tasklist = $('#task-list');
var dsetting = $('#setting');
window.dpageroute = $('widget-pageroute');
var drouteBackBtn = $('[slot="routeHeader"] widget-button');
var selectDown = $('#selectdown');
var switchEnable = $('#enable');
var msgbox = $('widget-messagebox');

dsetting.addEventListener('click', (event) => {
  const path = '/pages/setting/index.html';
  dpageroute.goToggle(path);
});

drouteBackBtn.addEventListener('click', (e) => {
  dpageroute.back();
})

$('#newDownloader').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/downloader-config/index.html');
})

$('#dstats').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/downloaders/index.html');
})

$('#new').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/new-task/index.html');
})

$('#enable').addEventListener('change', (e) => {
  let checkd = e.detail.checked;
  browser.storage.local.set({enableCap: checkd});
//  backport.send({command: 'enableCap', data: checkd});
});


var downloaders = {};

function getDownloader(name) {
  return downloaders[name];
}

function updateDerStatus(statusList) {
  let globalStatus = new DownloaderStatus();
  let statsList = [];
  for(let i=0;i<statusList.length;i++) {
    globalStatus = DownloaderStatus.add(globalStatus, statusList[i]);
    statsList.push(statusList[i].stats);
  }
  if(statusList.length === 0) {
    globalStatus.downloadSpeed = null;
    globalStatus.uploadSpeed = null;
  }
  $('#footer #down').value = globalStatus.downloadSpeed;
  $('#footer #up').value = globalStatus.uploadSpeed;
  $('#dstats widget-statsbar').attachStatsList(statsList);
}

function removeTask(task) {
  let tdom = getTaskDom(task);
  if(tdom) {
    tasklist.removeChild(tdom);
  }
}

function setTask(task, taskStatus) {
  let tdom = getTaskDom(task);
  if(!tdom) {
    tdom = document.createElement('widget-taskitem');
    tdom.setAttribute('id', 'd' + Task.getId(task));
    tdom.task = task;
    tdom.taskapi = taskapi;
    tasklist.appendChild(tdom);
  }
  if(taskStatus)
    tdom.status = taskStatus;
  return tdom;
}

/**
 * 
 * @param {Task} task
 */
function getTaskDom(task) {
  return $('#d' + Task.getId(task));
}
// dom end

var backPort = browser.runtime.connect({ name: 'popup' });

backPort.onMessage.addListener(function(message) {
  if(!message.command) return;
  switch(message.command) {
  case 'downloads':
    break;
  case 'downloaderStatus':
    updateDerStatus(message.data);
    break;
  case 'setTask':
    setTask(message.data.task, message.data.taskStatus);
    break;
  case 'removeTask':
    removeTask(message.data);
    break;
  case 'refresh':
    updateDerStatus(message.data.global);
    message.data.tasks.forEach(el => {
      setTask(el.task, el.taskStatus);
    });
    break;
  }
});

var taskapi = {
  removeTask: function(task) {
    removeTask(task);
    backPort.postMessage({command: 'removeTask', data: task});
    //downloaders.home.removeTask(task);
  }
}

selectDown.addEventListener('input', function(event) {
  browser.storage.local.set({defaultDownloader: event.target.value});
}) 

function updateSelectDown(downloaderList) {
  selectDown.innerHTML = '';
  downloaderList.forEach((el) => {
    let opt = document.createElement('option');
    let name = DownloaderBase.idToName(el);
    opt.value = name;
    opt.text = name;
    opt.id = name;
    selectDown.add(opt);
  });
}

browser.storage.local.get(['downloaderList', 'defaultDownloader', 'enableCap']).then(item => {
  if(item.downloaderList) {
    updateSelectDown(item.downloaderList);
  }
  if(item.defaultDownloader) {
    selectDown.value = item.defaultDownloader;
  } else
    selectDown.value = null;
  if(item.enableCap) {
    switchEnable.checked = item.enableCap;
  }
});

browser.storage.onChanged.addListener(function(changes, area) {
  if(changes.popupIgnore) return;
  if(changes.downloaderList) {
    updateSelectDown(changes.downloaderList.newValue);
  }
  if(changes.defaultDownloader) {
    selectDown.value = changes.defaultDownloader.newValue;
  }
});