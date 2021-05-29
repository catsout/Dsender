import { DownloaderBase } from '../../lib/downloader-base.js';
import { MessagePort } from '../../lib/message.js';
import '../../lib/widget-button.js'
import '../../lib/widget-bytelabel.js'

var backport = new MessagePort();
backport.connect('request');

var dtitem = document.querySelector('#titem');
var dcontainer = document.querySelector('#container');

function updateItem(ditem, data) {
    if(data.name || typeof(data.name) === 'string') {
        ditem.querySelector(".name").textContent = data.name;
        ditem.setAttribute('id', DownloaderBase.nameToId(data.name));
    }
    if(data.type)
        ditem.querySelector('.type').textContent = data.type;
    if(data.stats)
        ditem.querySelector('.stats').textContent = data.stats;
    if(typeof(data.downloadSpeed) === 'number')
        ditem.querySelector('.down').value = data.downloadSpeed;
    if(typeof(data.uploadSpeed) === 'number') {
        ditem.querySelector('.up').value = data.uploadSpeed;
    }
}

function clickRemove(event) {
    let ditem = this.parentNode.parentNode.parentNode;
    let id = ditem.getAttribute('id');
    browser.storage.local.get('downloaderList').then(function(item) {
        let len = item.downloaderList.length || 0;
        for(let i=0;i<len;i++) {
            console.log(item.downloaderList[i], id);
            if(item.downloaderList[i] === id) {
                item.downloaderList.splice(i, 1);
                browser.storage.local.set({downloaderList: item.downloaderList});
                browser.storage.local.remove(id);
            }
        }
    });
    dcontainer.removeChild(ditem);
}

function clickItem(event) {
    let item = this.parentNode;
    let name = item.querySelector('.name').textContent;
    window.parent.dpageroute.go('/pages/downloader-config/index.html', {name: name});
}

function addItem(ditem, data) {
    updateItem(ditem, data);
    dcontainer.appendChild(ditem);
    ditem.querySelector('.itembut widget-button').addEventListener('click', clickRemove);
    ditem.querySelector('.bitem').addEventListener('click', clickItem);
}

function updateStatus(statusMap) {
    dcontainer.childNodes.forEach(function(el) {
        const name = DownloaderBase.idToName(el.getAttribute('id'));
        if(statusMap[name]) {
            updateItem(el, statusMap[name]);
        }
    });
}

browser.storage.local.get(null).then(item => {
    if(item.downloaderList) {
        item.downloaderList.forEach(el => {
            if(item[el]) {
                let ditem = dtitem.content.cloneNode(true).firstElementChild;
                addItem(ditem, item[el]);
            }
        });
    }
});

function update() {
    backport.send({command: 'downloaderStatus'}).then((result) => updateStatus(result));
}
update();
setInterval(update, 1000);
