import './widget-progress.js';
import './widget-bytelabel.js';
import './widget-button.js';
import { capitalize, ETaskStats } from '../common.js';

export class WidgetTaskItem extends HTMLElement {

  constructor() {
    super();

    let shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
        <style>
          :host {
            --item-padding: 0;
          }
          :host([hidden]) {
            display: none !important;
          }
          #item {
            padding: var(--item-padding);
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: center;
          }
          #info {
            flex: auto;
            min-width: 10px;
            overflow: hidden !important;
          }
          #name {
            white-space: nowrap;
            overflow: hidden !important;
            text-overflow: ellipsis;
            font-size: 16px;
            color: #3F3F3F;
            margin-top: 2px;
          }
          #action {
            flex: 0 0 60px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .lineInfo {
            font-size: 11px;
            color: #3F3F3F;
            user-select: none;
          }
          .lineInfo > * {
            margin-top: 5px;
            margin-bottom: 5px;
          }
          #progress {
            margin-top: 5px;
            margin-bottom: 5px;
          }
          .hidden {
            display: none;
          }
          .bold {
            font-weight: bold;
          }
        </style>
        <div id="item">
          <div id="front"></div>

          <div id="info">
            <div id="name" class="bold"></div>
            <widget-progress id="progress"></widget-progress>
            <div class="lineInfo">`
              +'<span id="status"></span>'
              +'<span> ‧ </span>'
              +'<span id="percentage"></span>'
            +`</div>
            <div class="lineInfo">`
              +'<widget-bytelabel id="downLen"></widget-bytelabel>'
              +'<span>/</span>'
              +'<widget-bytelabel id="totalLen"></widget-bytelabel>'
              +'<span> ‧ </span>'
              +'<span class="bold">'
              +'<widget-bytelabel speed id="down"></widget-bytelabel> '
              +'<widget-bytelabel speed id="up"></widget-bytelabel>'
              +'</span>'
            + `</div>
          </div>
          <div id="action">
            <widget-button theme="icon" class="deletebtn"><img width="100%" src="../../assets/icons/delete.svg"></img></widget-button>
          </div>
        </div>
    `
    this.speed_down = this.shadowRoot.querySelector('#down');
    this.speed_up = this.shadowRoot.querySelector('#up');
    this.len_down = this.shadowRoot.querySelector('#downLen');
    this.len_total = this.shadowRoot.querySelector('#totalLen');

    this.progress = this.shadowRoot.querySelector('#progress');
    this.name = this.shadowRoot.querySelector('#name');

    this.dstatus = this.shadowRoot.querySelector('#status');
    this.dpercentage = this.shadowRoot.querySelector('#percentage');
    this.button = this.shadowRoot.querySelector('widget-button');
    this.button.addEventListener('click', (event) => {
      this._taskapi.removeTask(this._task);
      console.log(this);
    });
  }

  get task() {
    return this._task;
  }
  
  set task(task) {
    this._task = task;
  }

  set taskapi(api) {
    this._taskapi = api;
  }

  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;

    this.speed_up.classList.toggle("hidden", typeof(value.uploadSpeed) != 'number');
    this.speed_up.value = value.uploadSpeed;

    this.speed_down.classList.toggle("hidden", typeof(value.downloadSpeed) != 'number');
    this.speed_down.value = value.downloadSpeed;

    this.dstatus.innerHTML = capitalize(value.stats);
    this.progress.classList.toggle('hidden', value.stats === ETaskStats.error);

    if(value.totalLength) {
      this.len_down.value = value.downloadLength;
      this.len_total.value = value.totalLength;

      this.progress.max = value.totalLength;
      this.progress.value = value.downloadLength;

      this.dpercentage.innerHTML = Math.floor(value.downloadLength/value.totalLength*100) + '%';
    } else {
      this.progress.value = null;
      this.dpercentage.innerHTML = '--%';
    }
    this.name.innerHTML = value.name;
  }
}

if(!customElements.get('widget-taskitem')) {
  customElements.define('widget-taskitem', WidgetTaskItem);
}