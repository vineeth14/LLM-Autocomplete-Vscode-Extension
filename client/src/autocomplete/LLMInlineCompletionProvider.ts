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

  private shouldReuseExistingGenerator(prefix: string): boolean {
    if (!this.currentGenerator || !this.previousGeneratorPrefix) {
      return false;
    }
    // User backspaced
    if (this.previousGeneratorPrefix.length > prefix.length) {
      log.appendLine(`[Reuse] User backspaced`);
      return false;
    }
    const generatedSoFar = this.previousGeneratorPrefix + this.previousCompletion;
    const canReuse = generatedSoFar.startsWith(prefix);
    log.appendLine(`[Reuse] ${canReuse ? 'Reusing' : 'New'} - "${generatedSoFar}" vs "${prefix}"`);
    return canReuse;
  }
  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    inlineContext: InlineCompletionContext,
    token: CancellationToken,
  ): Promise<InlineCompletionItem[]> {
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

      log.appendLine(`[Main] Checking reuse for prefix: "${currentPrefix}"`);
      if (this.shouldReuseExistingGenerator(currentPrefix)) {
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
        return [];
      }

      // Clean the suggestion - remove any unwanted tokens
      this.previousCompletion = suggestion.trim();

      if (!this.previousCompletion) {
        return [];
      }

      const item = new InlineCompletionItem(
        this.previousCompletion,
        new Range(position, position),
      );
      return [item];
    } catch (err: any) {
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
