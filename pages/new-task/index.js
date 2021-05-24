import { DownloaderBase } from '../../lib/downloader-base.js';
import { MessagePort } from '../../lib/message.js';
import '../../lib/widget-button.js';
import '../../lib/widget-messagebar.js';


var dpageroute = parent.dpageroute;

var backport = new MessagePort();
backport.connect('request');

var selectDown = document.querySelector('#selectDown');
var selectType = document.querySelector('#selectType');
var msgbox = document.querySelector('widget-messagebox');


function updateSelectDown(downloaderList) {
  selectDown.innerHTML = '';
  downloaderList.forEach((el) => {
    let opt = document.createElement('option');
    let name = DownloaderBase.idToName(el);
    opt.value = name;
    opt.text = name;
    opt.id = name;
    selectDown.add(opt);
  });
}

document.querySelector('#submit').addEventListener('click', function(event) {
  if(selectType.value === 'link') {
    const path = document.querySelector('#path').value;
    document.querySelector('#textlink').value.split('\n').forEach((el) => {
      if(!el) return;
      backport.send({
        command: 'addTask',
        data: {
          url: el,
          downloader: selectDown.value,
          params: {
            dir: path
          }
        }
      }).then((v) => console.log(v));
    });
  }
});

browser.storage.local.get(['downloaderList']).then(item => {
  if(item.downloaderList) {
    updateSelectDown(item.downloaderList);
  }
});

selectType.addEventListener('input', function(event) {
  let id = event.target.value;
  let divs = document.querySelectorAll('.part');
  divs.forEach(function(el) {
      if(id === el.id) {
          el.classList.remove('hidden');
      } else 
          el.classList.add('hidden');
  });
  dpageroute.fitIframeHeight();
}) 


