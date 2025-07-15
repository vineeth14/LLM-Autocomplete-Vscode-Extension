"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completion = void 0;
const fs = require("fs");
const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
const items = words.map((word) => {
    return { label: word };
});
const completion = (message) => {
    return {
        isIncomplete: false,
        items,
    };
};
exports.completion = completion;
//# sourceMappingURL=completion.js.map