class DEventTarget {

    constructor() {
        this.et = new EventTarget();
    }

    addListener(func, type = 'event') {
        const handle = (event) => { func(...(event.detail)) };
        this.et.addEventListener(type, handle);
    }
    
    dispatchTypedEvent(type, ...args) {
        this.et.dispatchEvent(new CustomEvent(type, { detail: args }));
    }
    
    dispatch(...args) {
        this.dispatchTypedEvent('event', ...args);
    } 
}

export {DEventTarget};