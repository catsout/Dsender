export class WidgetButton extends HTMLElement {

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            position: relative;
            --button-size: 32px;
            --border-radius: 2px;
            --widget-color: rgb(12, 12, 13);
            min-width: calc(var(--button-size) * 2);
            height: var(--button-size);
            padding: 0 calc(var(--button-size) / 3);
            box-sizing: border-box;

            /* default size */
            font-size: 11px;
            font-weight: 400;
            border-radius: var(--border-radius);
           
            /* inline position*/
            line-height: 1;
            vertical-align: middle;
            text-align: center;
          }
          /* default color */
          :host {
            color: var(--widget-color);
            background-color: rgba(12, 12, 13, 0.1);
          }
          :host([theme~="primary"]) {
            color: #ffffff;
            background-color: #0060df;
          }
          :host([theme~="icon"]) {
            color: rgba(12, 12, 13, 0.8);
            background-color: transparent;
            width: var(--button-size);
            min-width: var(--button-size);
            padding: calc(var(--button-size) / 4);
          }

          :host([disabled]) {
            pointer-events: none;
            opacity: 0.6;
          }

          :host([size="small"]) {
            --button-size: 24px;
            font-size: 11px;
          }
          :host([size="large"]) {
            --button-size: 48px;
            --border-radius: 4px;
            font-size: 15px;
          }
          :host([size="fit"]) {
            height: auto;
            width: auto;
            min-width: 0;
            min-height: 0;
            padding: 0;
          }

          /* For interaction states */
          :host::before,:host::after {
            content: "";
            position: absolute;
            z-index: 1;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background-color: currentcolor;
            border-radius: inherit;
            opacity: 0;
            transition: opacity 0.1s;
            pointer-events: none;
          }
          /* before as backgroud */
          :host(:hover)::before {
            opacity: 0.1;
          }

          :host(:active)::before {
            opacity: 0.2;
            transition-duration: 0s;
          }

          /* after as animation */
          :host::after {
            transition: opacity 1.4s, transform 0.1s;
            filter: blur(5px);
          }

          :host(:active)::after {
            opacity: 0.1;
            transition-duration: 0.1s;
            transform: scale(0);
          }

          .container {
            display: inline-flex;
            box-sizing: border-box;
            align-items: center;
            justify-content: center;
            vertical-align: text-bottom;
            width: 100%;
            height: 100%;
            text-shadow: inherit;
            user-select: none;
            z-index: 2;
          }

          #prefix,#suffix {
            flex: none;
          }

          #label {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #button {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: inherit;
          }
        </style>
        <div class="container">
          <div id="prefix">
            <slot name="prefix"></slot>
          </div>
          <div id="label"><slot></slot></div>
          <div id="suffix">
            <slot name="suffix"></slot>
          </div>
        </div>
        <button id="button" type="button"></button>
    `
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

  get theme() {
    return this.getAttribute('theme');
  }

  set theme(value) {
    if(value === null)
      this.removeAttribute('theme');
    else this.setAttribute('theme', value);
  }

  set size(value) {
    this.setAttribute('size', value);
  }
}

if(!customElements.get('widget-button')) {
  customElements.define('widget-button', WidgetButton);
}