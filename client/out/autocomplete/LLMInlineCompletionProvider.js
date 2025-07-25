"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMInlineCompletionProvider = void 0;
const vscode_1 = require("vscode");
const suggestion_1 = require("./suggestion");
const service_1 = require("./context/service");
const extension_1 = require("../extension");
class LLMInlineCompletionProvider {
    constructor() {
        this.lastTriggerTime = 0;
        this.debounceMs = 0;
        this.contextRetrievalService = new service_1.ContextRetrievalService();
        this.currentGenerator = null;
        this.previousGeneratorPrefix = null;
        this.previousCompletion = "";
        this.cache = new CompletionCache();
    }
    shouldReuseExistingGenerator(prefix) {
        if (!this.currentGenerator || !this.previousGeneratorPrefix) {
            return false;
        }
        // User backspaced
        if (this.previousGeneratorPrefix.length > prefix.length) {
            return false;
        }
        const generatedSoFar = this.previousGeneratorPrefix + this.previousCompletion;
        return generatedSoFar.startsWith(prefix);
    }
    async provideInlineCompletionItems(document, position, inlineContext, token) {
        try {
            const currentPrefix = document
                .lineAt(position)
                .text.substring(0, position.character);
            const cached = this.cache.get(currentPrefix);
            if (cached) {
                extension_1.log.appendLine(`[Cache] Hit`);
                return [
                    new vscode_1.InlineCompletionItem(cached, new vscode_1.Range(position, position)),
                ];
            }
            if (this.shouldReuseExistingGenerator(currentPrefix)) {
                extension_1.log.appendLine(`[Reuse] Generator reused`);
                const remainingCompletion = this.previousCompletion.substring(currentPrefix.length - this.previousGeneratorPrefix.length);
                if (remainingCompletion) {
                    return [
                        new vscode_1.InlineCompletionItem(remainingCompletion, new vscode_1.Range(position, position)),
                    ];
                }
            }
            // Cancel if we can't use existing generator
            if (this.currentGenerator) {
                this.currentGenerator = null;
                this.previousGeneratorPrefix = null;
                this.previousCompletion = "";
            }
            // Start new generator
            this.previousGeneratorPrefix = currentPrefix;
            const context = await this.contextRetrievalService.getContextForCompletion(document, position);
            // If context service returns empty context, skip completion
            if (!context.prefix && !context.suffix) {
                return [];
            }
            this.currentGenerator = (0, suggestion_1.getSuggestion)(context, token);
            const suggestion = await this.currentGenerator;
            if (!suggestion) {
                this.currentGenerator = null; // Clear failed generator
                return [];
            }
            // Clean the suggestion - remove any unwanted tokens
            this.previousCompletion = suggestion.trim();
            if (!this.previousCompletion) {
                this.currentGenerator = null; // Clear empty generator
                return [];
            }
            // Only cache valid completions
            this.cache.put(currentPrefix, this.previousCompletion);
            extension_1.log.appendLine(`[New] LLM completion cached`);
            // Clear generator after successful completion
            this.currentGenerator = null;
            const item = new vscode_1.InlineCompletionItem(this.previousCompletion, new vscode_1.Range(position, position));
            return [item];
        }
        catch (err) {
            // Clear all generator state on error
            this.currentGenerator = null;
            this.previousGeneratorPrefix = null;
            this.previousCompletion = "";
            if (err?.name !== "AbortError" &&
                !(token && token.isCancellationRequested)) {
                extension_1.log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
            }
            return [];
        }
    }
}
exports.LLMInlineCompletionProvider = LLMInlineCompletionProvider;
//# sourceMappingURL=LLMInlineCompletionProvider.js.map