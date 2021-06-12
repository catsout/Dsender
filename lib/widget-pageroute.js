class History {
    constructor(path) {
        this.path = path;
    }
}

export class WidgetPageRoute extends HTMLElement {

    static get observedAttributes() {
      return [];
    }
  
    constructor() {
      super();
  
      const shadowRoot = this.attachShadow({mode: 'open'});
  
      shadowRoot.innerHTML = `
              <style>
                  :host {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                  }

                  #headerContainer {
                    flex: 0 0 auto;
                  }

                  #contentContainer {
                    flex: 1 1 auto;
                    overflow-y: auto;
                    box-sizing: border-box;
                  }

                  slot[name="content"]::slotted(*) {
                    display: none;
                  }

                  iframe {
                    display: block;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    border: 0;
                    box-sizing: border-box;
                  }
                  
                  .hidden {
                    display: none;
                  }
              </style>
              <div id="headerContainer">`
                 +'<slot name="header"></slot>'
                 +'<slot name="routeHeader"></slot>'
                 +'<slot name="hr"></slot>'
              +`</div>
              <div id="contentContainer">
                  <slot name="content"></slot>
                  <iframe></iframe>
              </div>
          `;
      this.dheaderContainer = this.shadowRoot.querySelector('#headerContainer');

      this.diframe = this.shadowRoot.querySelector('iframe');
      this.dsHeader = this.shadowRoot.querySelector('slot[name="header"]');
      this.dsRouteHeader = this.shadowRoot.querySelector('slot[name="routeHeader"]');
      this.dsHr = this.shadowRoot.querySelector('slot[name="hr"]');

      this.dsContent = this.shadowRoot.querySelector('slot[name="content"]');
      this.historys = [];
      this._current = new History('default');

    }
  
    connectedCallback() {
        this.diframe.src = 'about:blank';
        this.diframe.height = '400px';
        this.diframe.addEventListener('load', (e) => {
            if(this.current.path != 'default') {
                this.showIframe(true);
                this.fitIframeHeight();
            }
        });

        this.diframe.classList.add('hidden');
        this.dsRouteHeader.classList.add('hidden');
    }

    attributeChangedCallback(name, oldValue, newValue) {
    }
    
    fitIframeHeight() {
        this.diframe.height = this.diframe.contentWindow.document.body.scrollHeight + "px";
    }
    
    /**
     * 
     * @param {boolean} value 
     */
    showIframe(value) {
        this.dsContent.classList.toggle('hidden', value);
        this.dsRouteHeader.classList.toggle('hidden', !value);
        this.dsHeader.classList.toggle('hidden', value);

        if(value) this.dsHr.classList.toggle('hidden', this.dsRouteHeader.assignedNodes().length === 0);
        else this.dsHr.classList.toggle('hidden', this.dsHeader.assignedNodes().length === 0);
        this.diframe.classList.toggle('hidden', !value);
        this.style.setProperty('height', this.clientHeight + 'px');
        this.style.setProperty('height', 'auto');
    }

    get current() {
        return this._current;
    }

    go(path, args) {
        let fullpath = path;
        if(args) {
            fullpath += '?';
            fullpath += (new URLSearchParams(args)).toString();
        }
        if(fullpath === this._current.path) return false;
        this.historys.push(this.current);
        this._current = new History(fullpath);
        this.diframe.src = this.current.path;
        return true;
    }

    goToggle(path, args) {
        if(path === this._current.path)
            return this.back();
        else 
            return this.go(path, args);
    }

    back() {
        if(this.historys.length == 0) return false;
        this._current = this.historys.pop();

        if(this.current.path != 'default') {
            this.diframe.src = this.current.path;
        }
        else {
            //this.diframe.height = 0;
            this.diframe.src = 'about:blank';
            this.showIframe(false);
        }
        return true;
    }
}
  
if(!customElements.get('widget-pageroute')) {
    customElements.define('widget-pageroute', WidgetPageRoute);
}