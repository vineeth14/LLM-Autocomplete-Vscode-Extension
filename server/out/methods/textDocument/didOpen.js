"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.didOpen = void 0;
const documents_1 = require("../../documents");
const didOpen = (message) => {
    const params = message.params;
    documents_1.documents.set(params.textDocument.uri, params.textDocument.text);
};
exports.didOpen = didOpen;
//# sourceMappingURL=didOpen.js.map