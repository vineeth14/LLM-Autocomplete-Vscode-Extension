"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMInlineCompletionProvider = void 0;
const vscode_1 = require("vscode");
const suggestion_1 = require("./suggestion");
const context_1 = require("./context");
const extension_1 = require("../extension");
class LLMInlineCompletionProvider {
    constructor() {
        this.lastTriggerTime = 0;
        this.debounceMs = 0;
    }
    async provideInlineCompletionItems(document, position, inlineContext, token) {
        try {
            // const now = Date.now();
            // if (now - this.lastTriggerTime < this.debounceMs) {
            // 	log.appendLine(
            // 		`[LLMInlineCompletionProvider] Debounced (${
            // 			now - this.lastTriggerTime
            // 		}ms < ${this.debounceMs}ms)`
            // 	);
            // 	return [];
            // }
            // this.lastTriggerTime = now;
            const textBeforeCursor = document
                .lineAt(position)
                .text.substring(0, position.character);
            if (textBeforeCursor.length === 0) {
                return [];
            }
            const context = (0, context_1.getContext)(document, position);
            const suggestion = await (0, suggestion_1.getSuggestion)(context, token);
            if (!suggestion) {
                return [];
            }
            // Clean the suggestion - remove any unwanted tokens
            const cleanSuggestion = suggestion.trim();
            if (!cleanSuggestion) {
                return [];
            }
            const item = new vscode_1.InlineCompletionItem(cleanSuggestion, new vscode_1.Range(position, position));
            return [item];
        }
        catch (err) {
            if (err?.name !== "AbortError" && !(token && token.isCancellationRequested)) {
                extension_1.log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
            }
            return [];
        }
    }
}
exports.LLMInlineCompletionProvider = LLMInlineCompletionProvider;
//# sourceMappingURL=LLMInlineCompletionProvider.js.map