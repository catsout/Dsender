import '../../lib/widget-button.js';
import '../../lib/widget-messagebar.js';

import { DownloaderConfig } from '../../common.js';
import { DownloaderBase } from '../../lib/downloader-base.js';

var changeds = new Set();
var saveBut = document.querySelector('#submit');
var msgbox = document.querySelector('widget-messagebox');

let params = new URLSearchParams(window.location.search);
var argName = params.get('name');
if(argName) {
    saveBut.classList.add('disabled');
    let key = DownloaderBase.nameToId(argName);
    browser.storage.local.get(key).then(function(item) {
        let config = item[key];
        document.querySelectorAll('input').forEach(function(el) {
            if(el.id === 'name')
                el.value = config.name;
            else
                el.value = config.data[el.id];
        });
    });
    document.querySelector('#name').setAttribute('readonly', '');
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

let inputs = document.querySelectorAll('input');
inputs.forEach(function(el) {
    el.addEventListener('input', inputChanged);
});

function checkInput(input) {
    if(!input.checkValidity()) {
        input.focus();
        msgbox.send(inputs.validationMessage, null, null, 3000);
        return false;
    }
    return true;
}

function checkInputs() {
    let inputs = document.querySelectorAll('input');
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
        let config = new DownloaderConfig();
        config.type = 'aria2';
        document.querySelectorAll('input').forEach(function(el) {
            if(el.id === 'name')
                config.name = el.value;
            else
                config.data[el.id] = el.value;
        });
        let key = DownloaderBase.nameToId(config.name);
        let storage = {};
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
        browser.storage.local.set(storage);
    });
});