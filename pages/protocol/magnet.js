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

browser.storage.local.get(['defaultDownloader']).then(item => {
    if(item.defaultDownloader) {
        const magnet = DownloaderBase.getMagnetInfo(url);
        return backport.send({
            command: 'addTask',
            data: {
                url: url,
                downloader: item.defaultDownloader,
                params: {
                    name: magnet.name || magnet.hash
                }
            }
        }).then((result) => {
            browser.notifications.create({
                "type": "basic",
                "title": 'send',
                "message": `send download ${result.name} to ${result.downloader}`
            });
        });
    }
    return true;
}).then(closeTab, closeTab);