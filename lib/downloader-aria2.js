import {DownloaderStatus, Task, TaskParams, ETaskStats, TaskStatus, DownloaderConfig, EDownloaderType, EDownloaderStats, basename, TaskItem, taskUnAvailable, TbtParmas, TbtStatus} from '../common.js';
import {DownloaderBase} from './downloader-base.js';

/**
 * 
 * @param {string} url 
 * @param {string} method 
 * @param {Array} params 
 * @returns {Promise}
 */
function sendJsonrpc(url, method, params) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'jsonrpc': 2,
            'id': 1,
            'method': method,
            'params': params
        })
    }).then(response => response.json())
      .then(response => {
        if(response.error) {
            const e = new Error(response.error.message)
            e.name = 'jsonrpc';
            throw e;
        } 
        return response.result;
    });
}

function sendJsonrpcBatch() {

}

/**
 * 
 * @param {string} stats 
 * @returns {number}
 */
function toTaskStats(stats) {
    switch(stats) {
        case 'active':
            return ETaskStats.downloading;
        case 'paused':
            return ETaskStats.paused;
        case 'removed':
        case 'complete':
            return ETaskStats.complete;
        case 'waiting':
            return ETaskStats.waiting;
    }
    return ETaskStats.error;
}

class Aria2 extends DownloaderBase {
    constructor(name) {
        super(name);
        this.token = null;
        this.host = 'localhost';
        this.port = 6800;
        this.path = '/jsonrpc';
        this.tls = false;

        this.status = new DownloaderStatus();
        this.statsDate = new Date();
    }
    /**
     * 
     * @param {DownloaderConfig} config 
     */
    fromConfig(config) {
        const properties = ['token', 'host', 'port', 'path', 'tls'];
        properties.forEach(el => {
            this[el] = config.data[el];
        });
        this.status = new DownloaderStatus();
        return this;
    }

    /**
     * 
     * @returns {DonwloaderConfig}
     */
    toConfig() {
        return new DownloaderConfig(
            this.name,
            EDownloaderType.aria2,
            {
                token: this.token,
                host: this.host,
                port: this.port,
                path: this.path,
                tls: this.tls
            }
        );
    }

    getUrl() {
        const protocol = this.tls?'https':'http';
        return `${protocol}://${this.host}:${this.port}${this.path}`;
    }
    preParams(params) {
        const nparams = params.concat();
        if (this.token) {
            nparams.splice(0, 0, 'token:' + this.token);
        }
        return nparams;
    }

    /**
     * 
     * @returns {Promise<String>}
     */
    getVersion() {
        return sendJsonrpc(this.getUrl(),
            'aria2.getVersion',
            this.preParams([])
        ).then(result => {
            return result.version;
        });
    }

    healthCheck() {
        const newDate = new Date();
        return this.getVersion().then(() => {
            if(newDate < this.statsDate) return;
            this.status.stats = EDownloaderStats.ok;
            this.statsDate = newDate;
        }).catch((error) => {
            if(newDate < this.statsDate) return;
            this.statsDate = newDate;
            this.status = new DownloaderStatus();
            if(error.message === 'Unauthorized') {
                this.status.stats =  EDownloaderStats.unauthorized;
            } else {
                this.status.stats = EDownloaderStats.error;
            }
            throw error;
        });
    }
    /**
     *
     * @returns {Promise<DownloaderState>}
     */
    getStatus() {
        return sendJsonrpc(this.getUrl(),
            'aria2.getGlobalStat',
            this.preParams([])
        ).then(result => {
            return new DownloaderStatus(
                parseInt(result.downloadSpeed),
                parseInt(result.uploadSpeed)
            );
        });
    }
    /**
     *
     * @param {TaskParams} taskparams
     * @returns {Promise<Task>}
     */
    addTask(taskparams) {
        const urlParams = taskparams.urlParams;
        const params = {};

        if(taskparams.name)
            params.out = taskparams.name;
        if(taskparams.dir)
            params.dir = taskparams.dir;
        // url
        if(typeof(urlParams.threads) === 'number') {
            params.split = urlParams.threads.toString();
            params['max-connection-per-server'] = urlParams.threads.toString();
        }
        if(typeof(urlParams.minsplit) === 'number') {
            params['min-split-size'] = urlParams.minsplit.toString() + 'M';
        }
        if(urlParams.header) {
            params.header = [];
            Object.entries(urlParams.header).forEach(([k, v]) => {
                if(Boolean(v))
                    params.header.push(`${k}: ${v}`);
            });
        }

        return sendJsonrpc(this.getUrl(),
            'aria2.addUri',
            this.preParams([[urlParams.url], params])
        ).then((result) => {
            return new Task(taskparams.name, this.name, result);
        });
    }

    /**
     * 
     * @param {TaskParams} taskparams 
     */
    addBtTask(taskparams) {
        const btParams = taskparams.btParams;
        const params = {};

        if(taskparams.name)
            params.out = taskparams.name;
        if(taskparams.dir)
            params.dir = taskparams.dir;

        if(btParams.firstLastPiece)
            params['bt-prioritize-piece'] = 'head=30M,tail=30M';
        if(btParams.magnetUrl) {
            return sendJsonrpc(this.getUrl(),
                'aria2.addUri',
                this.preParams([[btParams.magnetUrl], params])
            ).then((result) => {
                return new Task(taskparams.name, this.name, result, true);
            });
        } else if(btParams.torrentData) {
            return btParams.torrentData.arrayBuffer().then((buffer) => {
                const tba64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
                return sendJsonrpc(this.getUrl(),
                    'aria2.addTorrent',
                    this.preParams([tba64, [[], params]])
                ).then((result) => {
                    return new Task(taskparams.name, this.name, result, true);
                });
            });
        }
    }

    // add changed callback
    /**
     * 
     * @param {[TaskItem]} tasklist 
     */
    sync(tasklist, taskChangeCallback, statsChangeCallback) {
        function doCallback(cb, ...args) { if(cb) cb(...args); }

        this.getStatus().then((result) => this.status = result);
        tasklist.forEach((el) => {
            this.getTaskStatus(el.task).then((result) => {
                if(result) {
                    if(el.status.stats !== result.stats) {
                        doCallback(statsChangeCallback, el, el.status.stats, result.stats);
                    }
                    el.status = result;
                    if(el.task.name === result.name) {
                        el.task.name = result.name;
                        doCallback(taskChangeCallback, el);
                    }
                }
                else {
                    el.status.newStatus = true;
                    el.status.stats = ETaskStats.removed;
                }
            }).catch((e) => {
                if(e.followedBy) {
                    el.task.key = e.followedBy[0];
                    el.status = new TaskStatus();
                    doCallback(taskChangeCallback, el);
                }
                else throw e;
            });
        });
    }

    /**
     * 
     * @param {Task} task 
     * @returns {Promise<TaskStatus|null>} null when no such task
     */
    getTaskStatus(task) {
        const stats = ['status', 'totalLength', 'completedLength', 'downloadSpeed', 'files'];
        if(task.bt) {
            stats.pop(); // remove files
            stats.push('followedBy', 'bittorrent');
        }
        return sendJsonrpc(this.getUrl(),
            'aria2.tellStatus',
            this.preParams([task.key, stats])
        ).then(result => {
            if(result.followedBy) {
                throw {followedBy: result.followedBy};
            }
            let name = null;
            if(!task.bt) 
                name = basename(result.files[0].path);
            else if(result.bittorrent.info)
                name = result.bittorrent.info.name;
            else
                name = '[METADATA]';
            
            const stats = toTaskStats(result.status);
            const clen = parseInt(result.completedLength, 10);
            const dlen = parseInt(result.totalLength, 10);
            const seeding = stats === ETaskStats.downloading && task.bt && clen === dlen && clen > 0;

            return new TaskStatus(
                name,
                seeding ? ETaskStats.seeding : stats,
                clen,
                dlen,
                parseInt(result.downloadSpeed, 10),
                !task.bt? null : new TbtStatus(parseInt(result.uploadSpeed, 10))
            );
        }).catch((error) => {
            const result = /^GID \w* is not found/.test(error.message) || /^No such download for/.test(error.message);
            if(result) {
                return null;
            }
            else throw error;
        });
    }

    /**
     * 
     * @param {Task} task 
     * @returns {Promise<boolean>}
     */
    deleteTask(task) {
        function removeResult(url, param) {
            return sendJsonrpc(url,
                'aria2.removeDownloadResult',
                param
            ).then(result => {
                return result === 'OK';
            }).catch((error) => {
                if(/^GID \w* is not found/.test(error.message)) {
                    return true;
                }
                throw error;
            });
        }
        const url = this.getUrl();
        const param = this.preParams([task.key]);
        // forceRemove change donwloading to removed, remove result on other stats.
        // removeDownloadResult remove result on stopped.
        return sendJsonrpc(url,
            'aria2.forceRemove',
            param
        ).then((result) => {
                return removeResult(url, param);
            }, (error) => {
                const result = /^Active Download not found for/.test(error.message);
                if(result)
                    return removeResult(url, param);
                else throw error;
            }
        );
    }

    pauseTask(task) {
        const key = task.key;
        return sendJsonrpc(this.getUrl(),
            'aria2.pause',
            this.preParams([key])
        ).then((result) => {
            return result === key;
        });
    }

    resumeTask(task) {
        const key = task.key;
        return sendJsonrpc(this.getUrl(),
            'aria2.unpause',
            this.preParams([key])
        ).then((result) => {
            return result === key;
        });
    }

}

export default Aria2;