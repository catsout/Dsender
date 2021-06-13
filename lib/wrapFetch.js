
var oldFetch = fetch;
window.fetch = function(input, opts) {
    const fetchPromise = oldFetch(input, opts);
    const timeoutPromise = new Promise(function(resolve, reject){
        const timeout = opts && opts.hasOwnProperty('timeout') ? opts.timeout : 30000;
        setTimeout(()=>{
             reject(new Error("fetch timeout"))
        }, timeout);
    });
    return Promise.race([fetchPromise, timeoutPromise]);
}