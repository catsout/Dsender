export class WidgetProgress extends HTMLElement {

    static get observedAttributes() {
      return ['value', 'max'];
    }
  
    constructor() {
      super();
  
      const shadowRoot = this.attachShadow({mode: 'open'});
  
      shadowRoot.innerHTML = `
              <style>
                  :host {
                      display: block;
                      width: 100%;
                      height: 5px;
                      --progress-value: 0;
                      --progress-color: #0060df;/*#00bcd4;*/
                      --progress-background: rgba(12, 12, 13, 0.1);
                  }

                  :host([hidden]) {
                    display: none !important;
                  }

                  #bar {
                    width: 100%;
                    height: 100%;
                    border-radius: 15px;
                    background: var(--progress-background);
                  }

                  #value {
                    border-radius: 15px;
                    width: calc(var(--progress-value) * 100%);
                    height: 100%;
                    background: var(--progress-color);
                    will-change: width;
                    transition: width 0.2s linear;
                  }
                  :host(:not[max]) #value,
                  :host(:not([value])) #value {
                    position: relative;
                    width: 10%;
                    will-change: left;
                    animation-name: slide;
                    animation-duration: 1s;
                    animation-fill-mode: forwards;
                    animation-timing-function: ease-in-out;
                    animation-direction: alternate;
                    animation-iteration-count: infinite;
                  }

                  @keyframes slide {
                    from {
                      left: 0%;
                    }
                    to {
                      left: 90%;
                    }
                  }

                  :host([complete]) #value {
                    background: #40c66b;
                  }
                  :host([unactive]) #value {
                    background: rgba(12, 12, 13, 0.3);
                  }
                  :host([error]) #value {
                    background: #d70022;
                  }
              </style>
              <div id="bar">
                  <div id="value"></div>
              </div>
          `;
  
      this.bar = this.shadowRoot.querySelector('#bar');
      this.bar_var = this.shadowRoot.querySelector('#value');
    }
  
    connectedCallback() {
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if(name === 'value') {
        if(!this.hasAttribute('max')) {
          this.setAttribute('max', 100);
        }
        const max = parseInt(this.getAttribute('max'), 10);
        const value = parseInt(this.getAttribute('value'), 10);
        const progress = value/max;
        this.toggleAttribute('complete', Math.floor(progress) === 1)
        this.style.setProperty('--progress-value', progress);
      }
    }

    get value() {
      return this.getAttribute('value');
    }
  
    set value(value) {
      if(typeof(value) === 'number')
        this.setAttribute('value', value);
      else this.removeAttribute('value');
    }

    get max() {
      this.getAttribute('max');
    }

    set max(value) {
      if(typeof(value) === 'number')
        this.setAttribute('value', value);
      this.setAttribute('max', value);
    }

    set unactive(value) {
      if(value) {
        this.setAttribute('unactive', '');
      }
      else this.removeAttribute('unactive');
    }

    set error(value) {
      if(value) {
        this.setAttribute('error', '');
      }
      else this.removeAttribute('error');
    }
  }
  
  if(!customElements.get('widget-progress')) {
    customElements.define('widget-progress', WidgetProgress);
  }