import { Task } from "../common.js";


function _sendTask(task) {
    browser.notifications.create({
        "type": "basic",
        "title": 'Send',
        "iconUrl": '/assets/icon.svg',
        "message": `Send ${task.name} to ${task.downloader}`
    });
    return task;
}

function _error(reason) {
    browser.notifications.create({
        "type": "basic",
        "title": 'Error',
        "iconUrl": '/assets/icon.svg',
        "message": reason.toString()
    });
}

class Notify {
    /**
     * 
     * @param {Promise<Task>} pm 
     * @param {Boolean} cacheError
     * @returns {Promise}
     */
    static sendTask(pm, cacheError) {
        if(cacheError)
            return pm.then(_sendTask, _error);
        else
            return pm.then(_sendTask);
    }
}

export {Notify};