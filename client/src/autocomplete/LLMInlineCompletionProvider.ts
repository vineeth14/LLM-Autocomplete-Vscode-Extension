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

export class LLMInlineCompletionProvider {
  private lastTriggerTime: number = 0;
  private debounceMs: number = 0;
  private contextRetrievalService = new ContextRetrievalService();
  private currentGenerator: any = null;
  private previousGeneratorPrefix: string | null = null;
  private previousCompletion: string = "";
  private cache = new CompletionCache();

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
    try {
      const currentPrefix = document
        .lineAt(position)
        .text.substring(0, position.character);

      const cached = this.cache.get(currentPrefix);
      if (cached) {
        log.appendLine(`[Cache] Hit`);
        return [
          new InlineCompletionItem(cached, new Range(position, position)),
        ];
      }

      if (this.shouldReuseExistingGenerator(currentPrefix)) {
        log.appendLine(`[Reuse] Generator reused`);
        const remainingCompletion = this.previousCompletion.substring(
          currentPrefix.length - this.previousGeneratorPrefix!.length,
        );
        if (remainingCompletion) {
          return [
            new InlineCompletionItem(
              remainingCompletion,
              new Range(position, position),
            ),
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

      const context: Parameters =
        await this.contextRetrievalService.getContextForCompletion(
          document,
          position,
        );

      // If context service returns empty context, skip completion
      if (!context.prefix && !context.suffix) {
        return [];
      }

      this.currentGenerator = getSuggestion(context, token);
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
      log.appendLine(`[New] LLM completion cached`);
      
      // Clear generator after successful completion
      this.currentGenerator = null;

      const item = new InlineCompletionItem(
        this.previousCompletion,
        new Range(position, position),
      );
      return [item];
    } catch (err: any) {
      // Clear all generator state on error
      this.currentGenerator = null;
      this.previousGeneratorPrefix = null;
      this.previousCompletion = "";
      
      if (
        err?.name !== "AbortError" &&
        !(token && token.isCancellationRequested)
      ) {
        log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
      }
      return [];
    }
  }
}
