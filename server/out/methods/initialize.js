"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = void 0;
// textDocumentSync:1 -> documents are synced by always sending the full content of the document
const initialize = (message) => {
    return {
        capabilities: {
            textDocumentSync: 1
        },
        serverInfo: {
            name: "llm-autocomplete",
            version: "0.0.1",
        },
    };
};
exports.initialize = initialize;
//# sourceMappingURL=initialize.js.map