import '../../lib/widget-button.js';
import '../../lib/widget-checkbox.js';
import { WidgetMessageBox } from '../../lib/widget-messagebar.js';

import { DownloaderConfig,EDownloaderType } from '../../common.js';
import { DownloaderBase } from '../../lib/downloader-base.js';
import Aria2 from '../../lib/downloader-aria2.js';
import { QBittorrent } from '../../lib/downloader-qbittorrent.js';
import { MessagePort } from '../../lib/message.js';

var backport = new MessagePort();
backport.connect('request');

var changeds = new Set();
var defaultConfig = {}

var saveBut = document.querySelector('#submit');

/**@type {WidgetMessageBox} */
var msgbox = document.querySelector('widget-messagebox');
var dextra = document.querySelector('#extra');
var selectType = document.querySelector('#selectType');
var dtls = document.querySelector('#tls');

function getInputs() {
    return document.querySelectorAll('#content input');
}

function loadConfigToDom(config) {
    if(selectType.value !== config.type) {
        selectType.value = config.type;
        selectTypeChange();
    }
    dtls.checked = config.data.tls;
    getInputs().forEach(function(el) {
        if(el.hasAttribute('readonly') && el.value) return;
        if(el.id === 'name')
            el.value = config.name;
        else
            el.value = config.data[el.id];
    });
}

Object.entries(EDownloaderType).forEach(([key, value]) => {
    const opt = document.createElement('option');
    opt.text = key;
    opt.value = value; 
    selectType.add(opt);

    if(value === EDownloaderType.aria2) 
        defaultConfig[key] = (new Aria2()).toConfig();
    else if(value === EDownloaderType.qbittorrent)
        defaultConfig[key] = (new QBittorrent()).toConfig();
});

function showExtraConfig(name) {
    const t = document.querySelector('.'+name);
    dextra.innerHTML = '';
    const dnew = t.content.cloneNode(true);
    dextra.appendChild(dnew);
    window.parent.dpageroute.fitIframeHeight();
    dextra.querySelectorAll('input').forEach((el) => {
        el.addEventListener('input', inputChanged);
    });
}

function selectTypeChange(event) {
    const sel = selectType;
    const key = sel.item(sel.selectedIndex).text;
    if(!key) return;
    showExtraConfig(key);
    loadConfigToDom(defaultConfig[key]);
    if(saveBut.disabled && argName)
        saveBut.disabled = false;
}

selectType.addEventListener('change', selectTypeChange);
selectTypeChange();

dtls.addEventListener('change', inputChanged);

const params = new URLSearchParams(window.location.search);
var argName = params.get('name');
if(argName) {
    saveBut.classList.add('disabled');
    let key = DownloaderBase.nameToId(argName);
    browser.storage.local.get(key).then(function(item) {
        loadConfigToDom(item[key]);
    });
    document.querySelector('#content #name').setAttribute('readonly', '');
}

function inputChanged(event) {
    changeds.add(event.target.id);
    if(saveBut.disabled) {
        if(argName)
            saveBut.disabled = false;
        else {
            if(event.target.id === 'name')
                saveBut.disabled = false;
        }
    }
}

getInputs().forEach(function(el) {
    el.addEventListener('input', inputChanged);
});

function checkInput(input) {
    if(!input.checkValidity()) {
        input.focus();
        msgbox.send(input.validationMessage, null, null, 3000);
        return false;
    }
    return true;
}

function checkInputs() {
    const inputs = getInputs();
    for(let i=0;i<inputs.length;i++) {
        if(!checkInput(inputs[i]))
            return false;
    } 
    return true;
}

document.querySelector('#submit').addEventListener('click', function(event) {
    if(!checkInputs()) {
        return;
    }
    browser.storage.local.get('downloaderList').then(function(item) {
        const config = new DownloaderConfig();
        config.type = selectType.value;
        getInputs().forEach(function(el) {
            if(el.id === 'name')
                config.name = el.value;
            else
                config.data[el.id] = el.value;
        });
        config.data.tls = dtls.checked;
        const key = DownloaderBase.nameToId(config.name);
        const storage = {};
        item.downloaderList = item.downloaderList || [];

        // check if exist
        let findder = item.downloaderList.findIndex(el => el === key);
        if(findder !== -1) {
            if(!argName) {
                msgbox.send('Downloader already exist', null, null, 3000);
                return;
            }
        } else {
            storage.downloaderList = item.downloaderList;
            storage.downloaderList.push(key);
        }
        storage[key] = config;
        const psave = browser.storage.local.set(storage).then(function() {
            setTimeout(function(){ backport.send({command: 'refresh'}); }, 500);
        });
        msgbox.sendWait(psave).then(function(result) {
            msgbox.send('Saved', 'success', null, 3000);
        });
    });
});