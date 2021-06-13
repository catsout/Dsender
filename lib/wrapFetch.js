
var oldFetch = fetch;
window.fetch = function(input, opts) {
    const fetchPromise = oldFetch(input, opts);
    const timeoutPromise = new Promise(function(resolve, reject){
        setTimeout(()=>{
             reject(new Error("fetch timeout"))
        }, opts.timeout || 30000);
    });
    return Promise.race([fetchPromise, timeoutPromise]);
}