class WidgetSwitch extends HTMLElement {

    static get observedAttributes() { return ['disabled', 'checked'] }

    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
        <style>
        :host { 
            display: inline-block;
            vertical-align: middle;
            white-space: nowrap;
        }
        :host([disabled]) { 
            pointer-events: none; 
            opacity: 0.4; 
        }
        #switch {
            display: block;
            position: absolute;
            clip-path: polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px);
        }
        label {
            display: flex;
            align-items: center;
            width: 2.4em;
            height: 1.2em;
            padding: 0.2em;
            margin: 0;
            border-radius: 0.2em;
            background-color: rgba(12, 12, 13, 0.1);
            transition: background-color 0.3s;
        }
        #switch:focus+label {
            /*box-shadow: 0 0 0 1px #0a84ff inset, 0 0 0 1px #0a84ff, 0 0 0 4px rgba(10, 132, 255, 0.3);*/
        }
        label:hover {
            background-color: rgba(12, 12, 13, 0.2);
        }
        label:active {
            background-color: rgba(12, 12, 13, 0.3);
        }
        label::before{
            content: '';
            display: block;
            flex: 0 1 0;
            transition: flex 0.3s cubic-bezier(0.12, 0.4, 0.29, 1.46);
        }
        label::after{
            content: '';
            display: block;
            width: 1.2em;
            height: 1.2em;
            border-radius: 0.125em;
            box-sizing: border-box;
            /*border: 0.4em solid #fff;*/
            background-color: #fff;
            transition: background-color 0.3s,padding 0.3s,border-radius 0.3s,border 0.3s;
        }
        :host([circle]) label,
        :host([circle]) label::after {
            border-radius: 0.8em;
        }
        #switch:checked+label {
            background-color: #0060df;
        }
        #switch:checked+label:hover {
            background-color: #003eaa;
        }
        #switch:checked+label:active {
            background-color: #002275;
        }
        #switch:checked+label::before {
            flex: 1;
        }
        </style>
        <input type="checkbox" id="switch"><label for="switch"></label>`
        this.switch = this.shadowRoot.getElementById('switch');
    }


    get name() {
        return this.getAttribute('name');
    }

    get disabled() {
        return this.getAttribute('disabled') !== null;
    }
    set disabled(value) {
        if (value === null || value === false) {
            this.removeAttribute('disabled');
        } else {
            this.setAttribute('disabled', '');
        }
    }

    get checked() {
        return this.getAttribute('checked') !== null;
    }
    set checked(value) {
        if (value === null || value === false) {
            this.removeAttribute('checked');
        } else {
            this.setAttribute('checked', '');
        }
    }

    focus() {
        this.switch.focus();
    }

    connectedCallback() {
        this.disabled = this.disabled;
        this.checked = this.checked;
        this.switch.addEventListener('change', (ev) => {
            this.checked = this.switch.checked;
            this.dispatchEvent(new CustomEvent('change', {
                detail: {
                    checked: this.checked
                }
            }));
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'disabled' && this.switch) {
            if (newValue !== null) {
                this.switch.setAttribute('disabled', 'disabled');
            } else {
                this.switch.removeAttribute('disabled');
            }
        }
        if (name == 'checked' && this.switch) {
            if (newValue !== null) {
                this.switch.checked = true;
            } else {
                this.switch.checked = false;
            }
        }
    }
}

if (!customElements.get('widget-switch')) {
    customElements.define('widget-switch', WidgetSwitch);
}