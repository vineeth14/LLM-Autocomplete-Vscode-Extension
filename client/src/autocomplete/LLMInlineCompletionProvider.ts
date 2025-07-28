import {
  InlineCompletionItem,
  Range,
  TextDocument,
  Position,
  InlineCompletionContext,
  CancellationToken,
} from "vscode";
import { getSuggestion } from "./suggestion";
import { ContextRetrievalService } from "./context/service";
import { Parameters } from "./types";
import { log } from "../extension";
import { CompletionCache } from "./context/cache";
import { RequestDebouncer } from "./debouncer";

export class LLMInlineCompletionProvider {
  private debouncer = new RequestDebouncer();
  private contextRetrievalService = new ContextRetrievalService();
  private currentGenerator: any = null;
  private previousGeneratorPrefix: string | null = null;
  private previousCompletion: string = "";
  private cache = new CompletionCache();
  private lastTimingBreakdown: any = null;

  private shouldReuseExistingGenerator(prefix: string): boolean {
    if (!this.currentGenerator || !this.previousGeneratorPrefix) {
      return false;
    }
    // User backspaced
    if (this.previousGeneratorPrefix.length > prefix.length) {
      return false;
    }
    const generatedSoFar =
      this.previousGeneratorPrefix + this.previousCompletion;
    return generatedSoFar.startsWith(prefix);
  }

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    inlineContext: InlineCompletionContext,
    token: CancellationToken,
  ): Promise<InlineCompletionItem[]> {
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
        log.appendLine(`[Cache Hit] User saw result in ${userLatency.toFixed(0)}ms (instant)`);
        
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
          new InlineCompletionItem(cached, new Range(position, position)),
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
        const remainingCompletion = this.previousCompletion.substring(
          currentPrefix.length - this.previousGeneratorPrefix!.length,
        );
        if (remainingCompletion) {
          const userLatency = performance.now() - userPerceptionStart;
          log.appendLine(`[Generator Reuse] User saw result in ${userLatency.toFixed(0)}ms`);
          return [
            new InlineCompletionItem(
              remainingCompletion,
              new Range(position, position),
            ),
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
      const context: Parameters =
        await this.contextRetrievalService.getContextForCompletion(
          document,
          position,
        );
      const contextEnd = performance.now();

      // If context service returns empty context, skip completion
      if (!context.prefix && !context.suffix) {
        return [];
      }

      const networkStart = performance.now();
      this.currentGenerator = getSuggestion(context, token);
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
      log.appendLine(`[Completion] ${lineCount} lines, ${charCount} chars`);

      const cachingStart = performance.now();
      // Only cache valid completions with unique key
      this.cache.put(cacheKey, this.previousCompletion);
      const cachingEnd = performance.now();

      // Clear generator after successful completion
      this.currentGenerator = null;

      const item = new InlineCompletionItem(
        this.previousCompletion,
        new Range(position, position),
      );

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

      log.appendLine(
        `[Timing] Debounce: ${debounceTime.toFixed(0)}ms | Cache: ${cacheTime.toFixed(0)}ms | Context: ${contextTime.toFixed(0)}ms | Network: ${networkTime.toFixed(0)}ms | Caching: ${cachingTime.toFixed(0)}ms`
      );
      
      log.appendLine(
        `[User Latency] ${userLatency.toFixed(0)}ms (perceived after stopping typing)`
      );

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
    } catch (err: any) {
      // Clear all generator state on error
      this.currentGenerator = null;
      this.previousGeneratorPrefix = null;
      this.previousCompletion = "";
      this.debouncer.cleanup();

      if (
        err?.name !== "AbortError" &&
        !(token && token.isCancellationRequested)
      ) {
        log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
      }
      return [];
    }
  }

  getLastTimingBreakdown() {
    return this.lastTimingBreakdown;
  }
}
