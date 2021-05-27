import {DownloaderStatus, Task, TaskParams, ETaskStats, TaskStatus, DownloaderConfig, EDownloaderType, EDownloaderStats, basename} from '../common.js';
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

        this.status = new DownloaderStatus();
    }
    /**
     * 
     * @param {DownloaderConfig} config 
     */
    fromConfig(config) {
        const properties = ['token', 'host', 'port', 'path'];
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
                path: this.path
            }
        );
    }

    getUrl() {
        return 'http://' + this.host + ':' + this.port + this.path;
    }
    preParams(params) {
        if (this.token) {
            params.splice(0, 0, 'token:' + this.token);
        }
        return params;
    }

    _sendJsonrpc(url, method, params) {
        return sendJsonrpc(url, method, params).catch((error) => {
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
     * @returns {Promise<String>}
     */
    getVersion() {
        return this._sendJsonrpc(this.getUrl(),
            'aria2.getVersion',
            this.preParams([])
        ).then(result => {
            return result.version;
        });
    }
    /**
     *
     * @returns {Promise<DownloaderState>}
     */
    getStatus() {
        return this._sendJsonrpc(this.getUrl(),
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
     * @param {string} url
     * @param {TaskParams} taskparams
     * @returns {Promise<Task>}
     */
    addTask(url, taskparams) {
        const params = {};

        if(taskparams.name)
            params.out = taskparams.name;
        if(taskparams.dir)
            params.dir = taskparams.dir;
        if(typeof(taskparams.threads) === 'number') {
            params.split = taskparams.threads.toString();
            params['max-connection-per-server'] = taskparams.threads.toString();
        }
        if(typeof(taskparams.minsplit) === 'number') {
            params['min-split-size'] = taskparams.minsplit.toString() + 'M';
        }
        if(taskparams.header) {
            params.header = [];
            Object.entries(taskparams.header).forEach(([k, v]) => {
                if(Boolean(v))
                    params.header.push(`${k}: ${v}`);
            });
        }
        return sendJsonrpc(this.getUrl(),
            'aria2.addUri',
            this.preParams([[url], params])
        ).then((result) => {
            let task = new Task(taskparams.name, this.name, result);
            return task;
        });
    }

    /**
     * 
     * @param {Task} task 
     * @returns {Promise<TaskStatus|null>} null when no such task
     */
    getTaskStatus(task) {
        const baseStats = ['status', 'totalLength', 'completedLength', 'downloadSpeed', 'files'];
        return sendJsonrpc(this.getUrl(),
            'aria2.tellStatus',
            this.preParams([task.key, baseStats])
        ).then(result => {
            return new TaskStatus(
                basename(result.files[0].path),
                toTaskStats(result.status),
                parseInt(result.completedLength, 10),
                parseInt(result.totalLength, 10),
                parseInt(result.downloadSpeed, 10)
            );
        }).catch((error) => {
            const result = /^GID \w* is not found/.test(error.message);
            if(result)
                return null;
            else throw error;
        });
    }

    /**
     * 
     * @param {Task} task 
     * @returns {Promise<boolean>} null when no such task
     */
    deleteTask(task) {
        function remove(url, param) {
            return sendJsonrpc(url,
                'aria2.removeDownloadResult',
                param
            ).then(result => {
                return result == 'OK';
            });
        }
        const url = this.getUrl();
        const param = this.preParams([task.key]);
        return sendJsonrpc(url,
            'aria2.remove',
            param
        ).then(result => {
            return remove(url, param);
        }).catch((error) => {
            const result = /^Active Download not found for/.test(error.message);
            if(result)
                return remove(url, param);
            else throw error;
        });
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