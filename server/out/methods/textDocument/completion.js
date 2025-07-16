"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completion = void 0;
const documents_1 = require("../../documents");
const fs = require("fs");
const log_1 = require("../../log");
const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
const completion = (message) => {
    const params = message.params;
    const content = documents_1.documents.get(params.textDocument.uri);
    if (!content) {
        return null;
    }
    const currentLine = content.split("\n")[params.position.line]; // Splits the document into lines and gets the line where the cursor is.
    const lineUntilCursor = currentLine.slice(0, params.position.character); // Slices that line up to the cursor's character position.
    //extract the current word being typed (after the last non-word character).
    const currentPrefix = lineUntilCursor.replace(/.*\W(.*?)/, "$1");
    const items = words
        .filter((word) => {
        return word.startsWith(currentPrefix);
    })
        .slice(0, 1000)
        .map((word) => {
        return { label: word };
    });
    log_1.default.write({
        completion: { content, currentLine, lineUntilCursor, currentPrefix },
    });
    return {
        isIncomplete: true,
        items,
    };
};
exports.completion = completion;
//# sourceMappingURL=completion.js.map