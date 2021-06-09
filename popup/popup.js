import '../lib/widget-progress.js';
import '../lib/widget-bytelabel.js';
import '../lib/widget-taskitem.js';
import '../lib/widget-pageroute.js';
import '../lib/widget-statsbar.js';
import '../lib/widget-button.js';
import '../lib/widget-switch.js';
import '../lib/widget-messagebar.js';
import '../lib/widget-waiticon.js';

import {DownloaderStatus, ETaskStats, Task, TaskStatus} from '../common.js'
import { DownloaderBase } from '../lib/downloader-base.js';

import { MessagePort } from '../lib/message.js';
import { Setting } from '../lib/setting.js';
import { openPopupWindow } from '../background/window-open.js';

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
var dselectDown = $('#defaultDownloader select');

dsetting.addEventListener('click', (event) => {
  dpageroute.goToggle('/pages/setting/index.html');
});

drouteBackBtn.addEventListener('click', (e) => {
  dpageroute.back();
});

$('#cleanlist').addEventListener('click', (e) => {
  tasklist.querySelectorAll('widget-taskitem').forEach((el) => {
    const stats = el.status.stats;
    if(stats === ETaskStats.completed || stats === ETaskStats.removed)
      el.removeTask();
  });
});

$('#newDownloader').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/downloader-config/index.html');
});

$('#dstats').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/downloaders/index.html');
});

$('#new').addEventListener('click', (e) => {
  dpageroute.goToggle('/pages/new-task/index.html');
});

$('#enable').addEventListener('change', (e) => {
  const checkd = e.detail.checked;
  browser.storage.local.set({enableCap: checkd});
});

$('#newBt').addEventListener('click', (e) => {
  const params = new URLSearchParams({popup: true, type: 'bt'})
  backport.send({command: 'openWindow', data: {id: 'newBtTask', params: params.toString()}});
});



function updateDerStatus(status) {
  let globalStatus = new DownloaderStatus();
  const statsList = [];
  Object.entries(status).forEach(([k, v]) => {
    globalStatus = DownloaderStatus.add(globalStatus, v);
    statsList.push(v.stats);
  });
  if(statsList.length === 0) {
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
  case 'removeTask':
    removeTask(message.data);
    break;
  }
});

var setting = new Setting();
setting.addListener('enableCap', (oldv, newv) => { switchEnable.checked = newv; });

dselectDown.addEventListener('change', () => {
  Setting.setSetting({ defaultDownloader: dselectDown.value });
});

setting.addListener('defaultDownloader', (oldv, newv) => { 
  if(dselectDown.value !== newv)
    dselectDown.value = newv;
});

setting.addListener('downloaderList', (oldv, newv) => { 
  dselectDown.innerHTML = '';
  const downloaderList = newv || [];
  downloaderList.forEach((el) => {
    const opt = document.createElement('option');
    const name = DownloaderBase.idToName(el);
    opt.value = name;
    opt.text = name;
    opt.id = el;
    dselectDown.add(opt);
  });
  Setting.getSetting(['defaultDownloader']).then((item) => {
    if(item.defaultDownloader)
      dselectDown.value = item.defaultDownloader;
    const id = DownloaderBase.nameToId(item.defaultDownloader||'');
    if(downloaderList.length > 0 && !downloaderList.includes(id))
      Setting.setSetting({ defaultDownloader: DownloaderBase.idToName(downloaderList[0]) });
    if(downloaderList.length === 0)
      Setting.setSetting({ defaultDownloader: '' });
  });
});

setting.addListener('directDownload', (oldv, newv) => { 
  $('#defaultDownloader').classList.toggle('hidden', !newv);
});

window.addEventListener("unload", function() {
  setting.unload();
});

function update(allsync) {
  backport.send({command: 'sync', data: allsync}).then((result) => {
    updateDerStatus(result.downloaderStatus);
    result.taskItems.forEach(function(el) {
      setTask(el.task, el.status);
    })
  });
}
update(true);
setInterval(update, 1000);