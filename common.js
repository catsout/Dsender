const ETaskStats = {
    downloading: 'downloading',
    waiting: 'waiting',
    complete: 'complete',
    paused: 'paused',
    error: 'error',
    unknown: 'unknown',
    seeding: 'seeding',
    offline: 'offline',
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
        this.name = name || 'unknown';
        this.downloader = downloader;
        this.key = key;
    }

    /**
     *
     * @param {Task} t
     * @returns {string}
     */
    static getId(t) {
        if(!t) return '';
        return t.downloader + t.key;
    }

    /**
     * 
     * @param {Task} t1 
     * @param {Task} t2 
     * @return {Boolean}
     */
    static compare(t1, t2) {
        return t1.key === t2.key && t1.downloader === t2.downloader;
    }
}

class TurlParmas {
    constructor(url, header, threads, minsplit) {
        this.url = url||null;
        this.header = header||{};
        this.threads = threads||null;
        this.minsplit = minsplit||null;
    }
}
class Tp2pParmas {
    constructor(magnetUrl, torrentData, sequential, firstLastPiece) {
        this.magnetUrl = magnetUrl||null;
        this.torrentData = torrentData||null;
        this.sequential = sequential||false;
        this.firstLastPiece = firstLastPiece||false;
    }
}

class TaskParams {
    /**
     * 
     * @param {String} name 
     * @param {String} dir 
     * @param {TurlParmas|null} urlParmas 
     * @param {Tp2pParmas|null} p2pParmas 
     */
    constructor(name, dir, urlParmas, p2pParmas) {
        this.name = name||'';
        this.dir = dir||'';
        this.urlParmas = urlParmas||null;
        this.p2pParmas = p2pParmas||null;
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

class TaskItem {
    /**
     * 
     * @param {Task} task 
     * @param {TaskStatus} status 
     */
    constructor(task, status) {
        this.task = task || new Task();
        this.status = status || new TaskStatus(this.task.name);
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


export {Tp2pParmas, TurlParmas};
export {DownloaderStatus, Task, TaskParams, TaskStatus, TaskItem, p2pTaskStatus, ETaskStats};
export {DownloaderConfig, EDownloaderType, EDownloaderStats};
export {basename, capitalize, getRandomInt};
export {base64, base64decode};