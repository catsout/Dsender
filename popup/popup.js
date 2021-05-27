import '../lib/widget-progress.js';
import '../lib/widget-bytelabel.js';
import '../lib/widget-taskitem.js';
import '../lib/widget-pageroute.js';
import '../lib/widget-statsbar.js';
import '../lib/widget-button.js';
import '../lib/widget-switch.js';
import '../lib/widget-messagebar.js';
import '../lib/widget-waiticon.js';

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
});

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
    tdom.backport = backport;
    tdom.msgbox = msgbox;
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

browser.storage.local.get(['downloaderList', 'defaultDownloader', 'enableCap']).then(item => {
  if(item.downloaderList) {}
  if(item.defaultDownloader) {}
  if(item.enableCap) {
    switchEnable.checked = item.enableCap;
  }
});


function storageChanged(changes, area) {
  if(changes.popupIgnore) return;
  if(changes.downloaderList) {}
  if(changes.defaultDownloader) {}
}


browser.storage.onChanged.addListener(storageChanged);

window.addEventListener("unload", function() {
  browser.storage.onChanged.removeListener(storageChanged);
});