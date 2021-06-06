export class WidgetCheckBox extends HTMLElement {
    static get observedAttributes() {
        return ['required', 'checked'];
    }

    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
            }
            :host([disabled]) {
                pointer-events: none;
                opacity: 0.6;
            }
            #checkbox {
                position: absolute;
                clip-path: polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px);
            }

            slot {
                pointer-events: none;
            }

            label {
                box-sizing: border-box;
                display: flex;
                white-space: pre-wrap;
                width: 100%;
                align-items: center;
                margin: 0.1875em 0px;
            }

            #checkbox > span{
                display: inline-block;
                vertical-align: middle;
            }
            #check {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: initial;
                position: relative;
                margin-right: 0.25em;

                width: 1em;
                height: 1em;
                border-radius: 0.125em;
                border: 0.0625em solid rgba(12, 12, 13, 0.3);
                background-color: rgba(12, 12, 13, 0.1);

                transition: 0.2s;
            }

            #check img {
                opacity: 0;
                filter: invert(100%);
                transition: opacity 0.2s;
            }

            :host(:hover) #check {
                background-color: rgba(12, 12, 13, 0.2);
            }
            :host(:active) #check {
                background-color: rgba(12, 12, 13, 0.3);
            }

            #checkbox:checked+label #check {
                background-color: #0060df;
            }
            :host(:hover) #checkbox:checked+label #check {
                background-color: #003eaa;
            }
            :host(:active) #checkbox:checked+label #check {
                background-color: #002275;
            }

            #checkbox:checked+label #check img{
                opacity: 1;
            }
            </style>
            <div class="container">
                <input type="checkbox" id="checkbox">
                <label for="checkbox">`
                    +'<slot name="left"></slot>'
                    +'<span><div id="check"><img height="80%" src="/assets/icons/check.svg"></img></div></span>'
                    +'<slot></slot>'
                +`</label>
            </div>
        `
        this.checkbox = shadowRoot.querySelector('#checkbox');
    }

    get disabled() {
      return this.getAttribute('disabled')!==null;
    }
    set disabled(value) {
      if(value === null || value === false){
        this.removeAttribute('disabled');
      }else{
        this.setAttribute('disabled', '');
      }
    }

    get checked() {
        return this.getAttribute('checked')!==null;
    }
    set checked(value) {
        if(value===null||value===false){
            this.removeAttribute('checked');
        } else {
            this.setAttribute('checked', '');
        }
    }

    connectedCallback() {
        this.checkbox.addEventListener('change',(ev) => {
            this.checked = this.checkbox.checked;
            this.dispatchEvent(new CustomEvent('change', {
                detail: {
                    checked: this.checked
                }
            }));
        });

    }
    attributeChangedCallback (name, oldValue, newValue) {
        if(name === 'required') {
            if(newValue !== null) {
                this.checkbox.setAttribute('required', '');
            } else {
                this.checkbox.removeAttribute('required');
            }
        }
        else if(name === 'checked') {
            if(newValue !== null) {
                this.checkbox.checked = true;
            } else {
                this.checkbox.checked = false;
            }
        }
    }
}

if(!customElements.get('widget-checkbox')) {
  customElements.define('widget-checkbox', WidgetCheckBox);
}