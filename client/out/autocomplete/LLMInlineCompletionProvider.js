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
    }
    shouldReuseExistingGenerator(prefix) {
        if (!this.currentGenerator || !this.previousGeneratorPrefix) {
            return false;
        }
        // User backspaced
        if (this.previousGeneratorPrefix.length > prefix.length) {
            extension_1.log.appendLine(`[Reuse] User backspaced`);
            return false;
        }
        const generatedSoFar = this.previousGeneratorPrefix + this.previousCompletion;
        const canReuse = generatedSoFar.startsWith(prefix);
        extension_1.log.appendLine(`[Reuse] ${canReuse ? 'Reusing' : 'New'} - "${generatedSoFar}" vs "${prefix}"`);
        return canReuse;
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
            const currentPrefix = document
                .lineAt(position)
                .text.substring(0, position.character);
            extension_1.log.appendLine(`[Main] Checking reuse for prefix: "${currentPrefix}"`);
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
            const context = await this.contextRetrievalService.getContextForCompletion(document, position);
            // If context service returns empty context, skip completion
            if (!context.prefix && !context.suffix) {
                return [];
            }
            this.currentGenerator = (0, suggestion_1.getSuggestion)(context, token);
            const suggestion = await this.currentGenerator;
            if (!suggestion) {
                return [];
            }
            // Clean the suggestion - remove any unwanted tokens
            this.previousCompletion = suggestion.trim();
            if (!this.previousCompletion) {
                return [];
            }
            const item = new vscode_1.InlineCompletionItem(this.previousCompletion, new vscode_1.Range(position, position));
            return [item];
        }
        catch (err) {
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