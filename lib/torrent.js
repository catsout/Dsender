import { sha1 } from './third/js-sha1.js';
import { decode } from '../lib/bencode.js';

const bInt = 0x69 // 'i'
const bDir = 0x64 // 'd'
const bList = 0x6C // 'l'

const bEnd = 0x65 // 'e'

/**
 * 
 * @param {Uint8Array} array 
 */
function genTorrentHash(array) {
    const tdecode = function(array) {
        return String.fromCharCode.apply(null, array);
    }
    let p = 1;
    while(array[p] != bEnd) {
        const r1 = decode(array, p, tdecode);
        const r2 = decode(array, r1.p+1, () => 'str');
        if(r1.v === 'info') {
            const start = r1.p+1;
            const end = r2.p;
            return sha1.hex(array.slice(start, end+1));
        }
        p = r2.p+1;
    }
    throw new Error('not valid torrent file');
}

export {genTorrentHash};