import {DEventTarget} from './event.js';

class Setting {
    constructor() {
        this.eventTargets = new Map();
        this.RegEventTargets = new Map();
        browser.storage.onChanged.addListener((changes, areaName) => {
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
        });
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
            if(item.key) func(undefined, item.key);
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