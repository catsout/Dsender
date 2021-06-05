import './widget-button.js';
import './widget-waiticon.js';

class WidgetMessageBar extends HTMLElement {

    static get observedAttributes() { 
        return ['type', 'show'];
    }

    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
                font-size: 13px;
                font-weight: 400;
            }
            :host {
                opacity: 0;
                visibility: hidden;
                transition: 0.3s;
                z-index: 10;
            }
            #container {
                display: flex;
                flex-direction: row;
                flex-wrap: nowrap;
                align-items: top;
                padding: 4px;
                box-sizing: border-box;
                height: auto;
                min-height: 32px;
                border-radius: 4px;
                background-color: #ededf0;
                line-height: 24px;
                transform: translateY(-100%);
                transition: transform 0.3s cubic-bezier(.645, .045, .355, 1);
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                pointer-events:all;
            }
            :host([show]) {
                opacity: 1;
                visibility: visible;
            }
            :host([show]) #container {
                transform: translateY(0);
            }
            #header {
                height: 16px;
                width: 16px;
                margin: 4px;
                background-image: url(/assets/icons/info.svg);
                background-repeat: no-repeat;
                background-position: top;
                background-size: 100%;
            }
            :host([type="success"]) #header {
                background-image: url(/assets/icons/check.svg);
            }
            :host([type="warning"]) #header {
                background-image: url(/assets/icons/warning.svg);
            }
            :host([type="error"]) #header {
                background-image: url(/assets/icons/error.svg);
                filter: invert(100%);
            }
            :host([type="wait"]) #header {
                background: transparent;
            }
            #waiticon {
                display: none;
            }
            :host([type="wait"]) #waiticon {
                display: inline-block;
            }
            #content {
                flex: 1;
                display: flex;
                height: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: center;
            }
            #msg {
                margin-right: 8px;
            }
            #action {
                flex: 1;
            }
            :host([type="error"]) #container {
                color: #ffffff;
                background-color: #d70022;
            }
            :host([type="success"]) #container {
                color: #003706;
                background-color: #30e60b;
            }
            :host([type="warning"]) #container {
                color: #3e2800;
                background-color: #ffe900;
            }
            widget-button {
                --widget-color: currentcolor;
            }
            :host([type="error"]) img {
                filter: invert(100%);
            }
            img {
                display: block;
            }
            </style>
            <div id="container">
                <div id="header"><widget-waiticon id="waiticon"></widget-waiticon></div>
                <div id="content">
                    <div id="msg"><span></span></div>
                    <div id="action"></div>
                </div>
            </div>
        `
        this.daction = shadowRoot.querySelector('#action');
        this.dmsg = shadowRoot.querySelector('#msg span');
        this.dcontainer = shadowRoot.querySelector('#container');

    }
    get show() {
        return this.getAttribute('show') !== null;
    }
    set show(value) {
        if(value) {
            this.setAttribute('show', '');
        }
        else this.removeAttribute('show');
    }

    get type() {
        return this.getAttribute('type');
    }

    set type(value) {
        this.setAttribute('type', value);
    }

    get message() {
        return this.dmsg.textContent;
    }
    set message(value) {
        this.dmsg.textContent = value;
    }
    addAction(name, callback) {
        let btn = document.createElement('widget-button');
        btn.size = 'small';
        btn.textContent = name;
        this.daction.appendChild(btn);
        btn.addEventListener('click', callback);
    }

    connectedCallback() {
        this.shadowRoot.addEventListener('transitionend',(event) => {
            if(event.propertyName === 'transform' && !this.show){
               this.parentNode.removeChild(this);
            }
        });
    }
    attributeChangedCallback (name, oldValue, newValue) {
        if(name === 'show' && typeof(newValue) === 'string') {
            setTimeout(() => {
                if(!this.show && this.parentNode) {
                    this.parentNode.removeChild(this)
                }
            }, 500);
        }
    }
}

if(!customElements.get('widget-messagebar')){
    customElements.define('widget-messagebar', WidgetMessageBar);
}

class WidgetMessageBox extends HTMLElement {
    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.innerHTML = `
        <style>
            :host {
                position: fixed;
                top: 10px;
                left: 0;
                right: 0;
                z-index: 10;
                pointer-events: none;

                display: flex;
                flex-direction: column;
                align-items: center;
            }
            widget-messagebar {
                margin-bottom: 10px;
                max-width: 50%;
                pointer-events: initial;
            }
        </style>
        `;
    }

    _timerShow(msg, duration) {
        const startTimer = () => {
            return setTimeout(() => {
                msg.show = false;
            }, duration||5000);
        }
        msg.timer = startTimer();
        msg.addEventListener('mouseenter', (e) => {
            clearTimeout(msg.timer);
        });
        msg.addEventListener('mouseleave', (e) => {
            msg.timer = startTimer();
        });
        setTimeout(() => {msg.show = true}, 100);
    }

    send(message, type, actions, duration) {
        let msg = document.createElement('widget-messagebar');
        msg.message = message || '';
        msg.type = type || '';
        this.shadowRoot.appendChild(msg);
        if(actions) {
            Object.entries(actions).forEach(([key, value]) => {
                msg.addAction(key, value);
            });
        }
        this._timerShow(msg, duration);
    }

    sendWait(promise, waitmsg, timeout) {
        const msg = document.createElement('widget-messagebar');
        msg.message = waitmsg||'wait';
        msg.type = 'wait';
        this.shadowRoot.appendChild(msg);
        msg.show = true;

        return promise.then((result) => {
            msg.show = false;
            return result;
        }, (reason) => {
            msg.show = false;
            this.send(reason.toString(), 'error');
            throw reason;
        });
    }
}

if(!customElements.get('widget-messagebox')){
    customElements.define('widget-messagebox', WidgetMessageBox);
}

export {WidgetMessageBar, WidgetMessageBox};