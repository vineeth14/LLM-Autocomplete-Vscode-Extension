"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMInlineCompletionProvider = void 0;
const vscode_1 = require("vscode");
const suggestion_1 = require("./suggestion");
const service_1 = require("./context/service");
const extension_1 = require("../extension");
const cache_1 = require("./context/cache");
class LLMInlineCompletionProvider {
    constructor() {
        this.lastTriggerTime = 0;
        this.debounceMs = 100;
        this.contextRetrievalService = new service_1.ContextRetrievalService();
        this.currentGenerator = null;
        this.previousGeneratorPrefix = null;
        this.previousCompletion = "";
        this.cache = new cache_1.CompletionCache();
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
        const totalStart = performance.now();
        try {
            // Debouncing check
            const now = Date.now();
            if (now - this.lastTriggerTime < this.debounceMs) {
                return [];
            }
            this.lastTriggerTime = now;
            const currentPrefix = document
                .lineAt(position)
                .text.substring(0, position.character);
            // Create unique cache key with file position to avoid wrong cache hits
            const cacheKey = `${currentPrefix}:${document.offsetAt(position)}`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return [
                    new vscode_1.InlineCompletionItem(cached, new vscode_1.Range(position, position)),
                ];
            }
            if (this.shouldReuseExistingGenerator(currentPrefix)) {
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
            const contextStart = performance.now();
            const context = await this.contextRetrievalService.getContextForCompletion(document, position);
            const contextEnd = performance.now();
            // If context service returns empty context, skip completion
            if (!context.prefix && !context.suffix) {
                return [];
            }
            const suggestionStart = performance.now();
            this.currentGenerator = (0, suggestion_1.getSuggestion)(context, token);
            const suggestion = await this.currentGenerator;
            const suggestionEnd = performance.now();
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
            // Log completion stats (safe for JSON-RPC)
            const lineCount = this.previousCompletion.split('\n').length;
            const charCount = this.previousCompletion.length;
            extension_1.log.appendLine(`[Completion] ${lineCount} lines, ${charCount} chars`);
            // Only cache valid completions with unique key
            this.cache.put(cacheKey, this.previousCompletion);
            // Clear generator after successful completion
            this.currentGenerator = null;
            const item = new vscode_1.InlineCompletionItem(this.previousCompletion, new vscode_1.Range(position, position));
            const totalEnd = performance.now();
            // Simple bottleneck analysis
            const contextTime = contextEnd - contextStart;
            const suggestionTime = suggestionEnd - suggestionStart;
            const totalTime = totalEnd - totalStart;
            extension_1.log.appendLine(`[Bottleneck] Total: ${totalTime.toFixed(0)}ms | Context: ${contextTime.toFixed(0)}ms | LLM: ${suggestionTime.toFixed(0)}ms`);
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