import {DownloaderStatus, Task, TaskParams, ETaskStats, p2pTaskStatus, DownloaderConfig, EDownloaderType, EDownloaderStats, basename, getRandomInt} from '../common.js';
import {DownloaderBase} from './downloader-base.js';

const properties = ['username', 'password', 'host', 'port', 'path'];

/*
error 	Some error occurred, applies to paused torrents
missingFiles 	Torrent data files is missing
uploading 	Torrent is being seeded and data is being transferred
pausedUP 	Torrent is paused and has finished downloading
queuedUP 	Queuing is enabled and torrent is queued for upload
stalledUP 	Torrent is being seeded, but no connection were made
checkingUP 	Torrent has finished downloading and is being checked
forcedUP 	Torrent is forced to uploading and ignore queue limit
allocating 	Torrent is allocating disk space for download
downloading 	Torrent is being downloaded and data is being transferred
metaDL 	Torrent has just started downloading and is fetching metadata
pausedDL 	Torrent is paused and has NOT finished downloading
queuedDL 	Queuing is enabled and torrent is queued for download
stalledDL 	Torrent is being downloaded, but no connection were made
checkingDL 	Same as checkingUP, but torrent has NOT finished downloading
forcedDL 	Torrent is forced to downloading to ignore queue limit
checkingResumeData 	Checking resume data on qBt startup
moving 	Torrent is moving to another location
unknown 	Unknown status
*/
const statsMap = {
    error: ETaskStats.error,
    missingFiles: ETaskStats.error,
    uploading: ETaskStats.seeding,
    pausedUP: ETaskStats.paused,
    queuedUP: ETaskStats.seeding,
    stalledUP: ETaskStats.seeding,
    checkingUP: ETaskStats.downloading,
    forcedUP: ETaskStats.seeding,
    allocating: ETaskStats.waiting,
    downloading: ETaskStats.downloading,
    metaDL: ETaskStats.downloading,
    pausedDL: ETaskStats.paused,
    queuedDL: ETaskStats.paused,
    stalledDL: ETaskStats.downloading,
    forcedDL: ETaskStats.downloading,
    checkingResumeData: ETaskStats.waiting,
    moving: ETaskStats.unknown,
    unknown: ETaskStats.unknown
};
function toTaskStats(stats) {
    if(statsMap[stats])
        return statsMap[stats];
    else return ETaskStats.unknown;
}

class QBittorrent extends DownloaderBase {
    constructor(name) {
        super(name);
        this.username = 'admin';
        this.password = '';
        this.protocol = 'http';
        this.host = 'localhost'
        this.port = 8080;
        this.path = '';
        this.rid = this._newRid();

        this.status = new DownloaderStatus();
    }

    _newRid() {
        return getRandomInt(100, 65535);
    }

    _getUrl() {
        let url = `${this.protocol}://${this.host}:${this.port}/${this.path}`
        if(url.endsWith('/'))
            url = url.slice(0, -1);
        return url;
    }

    _getRequestData(params) {
        return {
            method: 'post',
            credentials: 'include',
            body: params 
        };
    }

    _login() {
        fetch(this._getUrl() + '/api/v2/auth/login', 
            this._getRequestData(new URLSearchParams({
                username: this.username,
                password: this.password
            }))
        ).then((response) => {
            if(response.status === 403)
                throw new Error('Login failed, ip is banned for too many failed login attempts');
            return response.status;
        });
    }

    /**
     * 
     * @param {DownloaderConfig} config 
     */
    fromConfig(config) {
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
        const data = {};
        properties.forEach(el => {
            data[el] = this[el];
        });
        return new DownloaderConfig(
            this.name,
            EDownloaderType.qbittorrent,
            data
        );
    }


    getVersion() {
        return fetch(this._getUrl() + '/api/v2/app/version', 
            this._getRequestData()
        ).then((response) => {
            console.log(response);
        });
    }

    getStatus() {
        return fetch(this._getUrl() + '/api/v2/transfer/info',
            this._getRequestData()
        ).then((response) => {
            if(!response.ok)
                throw new Error(response.status);
            return response.json();
        }).catch((e) => {
            this.status = new DownloaderStatus();
            this.status.stats = EDownloaderStats.error;
            throw e;
        }).then((result) => {
            return new DownloaderStatus(
                parseInt(result.dl_info_speed),
                parseInt(result.up_info_speed)
            )
        });
    }

    addTask(url, taskparams) {
        const formData = new FormData();
        formData.append('urls', url);
        const {hash, name} = DownloaderBase.getMagnetInfo(url);
        return fetch(this._getUrl() + '/api/v2/torrents/add',
            this._getRequestData(formData)
        ).then((response) => {
            console.log(response);
            return new Task(name || hash, this.name, hash);
        })
    }


    getTaskStatus(task) {
        return fetch(this._getUrl() + '/api/v2/torrents/info',
            this._getRequestData(new URLSearchParams({hashes: task.key}))
        ).then((response) => response.json())
         .then((result) => {
             if(result.length === 0)
                 return null;
             result = result[0];
             const downloaded = parseInt(result.completed, 10);
             const total = parseInt(result.size, 10);
             return new p2pTaskStatus(
                 result.name,
                 toTaskStats(result.state),
                 downloaded,
                 total,
                 parseInt(result.dlspeed, 10),
                 parseInt(result.upspeed, 10)
             );
        });
    }

    removeTask(task) {
        return fetch(this._getUrl() + '/api/v2/torrents/delete',
            this._getRequestData(new URLSearchParams({hashes: task.key, deleteFiles: 'false'}))
        ).then((response) => response.ok);
    }

    pauseTask(task) {
        return fetch(this._getUrl() + '/api/v2/torrents/pause',
            this._getRequestData(new URLSearchParams({hashes: task.key}))
        ).then((response) => response.ok);
    }

    resumeTask(task) {
        return fetch(this._getUrl() + '/api/v2/torrents/resume',
            this._getRequestData(new URLSearchParams({hashes: task.key}))
        ).then((response) => response.ok);
    }
}
 
export {QBittorrent};