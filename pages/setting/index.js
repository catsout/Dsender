import '../../lib/widget-switch.js';

var dpageroute = parent.dpageroute;

const configs = [
    'completeNotify',
];
const changedConfigs = {};

function switchToConfig(event) {
    browser.storage.local.set({ [this.id]: this.checked });
    //changedConfigs[this.id] = this.checked;
}

function configToSwitch(el, value) {
    el.checked = value;
}

document.querySelectorAll('widget-switch').forEach((el) => {
    el.addEventListener('change', switchToConfig);
});

browser.storage.local.get(configs).then(item => {
    Object.entries(item).forEach(([key, value]) => {
        const delem = document.querySelector('#' + key);
        if(!delem) return;
        switch(delem.tagName.toLowerCase()) {
            case 'widget-switch':
                configToSwitch(delem, value); 
                break;
        }
    });
});

