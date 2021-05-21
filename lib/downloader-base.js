import { base64, base64decode, DownloaderStatus } from "../common.js";

class DownloaderBase {
    constructor(name) {
        this._name = name;
        this.status = new DownloaderStatus();
    }

    get name() {
        return this._name;
    }

    static nameToId(dname) {
        return 'downloader_' + base64(dname);
    }

    static idToName(id) {
        return base64decode(id.substring('downloader_'.length));
    }
};

export {DownloaderBase};