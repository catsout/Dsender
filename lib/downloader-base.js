import { base64, base64decode, basename, DownloaderStatus } from "../common.js";
import { magnetUrlDecode } from './magnet-url.js';
import * as base32 from './third/hi-base32.js';

class DownloaderBase {
    constructor(name) {
        this._name = name;
        this.status = new DownloaderStatus();
    }

    get name() {
        return this._name;
    }

    addTask() {
        return Promise.reject(`${this._name} not support http(s) download.`);
    }

    addBtTask() {
        return Promise.reject(`${this._name} not support BT download.`);
    }

    static nameToId(dname) {
        return 'downloader_' + base64(dname);
    }

    static idToName(id) {
        return base64decode(id.substring('downloader_'.length));
    }

    static getUrlFilename(url) {
        const name = decodeURIComponent(basename(url.split('?')[0]));
        if(/\.\w+$/.test(name)) {
            return name;
        }
        return null;
    }
    static isMagnet(url) {
        return /^magnet:/.test(url);
    }
    static getMagnetInfo(url) {
        const data = magnetUrlDecode(url);
        const xt = data.xt ? data.xt : '';
        let hash = null;
        if(xt.match(/^urn:btih:/)) {
            hash = xt.split(':')[2];
            if(hash.length === 32) {
                const dec = base32.decode.asBytes(hash).map((x) => x.toString(16).padStart(2, '0'));
                hash = dec.join('');
            }
            hash = hash.toLowerCase();
        }
        return {
            hash: hash,
            name: data.dn,
            trackers: data.tr
        };
    }
};

export {DownloaderBase};