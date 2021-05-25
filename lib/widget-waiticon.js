class WidgetWaitIcon extends HTMLElement {
    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                height: 16px;
                width: 16px;
                position: relative;
            }
            div {
                position: absolute;
                top: 35%;
                width: 30%;
                height: 30%;
                border-radius: 50%;
                box-sizing: border-box;
                background-color: rgba(12, 12, 13, 0.6);
                
                animation-iteration-count: infinite;
                animation-name: span, move;
                animation-duration: 1s;
                animation-timing-function: linear;
            }

            @keyframes span {
                0%,50%,100% { width: 30%; }
                35%,85% { width: 40%; }
            }

            @keyframes move {
                from { left: 0; }
                50% { left: 70%;}
                to { left: 0;}
            }
            
            :host[ok] div {
                display: none;
            }
            :host[ok] {
                background-image: url(/assets/icons/success.svg);
                background-repeat: no-repeat;
                background-position: top;
                background-size: 100%;
            }
        </style>
        <div></div>
        `
    }
    
    connectedCallback() {
    }

    attributeChangedCallback (name, oldValue, newValue) {
    }
}

if(!customElements.get('widget-waiticon')){
    customElements.define('widget-waiticon', WidgetWaitIcon);
}