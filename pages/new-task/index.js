import { DownloaderBase } from '../../lib/downloader-base.js';
import { MessagePort } from '../../lib/message.js';
import '../../lib/widget-button.js';
import '../../lib/widget-messagebar.js';

var backport = new MessagePort();
backport.connect('request');

var dpageroute = parent.dpageroute;

var newType = 'urls';

const params = new URLSearchParams(window.location.search);
var popup = params.get('popup') === 'true';
var cookie = params.get('cookie');

const durl = document.querySelector('#texturl');
const dname = document.querySelector('#name');
const dreferer = document.querySelector('#referer');
const dua = document.querySelector('#useragent')

if(params.has('url')) {
  document.querySelectorAll('.part').forEach((el) => el.classList.add('hidden'));
  document.querySelector('#url.part').classList.remove('hidden');
  durl.value = params.get('url');
  dname.value = params.get('name');
  dreferer.value = params.get('referer');
  dua.value = params.get('ua');
  newType = 'url';
} else {
  document.querySelector('#urls.part').classList.remove('hidden');
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


function addTask(url, params) {
  const pmAddTask = backport.send({
    command: 'addTask',
    data: {
      url: url, 
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
  const threads = parseInt(document.querySelector('#threads').value, 10);
  const minsplit = parseInt(document.querySelector('#minsplit').value, 10);
  const tparams = {
    name: dname.value,
    dir: path,
    header: {
      'Referer': dreferer.value,
      'User-Agent': dua.value,
      'Cookie': cookie
    },
    threads: Number.isNaN(threads)?null:threads,
    minsplit: Number.isNaN(minsplit)?null:minsplit
  };

  if(newType === 'urls') {
    document.querySelector('#texturls').value.split('\n').forEach((el) => {
      if(!el) return;
        addTask(el, tparams).then(addCallback);
    });
  } else if(newType === 'url') {
    addTask(durl.value, tparams).then(addCallback);
  }
});

browser.storage.local.get(['downloaderList']).then(item => {
  if(item.downloaderList) {
    updateSelectDown(item.downloaderList);
  }
});
