import { Setting } from '../lib/setting.js'

class windowItem {
    constructor(id, url, dWidth, dHeight) {
        this.id = id||'';
        this.url = url||'';
        // default
        this.dWidth = dWidth||0;
        this.dHeight = dHeight||0;
    }
}

const settingField = 'windowOpen';
const windowOpen = {
    newBtTask: new windowItem(
        'newBtTask',
        '/pages/new-task/index.html',
        530, 400 
    ),
    newTaskUrl: new windowItem(
        'newTaskUrl',
        '/pages/new-task/index.html',
        700, 400
    ),
    newBtTaskUrl: new windowItem(
        'newBtTaskUrl',
        '/pages/new-task/index.html',
        530, 330 
    )
}

/**
 * 
 * @param {String} id 
 * @param {String} params
 * @returns {Boolean}
 */
function openPopupWindow(id, params) {
    if(!windowOpen.hasOwnProperty(id)) throw new Error(`window ${id} not exist`);
    const w = windowOpen[id];

    const key = `${settingField}.${id}`;
    Setting.getSetting([key]).then(function(item) {
        const wpos = {
            width: w.dWidth,
            height: w.dHeight,
        };
        browser.windows.getCurrent().then(function(mainWindow) {
            if(item.hasOwnProperty(key)) {
                Object.assign(wpos, item[key]);
            } else {
                wpos.left = Math.floor((mainWindow.width - wpos.width) / 2);
                wpos.top = Math.floor((mainWindow.height - wpos.height) / 2);
            }
            browser.windows.create({
                url: w.url + '?' + params + `&wid=${id}`,
                width: wpos.width,
                height: wpos.height,
                left: wpos.left,
                top: wpos.top,
                type: 'popup'
            }).then(function(opened) {
                browser.windows.update(opened.id, wpos);
            });
        });
    });
}
        /*
        window.open(w.url+'?'+params.toString(), '_blank', 
            [
                'resizable=1',
                'scrollbars=1',
            ].join(',')
        );
        */

export { openPopupWindow };