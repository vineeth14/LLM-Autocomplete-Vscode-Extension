"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const log = fs.createWriteStream("/tmp/lsp.log");
exports.default = {
    write: (message) => {
        if (typeof message === "object") {
            log.write(JSON.stringify(message));
        }
        else {
            log.write(message);
        }
        log.write("\n");
    },
};
//# sourceMappingURL=log.js.map