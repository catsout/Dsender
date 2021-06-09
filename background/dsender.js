import { TaskParams, TbtParmas, TurlParmas } from "../common.js";
import { DownloaderBase } from "../lib/downloader-base.js";
import { Notify } from "../lib/notify.js";
import { Setting } from "../lib/setting.js";
import { openPopupWindow } from "./window-open.js";
import { DownloaderTaker } from "./downloadTaker.js";
import { TaskManager } from "./taskManager.js";

class Dsender {
    constructor() {
        this.tmgr = new TaskManager();
        this.tmgr.loadFromConf();
        this.setting = new Setting();
        this.defaultDownloader = '';
        this.directDownload = false;
        this.dTaker = new DownloaderTaker(this.createDownCallback.bind(this));

        this.defaultSetting = {
            enableCap: false,
            completeNotify: true,
            defaultDownloader: '',
            directDownload: false,
            filterSize: 0
        }
        this.settingInit();
        this.contextMenuInit();
    }

    settingInit() {
        const deConfigKeys = Object.keys(this.defaultSetting);
        Setting.getSetting(deConfigKeys).then((item) => {
            const newDefault = {};
            deConfigKeys.forEach((el) => {
                if(typeof(item[el]) === 'undefined') {
                    newDefault[el] = this.defaultSetting[el];
                }
            });
            return Setting.setSetting(newDefault);
        }).then(() =>  {
            this.setting.addListener('enableCap', (oldv, newv) => {
                if(newv) 
                    this.dTaker.startMonitor({webrequest: true});
                else 
                    this.dTaker.stopMonitor();
            });
            this.setting.addListener('defaultDownloader', (oldv, newv) => { this.defaultDownloader = newv; });
            this.setting.addListener('directDownload', (oldv, newv) => { this.directDownload = newv; });
            this.setting.addListener('completeNotify', (oldv, newv) => { this.tmgr.completeNotify = newv; });
            this.setting.addListener('filterSize', (oldv, newv) => { this.dTaker.filterSize = newv; });
            this.setting.addListener('filterExExtension', (oldv, newv) => { 
                this.dTaker.filterExExtension = newv.split(',');
            });
            this.setting.addRegexpListener(/downloader_/, (key, oldv, newv) => {
                if(!newv) {
                    const name = DownloaderBase.idToName(key);
                    this.tmgr.removeDownloader(name);
                } else {
                    this.tmgr.setDownloader(newv);
                }
            });
        });
    }
    contextMenuInit() {
        browser.contextMenus.create({
            id: "send",
            title: "Send with Dsender",
            contexts: ['link'],
            documentUrlPatterns: ['*://*/*']
        });

        browser.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId == "send") {
                if(DownloaderBase.isMagnet(info.linkUrl)) {
                    this.createMagnetTask({ url: info.linkUrl });
                } else {
                    this.createDownCallback({ 
                        url: info.linkUrl, 
                        name: DownloaderBase.getUrlFilename(info.linkUrl) || '', 
                        referer: info.pageUrl, 
                        size: null
                    });
                }
            }
        });
    }

    createDownCallback({url, name, cookie, referer, size, ua}) {
        if(!this.directDownload) {
            const params = new URLSearchParams({
                url, referer, cookie, 
                ua: ua? ua : window.navigator.userAgent, 
                name, size, 
                type: 'url',
                popup: 'true'
            });
            openPopupWindow('newTaskUrl', params.toString());
        } else {
            const p = this.tmgr.addTask(
                new TaskParams(
                    name, null,
                    new TurlParmas(
                        url, {
                            'Referer': referer,
                            'User-Agent': ua,
                            'Cookie': cookie
                        },
                    )
                ),
                this.defaultDownloader
            );
            Notify.sendTask(p, true);
        }
    };

    createMagnetTask({url}) {
        const mData = DownloaderBase.getMagnetInfo(url);
        if(!this.directDownload) {
            const params = new URLSearchParams({popup: true, type: 'btMagnet', magnet: url, name: mData.name, hash: mData.hash});
            openPopupWindow('newBtTaskUrl', params.toString());
        } else {
            const p = this.tmgr.addTask(
                new TaskParams(
                    mData.name, null, null,
                    new TbtParmas(
                        url, null, null, null,
                        mData.hash
                    )
                ),
                this.defaultDownloader
            )
            Notify.sendTask(p, true);
        }
    }
}

export {Dsender};