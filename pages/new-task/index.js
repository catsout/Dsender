import '../../lib/widget-button.js';
import '../../lib/widget-messagebar.js';
import '../../lib/widget-checkbox.js';
import '../../lib/widget-bytelabel.js';

import '../../lib/window-save.js';

import { TaskParams, TbtParmas, TurlParmas } from '../../common.js';
import { DownloaderBase } from '../../lib/downloader-base.js';
import { MessagePort } from '../../lib/message.js';

import { genTorrentHash } from '../../lib/torrent.js';
import { bencode } from '../../lib/bencode.js';
import { Notify } from '../../lib/notify.js';

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

const dsize = document.querySelector('#sizelabel');

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
  dsize.value = params.get('size');
  dsize.classList.remove('hidden');
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
    const opt = document.createElement('option');
    const name = DownloaderBase.idToName(el);
    opt.value = name;
    opt.text = name;
    opt.id = el;
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
  return backport.send({
    command: 'addTask',
    data: {
      downloader: selectDown.value,
      params: params
    }
  }, 30*1000).then((result) => {
    Notify.sendTask(Promise.resolve(result));
    browser.storage.local.get(['directDownload']).then(item => {
      if(!item.directDownload)
        browser.storage.local.set({ defaultDownloader: selectDown.value });
    });
  });
}

function addCallback(result) {
  if(!result) return;
  if(popup) window.close();
  else if(dpageroute) dpageroute.back();
}

document.querySelector('#submit').addEventListener('click', function(event) {
  if(!checkInputs()) return;
  const path = document.querySelector('#path').value; 
  const tparams = new TaskParams(dname.value, path);

  const promises = [];
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
        promises.push(addTask(tparams));
      });
    } else if(pagetype === 'url') {
      tparams.urlParams.url = durl.value;
      promises.push(addTask(tparams));
    }
  } else {
    const firstLastPiece = document.querySelector('#firstLastPiece').checked;
    const sequential = document.querySelector('#sequential').checked;
    if(pagetype === 'bt') {
      durls.value.split('\n').forEach((el) => {
        if(DownloaderBase.isMagnet(el)) {
          const m = DownloaderBase.getMagnetInfo(el);
          tparams.btParams = new TbtParmas(el, null, sequential, firstLastPiece);
          tparams.name = m.name;
          tparams.btParams.hash = m.hash;
          promises.push(addTask(tparams));
        }
      });
      const file = document.querySelector('input[type=file]').files[0];
      if(file) {
        const t = URL.createObjectURL(file);
        promises.push(fetch(t).then((r) => r.arrayBuffer()).then((r) => {
            const array = new Uint8Array(r);
            const torrent = bencode.decode(array);
            const hash = genTorrentHash(array);
            return {name: torrent.info.name, hash: hash};
        }).then(({name, hash}) => {
          tparams.btParams = new TbtParmas(null, t, sequential, firstLastPiece);
          tparams.btParams.hash = hash;
          tparams.name = name;
          return addTask(tparams);
        }));
      }
    } else {
      tparams.btParams = new TbtParmas(durl.value, null, sequential, firstLastPiece);
      tparams.btParams.hash = params.get('hash');
      promises.push(addTask(tparams));
    }
  }
  if(promises.length > 0) {
    msgbox.sendWait(Promise.all(promises), 'adding task').then(addCallback);
  }
});

browser.storage.local.get(['downloaderList', 'defaultDownloader']).then(item => {
  if(item.downloaderList) {
    updateSelectDown(item.downloaderList);
    selectDown.value = item.defaultDownloader;
  }
});