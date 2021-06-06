const units = ['B', 'KB', 'MB', 'GB'];
const short_units = ['B', 'K', 'M', 'G'];

export class WidgetByteLabel extends HTMLElement {

    static get observedAttributes() {
      return ['value', 'unit', 'speed'];
    }
  
    constructor() {
      super();
  
      const shadowRoot = this.attachShadow({mode: 'open'});
  
      shadowRoot.innerHTML = `
              <style>
                  :host {
                      display: inline-block;
                  }
                  span {
                      user-select: none;
                  }
              </style>
              <slot></slot><span id="value"></span><span id="unit"></span>`;
      this.hvalue = this.shadowRoot.querySelector('#value');
      this.hunit = this.shadowRoot.querySelector('#unit');
    }
  
    connectedCallback() {
      this.setAttribute('value', null);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(name === 'value') {
            let unitIndex = 0;
            if(newValue === 'null' || newValue === 'undefined') {
                this.hvalue.textContent = '--- ';
            } else {
                let speed = parseInt(newValue, 10);
                while(speed >= 1024) {
                    speed /= 1024;
                    unitIndex++;
                }
                this.hvalue.textContent = speed.toFixed(1) + ' ';
            }

            let u = units[unitIndex%4];
            let attUnit = this.getAttribute('unit'); 
            if(attUnit === 'short')
                u = shortunits[unitIndex%4]
            else if(attUnit === 'none')
                u = '';
            this.hunit.textContent = u + (this.hasAttribute('speed')?'/s':'');
        }
    }
  
    get value() {
      return this.getAttribute('value');
    }
  
    set value(v) {
      this.setAttribute('value', v);
    }

    get unit() {
        return this.getAttribute('unit');
    }
    
    set unit(v) {
        this.setAttribute('unit', v);
    }

}
  
if(!customElements.get('widget-bytelabel')) {
    customElements.define('widget-bytelabel', WidgetByteLabel);
}