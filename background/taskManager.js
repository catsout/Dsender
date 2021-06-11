import { DownloaderConfig, EDownloaderStats, EDownloaderType, ETaskStats, TaskItem, TaskParams } from "../common.js";
import Aria2 from "../lib/downloader-aria2.js";
import { QBittorrent } from "../lib/downloader-qbittorrent.js";

class TaskManager {
    constructor() {
        this._timerId = null;
        this._interval = -1;

        this._tasklist = []; // taskitems
        this._downloaderMap = new Map(); // name map

        this.completeNotify = true;
    }


    /**
     * 
     * @param {TaskParams} taskparams 
     * @param {String} downloader 
     * @returns 
     */
    addTask(taskparams, downloader) {
        let taskPromise = null;
        if(!this._downloaderMap.has(downloader))
            return Promise.reject(`Downloader ${downloader} not found`);

        const der = this._downloaderMap.get(downloader);
        if(taskparams.urlParams) {
            taskPromise = der.addTask(taskparams);
        } else if(taskparams.btParams) {
            taskPromise = der.addBtTask(taskparams);
        } else {
            return Promise.reject('Create task error');
        }
        if(taskPromise === null)
            return Promise.reject();
        return taskPromise.then((task) => {
            this._tasklist.push(new TaskItem(task));
            this.saveTasksToConf();
            new Promise((r) => { this.updateStatus(); r(); });
            return task;
        });
    }

    removeTask(task, derRemove, deletefile) {
        const index = this._tasklist.findIndex((el) => el.task.key === task.key);
        if(index === -1) return Promise.reject(`Task $task.name} not found`);
        this._tasklist[index].status.stats = ETaskStats.removed;
        this._tasklist.splice(index, 1);
        this.saveTasksToConf();
        if(derRemove && this._downloaderMap.has(task.downloader)) {
            return this._downloaderMap.get(task.downloader).deleteTask(task);
        }
        return Promise.resolve(true);
    }

    taskAction(cmd, task) {
        if(!this._downloaderMap.has(task.downloader))
            return Promise.reject(`${task.downloader} not available`);
        const der = this._downloaderMap.get(task.downloader);
        if(der[cmd]) {
            return der[cmd](task);
        }
        return Promise.reject(`${task.downloader} not support this action`);
    }

    _groupTasks() {
        const derTaskMap = new Map();
        // create empty for all downloader to make sure sync downloader status
        this._downloaderMap.forEach((v, k) => {
            derTaskMap.set(k, []);
        });
        this._tasklist.forEach((el) => {
            if(!derTaskMap.has(el.task.downloader)) {
                derTaskMap.set(el.task.downloader, []);
            }
            const ts = derTaskMap.get(el.task.downloader);
            ts.push(el);
        });
        return derTaskMap;
    }

    updateStatus(refresh) {
        // health check to set downloader status
        this._downloaderMap.forEach((der, k) => {
            if(der.status.stats === EDownloaderStats.ok || refresh) {
                der.healthCheck().catch((e) => {
                    console.log(`${der.name} error`);
                });
            }
        });
        this._groupTasks().forEach((v, k) => {
            // filter taskitems if not fullsync
            const taskItems = refresh? v : v.filter(function(el) {
                const stats = el.status.stats;
                return !(stats === ETaskStats.error || stats === ETaskStats.completed || stats === ETaskStats.removed);
            });

            if(this._downloaderMap.has(k)) {
                const der = this._downloaderMap.get(k);
                if(der.status.stats === EDownloaderStats.ok) {
                    // sync
                    this._downloaderMap.get(k).sync(taskItems, this.saveTasksToConf.bind(this), this.taskStatsChanged.bind(this));
                }
                else {
                    // mark offline for downloader not ok
                    taskItems.forEach(function(el) {
                        el.status.stats = ETaskStats.offline;
                        el.status.newStatus = true;
                    });
                }
            } else {
                // mark removed for no downloader
                taskItems.forEach(function(el) {
                    el.status.stats = ETaskStats.removed;
                    el.status.newStatus = true;
                });
            }

            if(refresh) {
                taskItems.forEach(function(el) {
                    el.status.newStatus = true;
                })
            }
        });
    }

    /**
     * 
     * @param {DownloaderConfig} config
     */
    setDownloader(config) {
        let down = null;
        if(this._downloaderMap.has(config.name)) {
            const down = this._downloaderMap.get(config.name);
            down.fromConfig(config);
        } else {
            switch(config.type) {
                case EDownloaderType.aria2:
                down = new Aria2(config.name);
                break;
                case EDownloaderType.qbittorrent:
                down = new QBittorrent(config.name);
                break;
            }
            if(down) {
                down.fromConfig(config);
                this._downloaderMap.set(config.name, down);
            }
        }
    }

    removeDownloader(name) {
        if(this._downloaderMap.has(name))
            this._downloaderMap.delete(name);
    }

    getDownloaderStatus() {
        const status = {};
        this._downloaderMap.forEach((el) => {
            status[el.name] = el.status;
        });
        return status;
    }

    getTaskStatus() {
        return this._tasklist;
    }

    getDownloaderOption(name) {
        if(this._downloaderMap.has(name)) {
            return this._downloaderMap.get(name).getGlobalOption();
        } else {
            return Promise.reject(`Downloader ${downloader} not found`);
        }
    }

    setDownloaderOption(name, options) {
        if(this._downloaderMap.has(name)) {
            return this._downloaderMap.get(name).setGlobalOption(options);
        } else {
            return Promise.reject(`Downloader ${downloader} not found`);
        }
    }

    saveTasksToConf() {
        const tasks = this._tasklist.map((el) => el.task); 
        browser.storage.local.set({tasks});
    }

    saveDownloaderToConf(name) {

    }

    loadFromConf() {
        browser.storage.local.get(null).then((item) => {
            if(item.tasks) {
                this._tasklist = item.tasks.map((el) => new TaskItem(el));
            }
            if(item.downloaderList) {
                item.downloaderList.forEach((el) => {
                if(item[el])
                    this.setDownloader(item[el]);
                else
                    browser.storage.local.remove(el);
                });
            }
        });
    }

    taskStatsChanged(taskItem, oldValue, newValue) {
        if(this.completeNotify) {
            if(oldValue === ETaskStats.downloading && (newValue === ETaskStats.completed || newValue === ETaskStats.seeding)) {
                browser.notifications.create({
                "type": "basic",
                "title": 'Completed',
                "iconUrl": '/assets/icon.svg',
                "message": `${taskItem.task.name} completed`
                });
            }
        }
    }

    get updateInterval() { return this._interval; }
    set updateInterval(value) {
        const stopTimer = () => {
            if(this._timerId)
                clearInterval(this._timerId);
            this._timerId = null;
        };
        if(!(typeof(value) === 'number')) return;
        stopTimer();
        if(value !== -1) {
            this._timerId = setInterval(this.updateStatus.bind(this), value);
        }
        this._interval = value;
    }
};

export {TaskManager};