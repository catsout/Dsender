import { TaskParams, TurlParmas } from "../common.js";
import { DownloaderBase } from "../lib/downloader-base.js";
import { Setting } from "../lib/setting.js";
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
            directDownload: false
        }
        this.settingInit();
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

    createDownCallback({url, name, cookie, referer, size, ua}) {
        if(!this.directDownload) {
            const params = new URLSearchParams({
                url, referer, cookie, 
                ua: ua? ua : window.navigator.userAgent, 
                name,size, type: 'url',
                popup: 'true'
            });
            browser.windows.create({
                url: '/pages/new-task/index.html?' + params.toString(),
                width: 710,
                height: 400,
                type: 'popup'
            });
        } else {
            this.tmgr.addTask(
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
            ).then((result) => {
                browser.notifications.create({
                    "type": "basic",
                    "title": 'Send',
                    "iconUrl": '/assets/icon.svg',
                    "message": `send download ${result.name} to ${result.downloader}`
                });
            }, (reason) => {
                browser.notifications.create({
                    "type": "basic",
                    "title": 'Error',
                    "iconUrl": '/assets/icon.svg',
                    "message": reason.toString()
                });
            });
        }
    };
}

export {Dsender};