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

export class LLMInlineCompletionProvider {
	private lastTriggerTime: number = 0;
	private debounceMs: number = 100;
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
					new InlineCompletionItem(cached, new Range(position, position)),
				];
			}

			if (this.shouldReuseExistingGenerator(currentPrefix)) {
				const remainingCompletion = this.previousCompletion.substring(
					currentPrefix.length - this.previousGeneratorPrefix!.length
				);
				if (remainingCompletion) {
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

			const contextStart = performance.now();
			const context: Parameters =
				await this.contextRetrievalService.getContextForCompletion(
					document,
					position
				);
			const contextEnd = performance.now();

			// If context service returns empty context, skip completion
			if (!context.prefix && !context.suffix) {
				return [];
			}

			const suggestionStart = performance.now();
			this.currentGenerator = getSuggestion(context, token);
			const suggestion = await this.currentGenerator;
			const suggestionEnd = performance.now();

			if (!suggestion) {
				this.currentGenerator = null; // Clear failed generator
				return [];
			}

			this.previousCompletion = suggestion;

			// Log completion stats (safe for JSON-RPC)
			const lineCount = this.previousCompletion.split('\n').length;
			const charCount = this.previousCompletion.length;
			log.appendLine(`[Completion] ${lineCount} lines, ${charCount} chars`);

			// Only cache valid completions with unique key
			this.cache.put(cacheKey, this.previousCompletion);

			// Clear generator after successful completion
			this.currentGenerator = null;

			const item = new InlineCompletionItem(
				this.previousCompletion,
				new Range(position, position)
			);

			const totalEnd = performance.now();

			// Simple bottleneck analysis
			const contextTime = contextEnd - contextStart;
			const suggestionTime = suggestionEnd - suggestionStart;
			const totalTime = totalEnd - totalStart;

			log.appendLine(
				`[Bottleneck] Total: ${totalTime.toFixed(
					0
				)}ms | Context: ${contextTime.toFixed(
					0
				)}ms | LLM: ${suggestionTime.toFixed(0)}ms`
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
