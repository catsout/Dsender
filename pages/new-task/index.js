import { TaskParams, TbtParmas, TurlParmas } from '../../common.js';
import { DownloaderBase } from '../../lib/downloader-base.js';
import { MessagePort } from '../../lib/message.js';
import '../../lib/widget-button.js';
import '../../lib/widget-messagebar.js';
import '../../lib/widget-checkbox.js';

var backport = new MessagePort();
backport.connect('request');

var dpageroute = parent.dpageroute;

var newType = 'urls';

const params = new URLSearchParams(window.location.search);
var popup = params.get('popup') === 'true';
var cookie = params.get('cookie');

const durls = document.querySelector('#texturls');
const durl = document.querySelector('#texturl');
const dname = document.querySelector('#name');
const dreferer = document.querySelector('#referer');
const dua = document.querySelector('#useragent')
const pagetype = params.get('type') || 'urls';

function showEl(...els) {
  els.forEach((el) => {
    const del = document.querySelector(el);
    if(del) {
      del.classList.remove('hidden');
    }
  });
}

if(pagetype === 'bt') {
  showEl('#urls.part', '#torrent.part', '#btoption');
  durls.placeholder = 'Magnet url, one url per line.';
}
else if(pagetype === 'btMagnet') {
  showEl('#url.part', '#btoption');
  durl.value = params.get('magnet');
  dname.value = params.get('name');
}
else if(pagetype === 'url') {
  showEl('#url.part', '#option');
  durl.value = params.get('url');
  dname.value = params.get('name');
  dreferer.value = params.get('referer');
  dua.value = params.get('ua');
  newType = 'url';
} else if(pagetype === 'urls'){
  showEl('#urls.part', '#option');
}

if(params.has('popup')) {
  const cancel = document.querySelector('#cancel');
  cancel.addEventListener('click', (event) => {
    window.close();
  });
  cancel.classList.remove('hidden');
}

var selectDown = document.querySelector('#selectDown');
var msgbox = document.querySelector('widget-messagebox');

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

function checkInput(input) {
    if(!input.checkValidity()) {
        input.focus();
        msgbox.send(input.validationMessage, null, null, 3000);
        return false;
    }
    return true;
}
function checkInputs() {
    const inputs = document.querySelectorAll('input');
    for(let i=0;i<inputs.length;i++) {
        if(!checkInput(inputs[i]))
            return false;
    } 
    return true;
}


function addTask(params) {
  const pmAddTask = backport.send({
    command: 'addTask',
    data: {
      downloader: selectDown.value,
      params: params
    }
  });
  return msgbox.sendWait(pmAddTask, 'adding task');
}

function addCallback(result) {
  if(!result) return;
  browser.notifications.create({
    "type": "basic",
    "title": 'send',
    "iconUrl": '../../assets/icon.svg',
    "message": `send download ${result.name} to ${result.downloader}`
  });
  if(popup) window.close();
  else if(dpageroute) dpageroute.back();
}

document.querySelector('#submit').addEventListener('click', function(event) {
  if(!checkInputs()) return;
  const path = document.querySelector('#path').value; 
  const tparams = new TaskParams(dname.value, path);

  if(pagetype === 'urls' || pagetype === 'url') {
    const threads = parseInt(document.querySelector('#threads').value, 10);
    const minsplit = parseInt(document.querySelector('#minsplit').value, 10);
    tparams.urlParams = new TurlParmas(
      null,
      {
        'Referer': dreferer.value,
        'User-Agent': dua.value,
        'Cookie': cookie
      },
      Number.isNaN(threads)?null:threads,
      Number.isNaN(minsplit)?null:minsplit
    );

    if(pagetype === 'urls') {
      durls.value.split('\n').forEach((el) => {
        if(!el) return;
        tparams.urlParams.url = el;
        addTask(tparams).then(addCallback);
      });
    } else if(pagetype === 'url') {
      tparams.urlParams.url = durl.value;
      addTask(tparams).then(addCallback);
    }
  } else {
    const firstLastPiece = document.querySelector('#firstLastPiece').checked;
    const sequential = document.querySelector('#sequential').checked;
    if(pagetype === 'bt') {
      durls.value.split('\n').forEach((el) => {
        if(DownloaderBase.isMagnet(el)) {
          tparams.btParams = new TbtParmas(el, null, sequential, firstLastPiece);
          addTask(tparams).then(addCallback);
        }
      })
    } else {
      tparams.btParams = new TbtParmas(durl.value, dname.value, sequential, firstLastPiece);
      addTask(tparams).then(addCallback);
    }
  }
});

browser.storage.local.get(['downloaderList']).then(item => {
  if(item.downloaderList) {
    updateSelectDown(item.downloaderList);
  }
});
