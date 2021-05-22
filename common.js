const ETaskStats = {
    downloading: 'downloading',
    waiting: 'waiting',
    complete: 'complete',
    paused: 'paused',
    error: 'error',
    unknown: 'unknown',
    seeding: 'seeding',
    removed: 'removed' // will be removed from tasklist when open popup
}

const EDownloaderType = {
    aria2: 'aria2',
    qbittorrent: 'qbittorrent'
}

const EDownloaderStats = {
    ok: 'ok',
    offline: 'offline',
    unauthorized: 'unauthorized',
    error: 'error'
}

Object.freeze(ETaskStats);
Object.freeze(EDownloaderType);
Object.freeze(EDownloaderStats);

class DownloaderStatus {
    /**
     * 
     * @param {Number} downloadSpeed 
     * @param {Number} uploadSpeed 
     * @param {String} stats
     */
    constructor(downloadSpeed, uploadSpeed, stats) {
        this.downloadSpeed = downloadSpeed || 0;
        this.uploadSpeed = uploadSpeed || 0;
        this.stats = stats || EDownloaderStats.ok;
    }

    /**
     * 
     * @param {DownloaderStatus} d1 
     * @param {DownloaderStatus} d2 
     * @returns 
     */
    static add(d1, d2) {
        return new DownloaderStatus(
            d1.downloadSpeed+d2.downloadSpeed,
            d1.uploadSpeed+d2.uploadSpeed
        );
    }
}

class Task {
    /**
     * 
     * @param {string} name 
     * @param {string} downloader 
     * @param {string} key 
     */
    constructor(name, downloader, key) {
        this.name = name || '';
        this.downloader = downloader;
        this.key = key;
    }

    /**
     *
     * @param {Task} 
     * @returns {string}
     */
    static getId(t) {
        if(!t) return '';
        return t.downloader + t.key;
    }
}

class TaskParams {
    constructor(filename, dir, header) {
        this.filename = filename||'';
        this.dir = dir||'';
        this.header = header||{};
    }
}

class TaskStatus {
    /**
     *
     * @param {string} name 
     * @param {string} stats 
     * @param {number} downloadLength
     * @param {number} totalLength
     * @param {number} downloadSpeed
     */
    constructor(name, stats, downloadLength, totalLength, downloadSpeed) {
        this.name = name || 'unknown';
        this.stats = stats || ETaskStats.unknown;
        this.downloadLength = downloadLength;
        this.totalLength = totalLength;
        this.downloadSpeed = downloadSpeed;
        this.newStatus = true;
    }
}

class p2pTaskStatus extends TaskStatus {
    /**
     *
     * @param {string} name 
     * @param {string} stats 
     * @param {number} downloadLength
     * @param {number} totalLength
     * @param {number} downloadSpeed
     */
    constructor(name, stats, downloadLength, totalLength, downloadSpeed, uploadSpeed) {
        super(name, stats, downloadLength, totalLength, downloadSpeed);
        this.uploadSpeed = uploadSpeed || 0;
    }
}

class DownloaderConfig {
    /**
     * 
     * @param {string} name 
     * @param {string} type 
     * @param {object} data 
     */
    constructor(name, type, data) {
        this.name = name || '';
        this.type = type || null;
        this.data = data || {};
    }
}

function basename(path) {
    return path.split('\\').pop().split('/').pop();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// from https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings/53433503#53433503
function base64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}
function base64decode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}


export {DownloaderStatus, Task, TaskParams, TaskStatus, p2pTaskStatus, ETaskStats};
export {DownloaderConfig, EDownloaderType, EDownloaderStats};
export {basename, capitalize, getRandomInt};
export {base64, base64decode};