import '../../lib/widget-switch.js';
import { WidgetMessageBox } from '../../lib/widget-messagebar.js';

import { Setting } from '../../lib/setting.js';

var dpageroute = parent.dpageroute;
/**@type {WidgetMessageBox} */
var msgbox = document.querySelector('widget-messagebox');

const configs = [
    'completeNotify', 'directDownload', 'filterSize', 'filterExExtension'
];
const changedConfigs = {};

function switchToConfig(event) {
    Setting.setSetting({ [this.id]: this.checked });
    //changedConfigs[this.id] = this.checked;
}
function configToSwitch(el, value) {
    el.checked = value;
}

function inputToConfig(event) {
    if(!this.checkValidity()) {
        msgbox.send(this.validationMessage, null, null, 3000);
        setTimeout(this.focus.bind(this), 200);
        return;
    }
    if(this.type === 'number') {
        Setting.setSetting({ [this.id]: parseInt(this.value, 10) });
    } else if(this.type === 'text') {
        Setting.setSetting({ [this.id]: this.value });
    }
}
function configToInput(el, value) {
    el.value = value;
}

document.querySelectorAll('widget-switch').forEach((el) => {
    el.addEventListener('change', switchToConfig);
});
document.querySelectorAll('input').forEach((el) => {
    el.addEventListener('change', inputToConfig);
})

browser.storage.local.get(configs).then(item => {
    Object.entries(item).forEach(([key, value]) => {
        const delem = document.querySelector('#' + key);
        if(!delem) return;
        switch(delem.tagName.toLowerCase()) {
            case 'widget-switch':
                configToSwitch(delem, value); 
                break;
            case 'input':
                configToInput(delem, value);
                break;
        }
    });
});