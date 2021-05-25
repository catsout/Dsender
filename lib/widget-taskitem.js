import './widget-progress.js';
import './widget-bytelabel.js';
import './widget-button.js';
import './widget-popover.js';
import { capitalize, ETaskStats } from '../common.js';

function timeShow(sec) {
  if(sec >= 216000)
    return '--:--:--';
  return (new Date(sec * 1000)).toISOString().substr(11, 8);
}

const getTaskActions = (function() {
  const downloading = ['pauseTask', 'deleteTask', 'removeTask'];
  const paused = ['resumeTask', 'deleteTask', 'removeTask'];
  const other = ['deleteTask', 'removeTask'];
  return function(tStats) {
    if(tStats === ETaskStats.downloading || tStats === ETaskStats.seeding)
      return downloading;
    else if(tStats === ETaskStats.paused)
      return paused;
    else return other;
  }
})();

export class WidgetTaskItem extends HTMLElement {

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
        <style>
          :host {
            --item-padding: 0;
            word-spacing: normal;
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
            font-size: 14px;
            color: #3F3F3F;
            margin-bottom: 3px;
          }
          #action {
            flex: 0 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0px 5px;
          }
          #action > * {
            margin: 5px;
          }
          .lineInfo {
            display: flex;
            font-size: 12px;
            color: #3F3F3F;
            user-select: none;
            margin: 3px 0px;
          }
          .lineInfo > :not(:first-child) {
            margin-left: 6px;
          }
          .expand {
            flex: 1;
          }
          .hidden {
            display: none;
          }
          .bold {
            font-weight: bold;
          }
          div[slot="popover"] > * {
            width: 100%;
          }
        </style>

        <div id="item">
          <div id="front"></div>

          <div id="info">
            <div id="name" class="bold"></div>
            <widget-progress id="progress"></widget-progress>
            <div class="lineInfo">`
              +'<span id="stats"></span>'
              +'<span id="percentage"></span>'
              +'<span id="timeleft"></span>'+`
                <div class=expand></div>
                <span id="dername"></span>
              </div>
            <div class="lineInfo">`
              +'<span><widget-bytelabel id="downLen"></widget-bytelabel>'
              +'<span>/</span>'
              +'<widget-bytelabel id="totalLen"></widget-bytelabel></span>'
              +'<div class="expand"></div>'
              +'<span class="bold">'
              +'<widget-bytelabel speed id="down"></widget-bytelabel> '
              +'<widget-bytelabel speed id="up"></widget-bytelabel>'
              +'</span>'
            + `</div>
          </div>
          <div id="action">
            <widget-button theme="icon" id="firstaction" action="removeTask"><img width="100%" src="../../assets/icons/delete.svg"></img></widget-button>
            <widget-popover id="popover" dir="bottomright">
              <widget-button theme="icon" id="morebtn" slot="content"><img height="100%" style="transform: rotate(90deg);" src="../../assets/icons/more.svg"></img></widget-button>
              <div slot="popover"></div>
            </widget-popover>
          </div>
        </div>
    `
    this.speed_down = shadowRoot.querySelector('#down');
    this.speed_up = shadowRoot.querySelector('#up');
    this.len_down = shadowRoot.querySelector('#downLen');
    this.len_total = shadowRoot.querySelector('#totalLen');

    this.progress = shadowRoot.querySelector('#progress');
    this.name = shadowRoot.querySelector('#name');

    this.dstats = shadowRoot.querySelector('#stats');
    this.dpercentage = shadowRoot.querySelector('#percentage');
    this.dtimeleft = shadowRoot.querySelector('#timeleft');
    this.ddername = shadowRoot.querySelector('#dername');

    this.dpopover = shadowRoot.querySelector('#popover');
    this.dpop_content = shadowRoot.querySelector('div[slot="popover"]');

    this.firstbtn = shadowRoot.querySelector('#firstaction');

    function getAverage() {
      let values = [];
      return function(v) {
        if(values.length >= 5)
          values.shift();
        values.push(v)
        return values.reduce((accumulator, currentValue) => accumulator + currentValue) / values.length;
      }
    }
    this._getAverDp = getAverage();
  }

  connectedCallback() {
    const self = this;
    function doAction(event) {
      const action = this.getAttribute('action');
      self[action](self._task);
    }
    this.firstbtn.addEventListener('click', doAction);
    this.shadowRoot.querySelector('#morebtn').addEventListener('click', (event) => {
      if(this.dpop_content.innerHTML === '') {
        const actions = getTaskActions(this._status.stats).slice(1);
        actions.forEach((el) => {
          const btn = document.createElement('widget-button');
          btn.innerHTML = el.replace('Task', '');
          btn.setAttribute('action', el);
          this.dpop_content.appendChild(btn);
          btn.addEventListener('click', doAction);
        });
      }
    });
    this.dpop_content.addEventListener('click', (event) => {
      this.dpopover.show = false;
    });
    this.dpopover.addUnshowCallback(() => {
      this.dpop_content.innerHTML = '';
    });
  }

  get task() {
    return this._task;
  }
  
  set task(task) {
    this._task = task;
    this.ddername.innerHTML = this._task.downloader;
  }

  set backport(port) {
    this._backport = port;
  }

  pauseTask() {
    this._backport.send({command: 'pauseTask', data: this._task});
  }
  resumeTask() {
    this._backport.send({command: 'resumeTask', data: this._task});
  }
  removeTask() {
    this.parentNode.removeChild(this);
    this._backport.send({command: 'removeTask', data: this._task});
  }
  deleteTask() {
    this.parentNode.removeChild(this);
    this._backport.send({command: 'deleteTask', data: this._task});
  }


  setActionButton(btn, action) {
    this.firstbtn.setAttribute('action', action);
    const img = btn.querySelector('img');
    if(action === 'pauseTask')
      img.src = '../../assets/icons/pause.svg';
    else if(action === 'resumeTask')
      img.src = '../../assets/icons/play.svg';
    else if(action === 'deleteTask')
      img.src = '../../assets/icons/delete.svg'
    else if(action === 'removeTask')
      img.src = '../../assets/icons/close.svg'

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

    this.dstats.innerHTML = capitalize(value.stats);
    this.progress.classList.toggle('hidden', value.stats === ETaskStats.error);

    if(value.totalLength) {
      this.len_down.value = value.downloadLength;
      this.len_total.value = value.totalLength;

      this.progress.max = value.totalLength;
      this.progress.value = value.downloadLength;

      this.dpercentage.innerHTML = Math.floor(value.downloadLength/value.totalLength*100) + '%';

      const averDp = this._getAverDp(value.downloadSpeed);
      const timeleft = (value.totalLength-value.downloadLength)/averDp;
      this.dtimeleft.classList.toggle('hidden', timeleft < 1);
      if(typeof(timeleft) === 'number' && timeleft >= 1)
        this.dtimeleft.innerHTML = ' ‧ ' + timeShow(timeleft);
    } else {
      this.progress.value = null;
      this.dpercentage.innerHTML = '--%';
    }
    this.name.innerHTML = value.name;

    const actions = getTaskActions(this._status.stats);
    this.setActionButton(this.firstbtn, actions[0]);
  }
}

if(!customElements.get('widget-taskitem')) {
  customElements.define('widget-taskitem', WidgetTaskItem);
}