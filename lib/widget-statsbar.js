const attrs = ['heighGroup', 'middleGroup', 'lowGroup', 'noGroup'];

export class WidgetStatsBar extends HTMLElement {

  static get observedAttributes() {
    return attrs.map((el) => el.toLocaleLowerCase());
  }
 
  constructor() {
    super();

    let shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
        <style>
            :host([hidden]) {
              display: none !important;
            }
            :host {
              display: inline-block;
              --item-size: 15px;

              text-align: left;
              max-width: 100%;
              max-height: min(100%, calc(var(--item-size) + 4px)*2);
              overflow: hidden;
            }
            #container {
              line-height: 0;
              vertical-align: middle;
              white-space: normal;
            }
            .stats {
              display: inline-block;
              margin: 2px;
              height: calc(var(--item-size) - 2px);
              width: calc(var(--item-size) - 2px);
              border: 1px solid black;
              border-radius: 100%;
              transition: background-color 0.1s linear;
            }

            .stats[stats="heigh"] {
              background-color: #30e60b;
            }

            .stats[stats="middle"] {
              background-color: orange;
            }

            .stats[stats="low"] {
              background-color: red;
            }

            .stats[stats="no"] {
              background-color: gray;
            }
        </style>`
        +'<template id="tItem">'
          +'<div stats="no" class="stats"></div>'
        +'</template>'
        +`<div id="container"></div>
    `;
    this.dtItem = shadowRoot.querySelector("#tItem");
    this.dcontainer = shadowRoot.querySelector("#container");
    this.gMap = new Map();
    this.ditmes = [];
  }

  connectedCallback() {
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const type = name.split('group')[0];
    if(oldValue) {
      oldValue.split(' ').forEach(el => {
        this.gMap.delete(el);
      });
    }
    newValue.split(' ').forEach(el => {
      this.gMap.set(el, type);
    });
  }

  attachStatsList(statsList) {
    while(statsList.length > this.ditmes.length) {
      const t = this.dtItem.content.cloneNode(true);
      this.ditmes.push(t.firstElementChild);
      this.dcontainer.appendChild(t);
    }
    while(statsList.length < this.ditmes.length) {
      this.dcontainer.removeChild(this.ditmes.pop());
    }
    for(let i=0;i<statsList.length;i++) {
      const stats = this.gMap.get(statsList[i]) || 'no';
      this.ditmes[i].setAttribute('stats', stats);
    }
  }
}

if(!customElements.get('widget-statsbar')) {
  customElements.define('widget-statsbar', WidgetStatsBar);
}