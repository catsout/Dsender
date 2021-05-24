import { MessagePort } from '../../lib/message.js';

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
        return backport.send({
            command: 'addTask',
            data: {
                url: url,
                downloader: item.defaultDownloader,
                params: {}
            }
        });
    }
    return true;
}).then(closeTab, closeTab);