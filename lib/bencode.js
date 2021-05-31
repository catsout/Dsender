
const bInt = 0x69 // 'i'
const bDir = 0x64 // 'd'
const bList = 0x6C // 'l'
const bEnd = 0x65 // 'e'
const bStr = 0x3A // ':'

const invalid = 'Invalid data, parse out of range';

function decode(array, pos, tdecode) {
    if(pos >= array.length) throw new Error(invalid);
    const start = array[pos];
    switch(start) {
        case bInt:
            return decodeInt(array, pos);
        case bDir:
            return decodeDict(array, pos, tdecode);
        case bList:
            return decodeList(array, pos, tdecode);
        default:
            return decodeStr(array, pos, tdecode);
    }
}


function arrayToInt(array) {
    const str = String.fromCharCode.apply(null, array);
    const num = parseInt(str, 10);
    if(!Number.isSafeInteger(num)) throw new Error('Error parse number');
    return num;
}

function decodeInt(array, pos) {
    const end = array.indexOf(bEnd, pos);
    if(end === -1) throw new Error(invalid);
    const value = arrayToInt(array.slice(pos+1, end));
    return {v: value, p: end};
}

function decodeStr(array, pos, tdecode) {
    const sep = array.indexOf(bStr, pos);
    if(sep === -1) throw new Error(invalid);
    const len = arrayToInt(array.slice(pos, sep));
    const end = sep+1 + len;
    if(end > array.length) throw new Error(invalid);
    const value = tdecode(array.slice(sep+1, end));
    return {v: value, p: end-1};
}

function decodeList(array, pos, tdecode) {
    const result = [];
    let p = pos+1;
    while(array[p] !== bEnd) {
        const r = decode(array, p, tdecode);
        p = r.p+1;
        result.push(r.v);
    }
    return {v: result, p: p}; 
}

function decodeDict(array, pos, tdecode) {
    const result = {};
    let p = pos+1;
    while(array[p] !== bEnd) {
        const r1 = decode(array, p, tdecode);
        const r2 = decode(array, r1.p+1, tdecode);
        result[r1.v] = r2.v;
        p = r2.p+1;
    }
    return {v: result, p: p};
}

const bencode = {
    decode: function(array, encoding) {
        const tdecode = function(array) {
            try {
                return new TextDecoder(encoding||'utf-8', {fatal: true}).decode(array);
            } catch {
                return String.fromCharCode.apply(null, array);
            }
        }
        return decode(array, 0, tdecode).v;
    }
};

export {bencode};
export {decode};