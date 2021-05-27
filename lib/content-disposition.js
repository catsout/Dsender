

function parseRFC5987(value) {
    const parts = value.split('\'');
    if (parts.length !== 3) return null;
    try {
        if (['utf-8', 'utf8'].includes(parts[0].toLowerCase()))
            return decodeURIComponent(parts[2]);
        const arr = (parts[2].match(/%[0-9a-fA-F]{2}|./g) || [])
            .map(v => v.length === 3 ? parseInt(v.slice(1), 16) : v.charCodeAt(0))
            .filter(v => v <= 255);
        return (new TextDecoder(parts[0])).decode(Uint8Array.from(arr))
    } catch { return null }
}


/**
 * 
 * @param {String} contentDisposition 
 * @return {String|null, String|null}
 */
export function parseContentDisposition(contentDisposition) {
    console.log(contentDisposition);
    const refilename = /^\s*filename(\*?)\s*=\s*("[^"]+"|[^']+'[^']*'[^\s;]+|[^\s;]+)/i;
    const retype = /^\s*([^\s;]+)\s*;?/i;
    const matchType = retype.exec(contentDisposition);
    if(!matchType) return {type: null, filename: null};
    const [prefix, type] = matchType;

    let filenames = contentDisposition.slice(prefix.length);
    const match = refilename.exec(filenames);

    let filename = null;
    for(let f=null ; f = refilename.exec(filenames) ; filenames = filenames.slice(f[0].length)) {
        console.log(f);
        const is5987 = f[1] === '*';
        let value = f[2];
        if(value.startsWith('"')) value = value.slice(1);
        if(value.endsWith('"')) value = value.slice(0, -1);
        if(is5987) {
            filename = parseRFC5987(value);
            if(filename !== null) break;
        } else {
            try {
                filename = decodeURIComponent(value);
            } catch {
                filename = value;
            }
        }
    }
    return {type, filename};
}