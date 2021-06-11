import '../../lib/widget-switch.js';

import { DownloaderBase } from "../../lib/downloader-base.js";
import { MessagePort } from "../../lib/message.js";
import { WidgetMessageBox } from "../../lib/widget-messagebar.js";

var backport = new MessagePort();
backport.connect('request');

/**@type {WidgetMessageBox} */
var msgbox = document.querySelector('widget-messagebox');

var dpageroute = parent.dpageroute;


const params = new URLSearchParams(window.location.search);
var derName = params.get('name');
var derId = DownloaderBase.nameToId(derName);

const units = {
	download_limit: 1024,
	upload_limit: 1024,
	disk_cache: 1024*1024,
	min_split_size: 1024*1024
}

/**
 * 
 * @param {HTMLElement} ditem 
 */
function getPackParent(ditem) {	
	if(!ditem.parentElement) return null;
	const parent = ditem.parentElement;
	if(parent.classList.contains('pack')) {
		return parent;
	}
	return getPackParent(parent);
}

function optionToInput(k, v) {
	if(this.type === 'number' && Number.isInteger(v)) {
		const unit = units.hasOwnProperty(k) ? units[k] : 1;
		this.value = Math.floor(v / unit);
	} else this.value = v;
}
function inputToOption(event) {
	if(!this.checkValidity()) {
        msgbox.send(this.validationMessage, null, null, 3000);
        setTimeout(this.focus.bind(this), 200);
        return;
    }
	if(this.type === 'number') {
		const key = this.id;
		let value = 0;
		if(this.value.indexOf('.') === -1) {
			const unit = units.hasOwnProperty(key) ? units[key] : 1;
			value = Math.floor(this.value * unit);
		} else value = parseFloat(this.value);
		setOption({[key]: value});
	} else if(this.type === 'text')
		setOption({[this.id]: this.value});
}

function optionToSwitch(v) {
	this.checked = v;
}
function switchToOption(event) {
	setOption({[this.id]: this.checked});
}

function optionToDom(k, v) {
	const ditem = document.querySelector('#'+k);
	if(!ditem) return;
	const dpack = getPackParent(ditem);
	if(dpack) dpack.classList.remove('hidden');
	const tagname = ditem.tagName.toLowerCase()
	switch(tagname) {
		case 'input':
			optionToInput.bind(ditem)(k, v);
			break;
		case 'widget-switch':
			optionToSwitch.bind(ditem)(v);
			break;
	}
}

document.querySelectorAll('input').forEach(function(ditem) {
	ditem.addEventListener('change', inputToOption);
});
document.querySelectorAll('widget-switch').forEach(function(ditem) {
	ditem.addEventListener('change', switchToOption);
});

function setOption(options) {
	const p = backport.send({command: 'setDownloaderOption', data: {name: derName, options}});
	msgbox.sendWait(p);
}

const p = backport.send({command: 'downloaderOption', data: derName}).then(function(result) {
	Object.entries(result).forEach(([k, v]) => optionToDom(k, v));
	if(dpageroute) dpageroute.fitIframeHeight();
});
msgbox.sendWait(p);