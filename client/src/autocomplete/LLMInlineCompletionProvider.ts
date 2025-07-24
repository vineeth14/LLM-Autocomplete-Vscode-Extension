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

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		inlineContext: InlineCompletionContext,
		token: CancellationToken
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

			const textBeforeCursor = document
				.lineAt(position)
				.text.substring(0, position.character);

			const context: Parameters =
				await this.contextRetrievalService.getContextForCompletion(
					document,
					position
				);

			// If context service returns empty context, skip completion
			if (!context.prefix && !context.suffix) {
				return [];
			}

			const suggestion = await getSuggestion(context, token);

			if (!suggestion) {
				return [];
			}

			// Clean the suggestion - remove any unwanted tokens
			const cleanSuggestion = suggestion.trim();

			if (!cleanSuggestion) {
				return [];
			}

			const item = new InlineCompletionItem(
				cleanSuggestion,
				new Range(position, position)
			);
			return [item];
		} catch (err: any) {
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
