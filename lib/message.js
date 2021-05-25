
class MessagePort {

    constructor() {
        this.msgpool = new Map();
        this._genid = this._generatorId();
        this.port = null;
    }

    get connected() {
        return typeof(this.port) !== 'null';
    }

    connect(name) {
        this.port = browser.runtime.connect({ name: name });
        this.port.onMessage.addListener((message) => {
            if(typeof(message.id) === 'number' && this.msgpool.has(message.id)) {
                const pobj = this.msgpool.get(message.id);
                if(typeof(message.error) !== 'undefined') {
                   pobj.reject(message.error); 
                }
                else pobj.resolve(message.message);
            }
        });
    }

    // return promise of response
    send(message, timeout) {
        if(!this.connected)
            throw new Error('port not connected');
        const id = this._genid();
        return new Promise((resolve, reject) => {
            this.msgpool.set(id, {resolve: resolve, reject: reject});
            setTimeout(() => {reject(new Error('timeout'));}, timeout||5000);
            return this.port.postMessage({id: id, message: message});
        }).then((result) => {
            this.msgpool.delete(id);
            return result;
        }, (reason) => {
            this.msgpool.delete(id);
            throw reason;
        });
    }

    _generatorId() {
        function* gen() {
            let id = 0;
            while(true) {
                yield id++;
            }
        }
        let g = gen();
        return () => g.next().value;
    }
}

export {MessagePort};