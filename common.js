const ETaskStats = {
    downloading: 'downloading',
    waiting: 'waiting',
    completed: 'completed',
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
    error: 'error',
    unknown: 'unknown'
}

Object.freeze(ETaskStats);
Object.freeze(EDownloaderType);
Object.freeze(EDownloaderStats);

function taskUnAvailable(stats) {
    return stats === ETaskStats.offline || stats === ETaskStats.removed || 
        stats === ETaskStats.unknown || stats === ETaskStats.waiting;
}

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
        this.stats = stats || EDownloaderStats.unknown;
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
     * @param {String} name 
     * @param {String} downloader 
     * @param {String} key 
     * @param {Boolean} bt
     */
    constructor(name, downloader, key, bt) {
        this.name = name || 'unknown';
        this.downloader = downloader;
        this.key = key;
        this.bt = bt||false;
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
class TbtParmas {
    constructor(magnetUrl, torrentData, sequential, firstLastPiece, hash) {
        this.magnetUrl = magnetUrl||null;
        this.torrentData = torrentData||null;
        this.sequential = sequential||false;
        this.firstLastPiece = firstLastPiece||false;
        this.hash = hash;
    }
}

class TaskParams {
    /**
     * 
     * @param {String} name 
     * @param {String} dir 
     * @param {TurlParmas|null} urlParams 
     * @param {TbtParmas|null} btParams 
     */
    constructor(name, dir, urlParams, btParams) {
        this.name = name||'';
        this.dir = dir||'';
        this.urlParams = urlParams||null;
        this.btParams = btParams||null;
    }
}

class TbtStatus {
    constructor(uploadSpeed, numSeeds, numPeers) {
        this.uploadSpeed = uploadSpeed || 0;
        this.numSeeds = numSeeds||0;
        this.numPeers = numPeers||0;
    }
}

class TaskStatus {
    /**
     *
     * @param {String} name 
     * @param {String} stats 
     * @param {Number} downloadLength
     * @param {Number} totalLength
     * @param {Number} connections
     * @param {Number} downloadSpeed
     * @param {TbtStatus} btStatus
     */
    constructor(name, stats, downloadLength, totalLength, connections, downloadSpeed, btStatus) {
        this.name = name || 'unknown';
        this.stats = stats || ETaskStats.unknown;
        this.downloadLength = downloadLength;
        this.totalLength = totalLength;
        this.connections = connections;
        this.downloadSpeed = downloadSpeed;
        this.newStatus = true;
        this.btStatus = btStatus||null;
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

export {TbtParmas, TurlParmas, TbtStatus};
export {taskUnAvailable};
export {DownloaderStatus, Task, TaskParams, TaskStatus, TaskItem, ETaskStats};
export {DownloaderConfig, EDownloaderType, EDownloaderStats};
export {basename, capitalize, getRandomInt};
export {base64, base64decode};