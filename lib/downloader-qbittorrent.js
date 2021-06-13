import {DownloaderStatus, Task, TaskParams, ETaskStats, TbtStatus, DownloaderConfig, EDownloaderType, EDownloaderStats, basename, getRandomInt, TbtParmas, TaskStatus} from '../common.js';
import {DownloaderBase} from './downloader-base.js';

const properties = ['username', 'password', 'host', 'port', 'path', 'tls'];

const GlobalOption = {
    download_limit: 'dl_limit',
    upload_limit: 'up_limit',
    download_path: 'save_path',
    max_downloading: 'max_active_downloads',
    bt_max_peers: 'max_connec_per_torrent',
    bt_require_crypto: 'encryption',
    disk_cache: 'disk_cache',
    bt_seed_ratio: 'max_ratio'
    /* encryption
    0 	Prefer encryption
    1 	Force encryption on
    2 	Force encryption off
    */
}


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
        this.tls = false;
        this.host = 'localhost'
        this.port = 8080;
        this.path = '';
        this.rid = this._newRid();

        this.status = new DownloaderStatus();
        this.statsDate = new Date();

        this.max_active_torrents = 1;
    }

    _newRid() {
        return getRandomInt(100, 65535);
    }

    _getUrl() {
        const protocol = this.tls?'https':'http';
        let url = `${protocol}://${this.host}:${this.port}${this.path}`
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
        return fetch(this._getUrl() + '/api/v2/auth/login', 
            this._getRequestData(new URLSearchParams({
                username: this.username,
                password: this.password
            }))
        ).then((response) => {
            if(response.status === 403)
                throw new Error('Login failed, ip is banned for too many failed login attempts');
            else if(!response.ok) throw new Error();
            return response.ok;
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
        ).then((response) => response);
    }

    healthCheck() {
        const newDate = new Date();
        return this.getVersion().then((response) => {
            if(response.status === 401 || response.status === 403) {
                this._login().catch((error) => {
                    this.status.stats = EDownloaderStats.unauthorized;
                    this.statsDate = newDate;
                });
            }
            else if(!response.ok) {
                this.status.stats = EDownloaderStats.error;
                this.statsDate = newDate;
            }
            else if(newDate >= this.statsDate) {
                this.status.stats = EDownloaderStats.ok;
                this.statsDate = newDate;
            }
        }).catch((e) => {
            if(newDate >= this.statsDate) {
                this.status = new DownloaderStatus();
                this.status.stats = EDownloaderStats.error;
                this.statsDate = newDate;
                throw e;
            }
        });
    }

    getStatus() {
        return fetch(this._getUrl() + '/api/v2/transfer/info',
            this._getRequestData()
        ).then((response) => {
            if(!response.ok)
                throw new Error(response.status);
            return response.json();
        }).then((result) => {
            return new DownloaderStatus(
                parseInt(result.dl_info_speed),
                parseInt(result.up_info_speed),
                EDownloaderStats.ok
            )
        });
    }

    /**
     * 
     * @param {TaskParams} taskparams 
     * @returns 
     */
    addBtTask(taskparams) {
        const btParams = taskparams.btParams;
        const formData = new FormData();

        if(btParams.magnetUrl)
            formData.append('urls', btParams.magnetUrl);
        else if(btParams.torrentData)
            formData.append('torrents', btParams.torrentData);

        if(taskparams.dir)
            formData.append('savepath', taskparams.dir);
        if(taskparams.name)
            formData.append('rename', taskparams.name);

        // p2p
        if(typeof(btParams.sequential) === 'boolean')
            formData.append('sequentialDownload', btParams.sequential.toString())
        if(typeof(btParams.firstLastPiece) === 'boolean')
            formData.append('firstLastPiecePrio', btParams.firstLastPiece.toString())

        const hash = btParams.hash;
        const name = taskparams.name;

        return fetch(this._getUrl() + '/api/v2/torrents/add',
            this._getRequestData(formData)
        ).then((response) => {
            return new Task(name || hash, this.name, hash, true);
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
             const numSeeds = parseInt(result.num_seeds, 10);
             const numLeechs = parseInt(result.num_leechs, 10);

             return new TaskStatus(
                 result.name,
                 toTaskStats(result.state),
                 downloaded,
                 total,
                 numSeeds,
                 parseInt(result.dlspeed, 10),
                 new TbtStatus(parseInt(result.upspeed, 10), numSeeds, numLeechs)
             );
        });
    }

    sync(tasklist, taskChangeCallback, statsChangeCallback) {
        function doCallback(cb, ...args) { if(cb) cb(...args); }

        fetch(this._getUrl() + '/api/v2/sync/maindata',
            this._getRequestData(new URLSearchParams({rid: this.rid}))
        ).then((response) => response.json())
         .then((result) => {
            if(result.server_state) {
                if(result.server_state.hasOwnProperty('dl_info_speed')) 
                    this.status.downloadSpeed = result.server_state.dl_info_speed;
                if(result.server_state.hasOwnProperty('up_info_speed'))
                    this.status.uploadSpeed = result.server_state.up_info_speed;
            }
            const torrents = result.torrents || {};
            const removed = result.torrents_removed || {};
            tasklist.forEach((el) => {
                if(torrents[el.task.key]) {
                    const t = torrents[el.task.key];
                    if(!el.status.btStatus) el.status.btStatus = new TbtStatus();
                    if(t.hasOwnProperty('name')) {
                        el.task.name = t.name;
                        el.status.name = t.name
                        doCallback(taskChangeCallback, el);
                    }
                    if(t.hasOwnProperty('state')) { 
                        const newStats = toTaskStats(t.state);
                        if(newStats !== el.status.stats) {
                            doCallback(statsChangeCallback, el, el.status.stats, newStats);
                            el.status.stats = newStats;
                        }
                    }
                    if(t.hasOwnProperty('completed')) el.status.downloadLength = parseInt(t.completed, 10);
                    if(t.hasOwnProperty('size')) el.status.totalLength = parseInt(t.size, 10);
                    if(t.hasOwnProperty('dlspeed')) el.status.downloadSpeed = parseInt(t.dlspeed, 10);
                    if(t.hasOwnProperty('upspeed')) el.status.btStatus.uploadSpeed = parseInt(t.upspeed, 10);
                    if(t.hasOwnProperty('num_seeds')) el.status.btStatus.numSeeds = parseInt(t.num_seeds, 10);
                    if(t.hasOwnProperty('num_leechs')) el.status.btStatus.numLeechs = parseInt(t.num_leechs, 10);
                    el.status.newStatus = true;
                } else if(result.full_update) {
                    el.status.newStatus = true;
                    el.status.stats = ETaskStats.removed;
                }
                if(removed[el.task.key]) {
                    el.status.newStatus = true;
                    el.status.stats = ETaskStats.removed;
                }
            });
            this.rid = result.rid;
         });
    }

    deleteTask(task) {
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

    getGlobalOption() {
        return fetch(this._getUrl() + '/api/v2/app/preferences',
            this._getRequestData()
        ).then((response) => response.json())
        .then((result) => {
            const options = {};
            if(result.hasOwnProperty('max_active_torrents'))
                this.max_active_torrents = result.max_active_torrents;

            Object.entries(GlobalOption).forEach(([k,k2]) => {
                if(!result.hasOwnProperty(k2)) return;
                const value = result[k2];
                if(k === 'bt_require_crypto')
                    options[k] = (value === 1);
                else if(k === 'disk_cache')
                    options[k] = value * 1024 * 1024;
                else options[k] = value;
            });
            return options;
        });
    }

    setGlobalOption(params) {
        const options = {};
        Object.entries(params).forEach(([k, v]) => {
            const key = GlobalOption[k];
            let value = v;
            if(k === 'max_downloading' && this.max_active_torrents < v)
                options['max_active_torrents'] = v;
            else if(k === 'bt_seed_ratio')
                options['max_ratio_enabled'] = true;
            if(k === 'bt_require_crypto')
                value = value ? 1 : 0;
            else if(k === 'disk_cache')
                value /= 1024*1024;
            options[key] = value;
        });
        return fetch(this._getUrl() + '/api/v2/app/setPreferences',
            this._getRequestData(new URLSearchParams({json: JSON.stringify(options)}))
        ).then((response) => response.ok);
    }
}
 
export {QBittorrent};