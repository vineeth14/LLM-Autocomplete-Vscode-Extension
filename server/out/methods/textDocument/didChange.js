"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.didChange = void 0;
const documents_1 = require("../../documents");
const didChange = (message) => {
    const params = message.params;
    documents_1.documents.set(params.textDocument.uri, params.contentChanges[0].text);
};
exports.didChange = didChange;
//# sourceMappingURL=didChange.js.map