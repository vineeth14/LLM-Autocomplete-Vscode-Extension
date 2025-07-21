import {
	InlineCompletionItem,
	Range,
	TextDocument,
	Position,
	InlineCompletionContext,
	CancellationToken,
} from "vscode";
import { getSuggestion } from "./suggestion";
import { getContext } from "./context";
import { log } from "../extension";

export class LLMInlineCompletionProvider {
	private lastTriggerTime: number = 0;
	private debounceMs: number = 0;

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		inlineContext: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
		try {
			log.appendLine(`[LLMInlineCompletionProvider] Triggered at line:${position.line}, char:${position.character}`);
			
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
			
			log.appendLine(`[LLMInlineCompletionProvider] Text before cursor: "${textBeforeCursor}"`);
			
			if (textBeforeCursor.length === 0) {
				log.appendLine(`[LLMInlineCompletionProvider] No text before cursor, skipping`);
				return [];
			}

			const context = getContext(document, position);
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
			if (err?.name !== "AbortError" && !(token && token.isCancellationRequested)) {
				log.appendLine(`[AutoComplete] Error: ${err?.message || err}`);
			}
			return [];
		}
	}
}
