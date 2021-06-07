import { MessagePort } from '../../lib/message.js';
import { DownloaderBase } from '../../lib/downloader-base.js'

const params = new URLSearchParams(window.location.search);
var url = params.get('url');
var backport = new MessagePort();
backport.connect('request');

function closeTab() {
    browser.tabs.getCurrent(function(tab) {
        browser.tabs.remove(tab.id, function() { });
    });
}

const mData = DownloaderBase.getMagnetInfo(url);
const nparams = new URLSearchParams({popup: true, type: 'btMagnet', magnet: url, name: mData.name, hash: mData.hash});
browser.windows.create({
    url: '/pages/new-task/index.html?' + nparams.toString(),
    width: 500,
    height: 280,
    type: 'popup'
}).then(() => { closeTab(); });