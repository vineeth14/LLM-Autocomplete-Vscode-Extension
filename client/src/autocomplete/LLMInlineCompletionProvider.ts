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
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
		try {
			// Check cache FIRST - before any debouncing
			const currentPrefix = document
				.lineAt(position)
				.text.substring(0, position.character);

			const cacheKey = `${currentPrefix}:${document.offsetAt(position)}`;
			const cached = this.cache.get(cacheKey);

			if (cached) {
				log.appendLine(`[Cache Hit]`);

				return [
					new InlineCompletionItem(
						cached,
						new Range(position, position)
					),
				];
			}

			// Only debounce if cache miss - expensive operations ahead
			const shouldSkip = await this.debouncer.delayAndDebounce(300);

			if (shouldSkip) {
				return [];
			}

			if (this.shouldReuseExistingGenerator(currentPrefix)) {
				const remainingCompletion = this.previousCompletion.substring(
					currentPrefix.length - this.previousGeneratorPrefix!.length
				);
				if (remainingCompletion) {
					log.appendLine(`[Generator Reuse]`);
					return [
						new InlineCompletionItem(
							remainingCompletion,
							new Range(position, position)
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

			// Get context for completion using original context service
			const context: Parameters =
				await this.contextRetrievalService.getContextForCompletion(
					document,
					position
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

			this.previousCompletion = suggestion;

			// Log the LLM response for comparison
			log.appendLine("=== LLM RESPONSE ===");
			log.appendLine(suggestion);

			// Only cache valid completions with unique key
			this.cache.put(cacheKey, this.previousCompletion);

			// Clear generator after successful completion
			this.currentGenerator = null;

			const item = new InlineCompletionItem(
				this.previousCompletion,
				new Range(position, position)
			);

			log.appendLine(`[Completion] Generated`);

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
}
