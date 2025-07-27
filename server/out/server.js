"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const initialize_1 = require("./methods/initialize");
const methodLookup = {
    initialize: initialize_1.initialize,
};
// Write a json rpc message to client
const respond = (id, result) => {
    const message = JSON.stringify({ id, result });
    const messageLength = Buffer.byteLength(message, "utf-8");
    const header = `Content-Length: ${messageLength}\r\n\r\n`;
    log_1.default.write(header + message); //Write to log
    process.stdout.write(header + message); // Send json rpc method to client
};
let buffer = "";
process.stdin.on("data", (chunk) => {
    buffer += chunk;
    while (true) {
        const lengthMatch = buffer.match(/Content-Length: (\d+)\r\n/);
        if (!lengthMatch)
            break;
        const contentLength = parseInt(lengthMatch[1], 10);
        const messageStart = buffer.indexOf("\r\n\r\n") + 4;
        //break if the full message is not in buffer
        if (buffer.length < messageStart + contentLength)
            break;
        const rawMessage = buffer.slice(messageStart, messageStart + contentLength);
        let message;
        try {
            message = JSON.parse(rawMessage);
        }
        catch (error) {
            log_1.default.write(`JSON Parse Error: ${error}. Raw message: "${rawMessage}"`);
            // Skip this malformed message and continue
            buffer = buffer.slice(messageStart + contentLength);
            continue;
        }
        log_1.default.write({
            id: message.id,
            method: message.method,
        });
        const method = methodLookup[message.method];
        if (method) {
            const result = method(message);
            if (result !== undefined) {
                respond(message.id, result);
            }
        }
        else {
            // Log unhandled methods but don't crash
            log_1.default.write(`Unhandled LSP method: ${message.method}`);
            // For requests (with id), send empty response to avoid client hanging
            if (message.id !== undefined) {
                respond(message.id, null);
            }
        }
        //Remove processed message from buffer
        buffer = buffer.slice(messageStart + contentLength);
    }
});
// ===== UNUSED CODE - LEGACY LSP COMPLETION METHODS =====
// The following imports and method references are unused as the extension
// uses inline completion via Ollama instead of LSP completion
// import { completion } from "./methods/textDocument/completion";
// import { didChange } from "./methods/textDocument/didChange";
// The completion method would be added to methodLookup if LSP completion was used:
// const methodLookup: Record<string, RequestMethod | NotificationMethod> = {
//   initialize,
//   "textDocument/completion": completion,
//   "textDocument/didChange": didChange,
// };
//# sourceMappingURL=server.js.map