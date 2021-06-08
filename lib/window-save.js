import { Setting } from "./setting.js";

const settingField = 'windowOpen';
const widMatch = /wid=([^&]+)/.exec(window.location.search);
do {
    if(!widMatch) break;
    const wid = widMatch[1];
    if(!wid) break;
    browser.windows.getCurrent().then(function({ id: realId, type }) {
        if (type !== 'popup') return;

        window.addEventListener('beforeunload', function() {
            browser.windows.getCurrent().then(function({ id, left, top, width, height }) {
                if (id !== realId) return;
                const key = `${settingField}.${wid}`;
                Setting.setSetting({
                        [key]: {left, top , width, height}
                });
            })
        })
    }) 
} while(false);