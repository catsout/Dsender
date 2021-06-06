

function parseRFC5987(value) {
    const parts = value.split('\'');
    if (parts.length !== 3) return null;
    const [charset, language, chars] = parts;
    try {
        //if (['utf-8', 'utf8'].includes(charset.toLowerCase()))
        //    return decodeURIComponent(chars);

        const arr = (chars.match(/%[0-9a-fA-F]{2}|./g) || [])
            .map(v => v.length === 3 ? parseInt(v.slice(1), 16) : v.charCodeAt(0))
            .filter(v => v <= 255);
        return (new TextDecoder(charset, {fatal: true})).decode(Uint8Array.from(arr))
    } catch { return null }
}

function decodeISO8859_1AsCharset(str) {
    const codeUnits = new Uint8Array(str.length);
    const encoding = document.characterSet || 'UTF-8';
    for(let i=0;i<codeUnits.length;i++) {
        const v = str.charCodeAt(i);
        if(v >= 256) return null;
        codeUnits[i] = v;
    }
    try {
        return new TextDecoder(encoding, {fatal: true}).decode(codeUnits);
    } catch { 
        return null;
    }
}

/**
 * 
 * @param {String} contentDisposition 
 * @return {String|null, String|null}
 */
export function parseContentDisposition(contentDisposition) {
    const refilename = /^[\s;]*filename(\*?)\s*=\s*("[^"]+"|[^'\s;]+'[^';]*'[^\s;]+|[^\s;]+)/i;
    const retype = /^\s*([^\s;]+)\s*;?/i;
    const matchType = retype.exec(contentDisposition);
    if(!matchType) return {type: null, filename: null};
    const [prefix, type] = matchType;

    let filenames = contentDisposition.slice(prefix.length);

    let filename = null;
    for(let f=null ; f = refilename.exec(filenames) ; filenames = filenames.slice(f[0].length)) {
        const is5987 = f[1] === '*';
        let value = f[2].trim();
        if(value.startsWith('"')) value = value.slice(1);
        if(value.endsWith('"')) value = value.slice(0, -1);
        if(is5987) {
            const name_5987 = parseRFC5987(value);
            if(name_5987) {
                filename = name_5987;
                break;  // break if any valid
            }
        } else {
            try {
                const urldecode = decodeURIComponent(value);
                // check is urlencode
                if(urldecode !== value)
                    filename = urldecode; 
            } catch {}
            if(!filename)
                filename = decodeISO8859_1AsCharset(value) || value;
        }
    }
    return {type, filename};
}