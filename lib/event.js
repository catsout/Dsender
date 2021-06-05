class DEventTarget {

    static ETYPE_DEFAULT = 'event';

    constructor() {
        this.et = new EventTarget();
    }

    addListener(func, type = DEventTarget.ETYPE_DEFAULT) {
        const handle = (event) => { func(...(event.detail)) };
        this.et.addEventListener(type, handle);
    }
    
    dispatchTypedEvent(type, ...args) {
        this.et.dispatchEvent(new CustomEvent(type, { detail: args }));
    }
    
    dispatch(...args) {
        this.dispatchTypedEvent(DEventTarget.ETYPE_DEFAULT, ...args);
    } 
}

export {DEventTarget};