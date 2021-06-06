import {DEventTarget} from './event.js';

class Setting {
    constructor() {
        this.eventTargets = new Map();
        this.RegEventTargets = new Map();
        this.storageChanged = (changes, areaName) => {
            if (areaName !== 'local') return
            Object.entries(changes).forEach(([key, value]) => {
                const et = this.eventTargets.get(key);
                if(et)
                    et.dispatch(value.oldValue, value.newValue);
                this.RegEventTargets.forEach((et, reg) => {
                    if(reg.test(key)) {
                        et.dispatch(key, value.oldValue, value.newValue);
                    }
                });
            });
        };
        browser.storage.onChanged.addListener(this.storageChanged);
    }

    /**
     * 
     * @param {[String]|null} items 
     * @returns 
     */
    static getSetting(items) {
        return browser.storage.local.get(items);
    }

    static setSetting(item) {
        return browser.storage.local.set(item);
    }

    unload() {
        browser.storage.onChanged.removeListener(this.storageChanged);
    }

    /**
     * 
     * @param {String} key 
     * @param {Function} func 
     */
    addListener(key, func) {
        if(!this.eventTargets.has(key)) {
            this.eventTargets.set(key, new DEventTarget());
        }
        const et = this.eventTargets.get(key);
        et.addListener(func);

        Setting.getSetting([key]).then((item) => {
            if(typeof(item[key]) !== 'undefined') func(undefined, item[key]);
        });
    }

    /**
     * 
     * @param {RegExp} reg 
     * @param {Function} func 
     */
    addRegexpListener(reg, func) {
        if(!this.RegEventTargets.has(reg)) {
            this.RegEventTargets.set(reg, new DEventTarget());
        }
        const et = this.RegEventTargets.get(reg);
        et.addListener(func);
        Setting.getSetting(null).then((item) => {
            Object.entries(item).forEach(([key, value]) => {
                if(reg.test(key)) func(key, undefined, value);
            });
        });
    }
}

export {Setting};