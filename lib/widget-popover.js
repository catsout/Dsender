export class WidgetPopover extends HTMLElement {

    static get observedAttributes() {
        return ['pop', 'show', 'dir'];
    }

    constructor() {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
        <style>
            :host {
            }
            #container {
                overflow: visible;
                position: relative;
            }
            #popover {
                position: absolute;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s;
                box-shadow: 2px 2px 8px rgba(0,0,0,0.15);
                box-sizing: border-box;
                z-index: 40;
            }
            :host([show]) #popover {
                opacity: 1;
                visibility: inherit;
            }

            :host(:not([dir])) #popover,
            :host([dir="bottomleft"]) #popover {
                left: 0;
                top: 100%;
            }
            
            :host([dir="bottomright"]) #popover {
                right: 0;
                top: 100%;
            }

            :host([dir="topleft"]) #popover {
                left: 0;
                bottom: 100%;
            }
            :host([dir="topright"]) #popover {
                right: 0;
                bottom: 100%;
            }
            :host([dir="lefttop"]) #popover {
                right: 100%;
                top: 0;
            }
        </style>
        <div id="container">
            <slot name="content"></slot>
            <div id="popover"><slot name="popover"></slot></div>
        </div>
        `;
        this.dpopover = shadowRoot.querySelector('#popover');
        this.dsContent = shadowRoot.querySelector('[name="content"]');
        this.dsPopover = shadowRoot.querySelector('#popover slot');
        this._outSideClick = (event) => {
            if(!(event.composedPath().includes(this))) {
                this.show = false;
            }
        };

        this._unshowHandle = [];
    }

    get show() {
        return this.hasAttribute('show');
    }

    set show(value) {
        if(value === this.hasAttribute('show')) return;
        if(value === true) {
            this.setAttribute('show', 'true');
        }
        else {
            this.removeAttribute('show');
        }
    }

    addUnshowCallback(func) {
        this._unshowHandle.push(func);
    }

    connectedCallback() {
        if(!this.getAttribute('pop')) {
            this.addEventListener('mousedown', function() {});
            this.dsContent.addEventListener('click', (event) => {
                if(!this.show) {
                    document.addEventListener('mousedown', this._outSideClick);
                    this.show = true;
                } else {
                    this.show = false;
                }
            });
        }
    }

    disconnectedCallback() {
        document.removeEventListener('mousedown', this._outSideClick);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(name === 'show') {
            if(!newValue && !this.getAttribute('pop')) {
                document.removeEventListener('mousedown', this._outSideClick);
            }
            if(!newValue) {
                this._unshowHandle.forEach((el) => { el(); });
            }
        }
    }

}

if (!customElements.get('widget-popover')) {
    customElements.define('widget-popover', WidgetPopover);
}