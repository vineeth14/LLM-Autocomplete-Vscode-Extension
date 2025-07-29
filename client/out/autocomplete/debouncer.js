"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestDebouncer = void 0;
const uuid_1 = require("uuid");
class RequestDebouncer {
    constructor() {
        this.currentRequestId = null;
        this.debounceTimeout = null;
    }
    async delayAndDebounce(debounceDelay) {
        const requestId = (0, uuid_1.v4)();
        this.currentRequestId = requestId;
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        return new Promise(resolve => {
            this.debounceTimeout = setTimeout(() => {
                const shouldSkip = this.currentRequestId !== requestId;
                resolve(shouldSkip);
            }, debounceDelay);
        });
    }
    cleanup() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }
        this.currentRequestId = null;
    }
}
exports.RequestDebouncer = RequestDebouncer;
//# sourceMappingURL=debouncer.js.map