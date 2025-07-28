"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMInlineCompletionProvider = void 0;
const vscode_1 = require("vscode");
const suggestion_1 = require("./suggestion");
const service_1 = require("./context/service");
const extension_1 = require("../extension");
const cache_1 = require("./context/cache");
const debouncer_1 = require("./debouncer");
class LLMInlineCompletionProvider {
    constructor() {
        this.debouncer = new debouncer_1.RequestDebouncer();
        this.contextRetrievalService = new service_1.ContextRetrievalService();
        this.currentGenerator = null;
        this.previousGeneratorPrefix = null;
        this.previousCompletion = "";
        this.cache = new cache_1.CompletionCache();
        this.lastTimingBreakdown = null;
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
            // Check cache FIRST - before any debouncing
            const cacheStart = performance.now();
            const currentPrefix = document
                .lineAt(position)
                .text.substring(0, position.character);
            // Create unique cache key with file position to avoid wrong cache hits
            const cacheKey = `${currentPrefix}:${document.offsetAt(position)}`;
            const cached = this.cache.get(cacheKey);
            const cacheEnd = performance.now();
            if (cached) {
                const userLatency = performance.now() - totalStart;
                extension_1.log.appendLine(`[Cache Hit] User saw result in ${userLatency.toFixed(0)}ms (instant)`);
                // Store timing breakdown for instant cache hits
                this.lastTimingBreakdown = {
                    debounce: 0,
                    cache: cacheEnd - cacheStart,
                    context: 0,
                    network: 0,
                    caching: 0,
                    userPerceived: userLatency,
                };
                return [
                    new vscode_1.InlineCompletionItem(cached, new vscode_1.Range(position, position)),
                ];
            }
            // Only debounce if cache miss - expensive operations ahead
            const debounceStart = performance.now();
            const shouldSkip = await this.debouncer.delayAndDebounce(300);
            const debounceEnd = performance.now();
            if (shouldSkip) {
                return [];
            }
            // User perception starts AFTER debounce - when they've stopped typing
            const userPerceptionStart = performance.now();
            const reuseStart = performance.now();
            if (this.shouldReuseExistingGenerator(currentPrefix)) {
                const remainingCompletion = this.previousCompletion.substring(currentPrefix.length - this.previousGeneratorPrefix.length);
                if (remainingCompletion) {
                    const userLatency = performance.now() - userPerceptionStart;
                    extension_1.log.appendLine(`[Generator Reuse] User saw result in ${userLatency.toFixed(0)}ms`);
                    return [
                        new vscode_1.InlineCompletionItem(remainingCompletion, new vscode_1.Range(position, position)),
                    ];
                }
            }
            const reuseEnd = performance.now();
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
            const networkStart = performance.now();
            this.currentGenerator = (0, suggestion_1.getSuggestion)(context, token);
            const suggestion = await this.currentGenerator;
            const networkEnd = performance.now();
            if (!suggestion) {
                this.currentGenerator = null; // Clear failed generator
                return [];
            }
            this.previousCompletion = suggestion;
            // Log completion stats (safe for JSON-RPC)
            const lineCount = this.previousCompletion.split("\n").length;
            const charCount = this.previousCompletion.length;
            extension_1.log.appendLine(`[Completion] ${lineCount} lines, ${charCount} chars`);
            const cachingStart = performance.now();
            // Only cache valid completions with unique key
            this.cache.put(cacheKey, this.previousCompletion);
            const cachingEnd = performance.now();
            // Clear generator after successful completion
            this.currentGenerator = null;
            const item = new vscode_1.InlineCompletionItem(this.previousCompletion, new vscode_1.Range(position, position));
            const totalEnd = performance.now();
            const userLatency = totalEnd - userPerceptionStart;
            // Granular timing breakdown
            const debounceTime = debounceEnd - debounceStart;
            const cacheTime = cacheEnd - cacheStart;
            const reuseTime = reuseEnd - reuseStart;
            const contextTime = contextEnd - contextStart;
            const networkTime = networkEnd - networkStart;
            const cachingTime = cachingEnd - cachingStart;
            const totalTime = totalEnd - totalStart;
            extension_1.log.appendLine(`[Timing] Debounce: ${debounceTime.toFixed(0)}ms | Cache: ${cacheTime.toFixed(0)}ms | Context: ${contextTime.toFixed(0)}ms | Network: ${networkTime.toFixed(0)}ms | Caching: ${cachingTime.toFixed(0)}ms`);
            extension_1.log.appendLine(`[User Latency] ${userLatency.toFixed(0)}ms (perceived after stopping typing)`);
            // Store timing breakdown for testing
            this.lastTimingBreakdown = {
                debounce: debounceTime,
                cache: cacheTime,
                context: contextTime,
                network: networkTime,
                caching: cachingTime,
                userPerceived: userLatency,
            };
            return [item];
        }
        catch (err) {
            // Clear all generator state on error
            this.currentGenerator = null;
            this.previousGeneratorPrefix = null;
            this.previousCompletion = "";
            this.debouncer.cleanup();
            if (err?.name !== "AbortError" &&
                !(token && token.isCancellationRequested)) {
                extension_1.log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
            }
            return [];
        }
    }
    getLastTimingBreakdown() {
        return this.lastTimingBreakdown;
    }
}
exports.LLMInlineCompletionProvider = LLMInlineCompletionProvider;
//# sourceMappingURL=LLMInlineCompletionProvider.js.map