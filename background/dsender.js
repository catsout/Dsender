import { TaskManager } from "./taskManager.js";

class Dsender {
    constructor() {
        this.tmgr = new TaskManager();
        this.tmgr.loadFromConf();
    }
}

export {Dsender};