import { basename } from "../common.js";
import { parseContentDisposition } from '../lib/content-disposition.js';

const exclude_content_type = new Set([
    'x-xpinstall', 'javascript', 'x-javascript', 'ecmascript', 'x-ecmascript',
    'json', 'xml'
]);
// content_type removed params
function checkContentTypeInclude(content_type) {
    const [type, subtype_part] = content_type.toLowerCase().split('/');
    if(!subtype_part) return false;
    const subtype = subtype_part.split('+')[0];
    if(type !== 'application') return false;
    return !exclude_content_type.has(subtype);
}

class DownloaderTaker {
    constructor(createDownloadCallback) {
        this.createDownloadCallback = createDownloadCallback;
        this.requestHeaders = new Map();

        this.onSendHeaders_bind = this.onSendHeaders.bind(this);
        this.onHeadersReceived_bind = this.onHeadersReceived.bind(this);
        this.onDownloadsCreated_bind = this.onDownloadsCreated.bind(this);
    }
    onSendHeaders(details) {
        if(!details.requestHeaders) return;
        this.requestHeaders.set(details.requestId, details.requestHeaders);
        setTimeout(this.requestHeaders.delete.bind(this.requestHeaders, details.requestId), 90000);
    };
    onHeadersReceived({statusCode, method, responseHeaders, requestId, url, type, originUrl, tabId}) {
        if(statusCode != 200 || method.toLowerCase() !== 'get') return {};
        if(!responseHeaders) return {};
        let content_disposition = null;
        let content_type = null;
        let content_length = null;
        let acceptRanges = false;
        let name = null;
        let cookie = '';
        let referer = '';
        let ua = '';

        responseHeaders.forEach((h) => {
            const name = h.name.toLowerCase();
            if(name === 'content-disposition') {
                content_disposition = h.value;
            } else if(name === 'content-type') {
                content_type = h.value.split(';')[0].trim();
            } else if(name === 'content-length') {
                const length = parseInt(h.value, 10);
                if(Number.isSafeInteger(length))
                    content_length = length;
            } else if(name === 'accept-ranges') {
                acceptRanges = /bytes/i.test(h.value);
            }
        });
        if(content_disposition) {
            const {type, filename} = parseContentDisposition(content_disposition);
            if(type === 'inline') return {};
            if(filename !== null)
                name = filename;
        } else {
            // no attach
            // returen if inline
            if(content_disposition !== null) return {};
            // check content_type
            if( content_type === null || content_length === null || !acceptRanges) return {};
            if(!checkContentTypeInclude(content_type)) return {};
        }
        if(name === null) {
            try {
                name = decodeURIComponent(basename(url).split('?')[0]);
            }catch{
                name = '';
            }
        }

        if(this.requestHeaders.has(requestId)) {
            const rheader = this.requestHeaders.get(requestId);
            rheader.forEach((h) => {
                const name = h.name.toLowerCase();
                if(name === 'referrer' || name === 'referer') {
                    referer = h.value;
                }
                else if(name === 'cookie') {
                    cookie = h.value;
                }
                else if(name === 'user-agent') {
                    ua = h.value;
                }
            });
            this.requestHeaders.delete(requestId);
        }
        this.createDownloadCallback({url, name, referer, cookie, ua, size: content_length});
        
        // for chrome
        if(chrome.downloads.onDeterminingFilename) {
            const remove = function(item) {
                chrome.downloads.onDeterminingFilename.removeListener(remove);
                chrome.downloads.cancel(item.id, () => {
                    chrome.downloads.erase({id: item.id});
                });
            }
            chrome.downloads.onDeterminingFilename.addListener(remove);
            setTimeout(() => { chrome.downloads.onDeterminingFilename.removeListener(remove); }, 3000);
            return {};
        }

        // remove blank page
        if(type === 'main_frame' && tabId !== -1) {
            browser.tabs.get(tabId).then((tabInfo) => {
                if(tabInfo.url === 'about:blank') {
                    browser.tabs.remove(tabId);
                }
            });
        }
        return { cancel: true };
    };
    onDownloadsCreated({id, filename, fileSize, referer, url}) {
        createDownloadCallback({url, name: basename(filename), referer, size: fileSize});
        browser.downloads.cancel(id).catch(() => {});
        browser.downloads.removeFile(id).catch(() => {});
        browser.downloads.erase({id}).catch(() => {});
    };
    startMonitor({webrequest}) {
        if(browser.webRequest.onHeadersReceived.hasListener(this.onHeadersReceived_bind)) 
            throw new Error("can't startMonitor twice");
        if(browser.downloads.onCreated.hasListener(this.onDownloadsCreated_bind)) 
            throw new Error("can't startMonitor twice");

        if(webrequest) {
            browser.webRequest.onHeadersReceived.addListener(this.onHeadersReceived_bind, {
                urls: ['http://*/*', 'https://*/*'],
                types: ['main_frame', 'sub_frame'],
            }, ['blocking', 'responseHeaders', 
                browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS].filter(Boolean)); 

            browser.webRequest.onSendHeaders.addListener(this.onSendHeaders_bind, {
                urls: ['http://*/*', 'https://*/*'],
                types: ['main_frame', 'sub_frame'],
            }, ['requestHeaders', 
                browser.webRequest.OnSendHeadersOptions.EXTRA_HEADERS].filter(Boolean));

        } else {
            browser.downloads.onCreated.addListener(this.onDownloadsCreated_bind);
        }
    }
    stopMonitor() {
        browser.webRequest.onHeadersReceived.removeListener(this.onHeadersReceived_bind);
        browser.webRequest.onSendHeaders.removeListener(this.onSendHeaders_bind);
        browser.downloads.onCreated.removeListener(this.onDownloadsCreated_bind);
    }
}

export {DownloaderTaker};