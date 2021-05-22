function magnetUrlDecode(url) {
    const datastr = url.split('magnet:?')[1];
    const data = datastr ? datastr.split('&') : [];
    const result = {};
    data.forEach(el => {
        const [key, value] = el.split('=');
        if(key === 'tr') {
            if(!result.tr)
                result.tr = [];
            result.tr.push(decodeURIComponent(value));
        } else
            result[key] = value;
    });
    return result;
}

export {magnetUrlDecode};