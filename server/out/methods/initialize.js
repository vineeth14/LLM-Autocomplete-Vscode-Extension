"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = void 0;
const initialize = (message) => {
    return {
        capabilities: { completionProvider: {} },
        serverInfo: {
            name: "llm-autocomplete",
            version: "0.0.1",
        },
    };
};
exports.initialize = initialize;
//# sourceMappingURL=initialize.js.map