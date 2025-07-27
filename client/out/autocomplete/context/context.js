"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = getContext;
const extension_1 = require("../../extension");
const MAX_CONTEXT_LINES = 40;
/**
 * @deprecated Use ContextRetrievalService.getContextForCompletion() instead
 * Legacy basic context extraction function
 */
function getContext(document, position) {
    extension_1.log.appendLine(`[getContext] Legacy function called at position line:${position.line}, char:${position.character}`);
    const text = document.getText();
    const offset = document.offsetAt(position);
    const prefix = text.substring(0, offset);
    const suffix = text.substring(offset);
    // Split into lines and take the last N lines of the prefix and first N lines of the suffix
    const prefixLines = prefix.split("\n");
    const suffixLines = suffix.split("\n");
    const limitedPrefix = prefixLines.slice(-MAX_CONTEXT_LINES).join("\n");
    const limitedSuffix = suffixLines.slice(0, MAX_CONTEXT_LINES).join("\n");
    return {
        prefix: limitedPrefix,
        suffix: limitedSuffix,
    };
}
//# sourceMappingURL=context.js.map