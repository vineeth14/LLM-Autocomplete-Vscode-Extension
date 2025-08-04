import {
	InlineCompletionItem,
	TextDocument,
	Position,
	InlineCompletionContext,
	CancellationToken,
	Range,
} from "vscode";
import { excerptForCursorPosition } from "./zeta/input-excerpt";
import {
	processZetaResponse,
	groupEditsNearCursor,
} from "./zeta/response-parser";
import { callProvider } from "./suggestion";
import { log } from "../extension";
import { RequestDebouncer } from "./debouncer";

export class ZetaInlineCompletionProvider {
	private debouncer = new RequestDebouncer();
	private currentAbortController: AbortController | null = null;

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		inlineContext: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
		log.appendLine("[Zeta] Called");
		try {
			// Cancel previous request if it exists
			if (this.currentAbortController) {
				log.appendLine("[Zeta] Cancelling previous request");
				this.currentAbortController.abort();
			}

			// Debounce rapid calls - only the most recent request proceeds
			const shouldSkip = await this.debouncer.delayAndDebounce(100);
			if (shouldSkip) {
				log.appendLine("[Zeta] Skipped due to debouncing");
				return [];
			}

			// Create new abort controller for this request after debouncing
			this.currentAbortController = new AbortController();
			const zetaExcerpt = await excerptForCursorPosition(
				position,
				document
			);

			const rawResponse = await callProvider(
				zetaExcerpt.prompt,
				{
					num_predict: 400,
					temperature: 0,
					stop: [],
					provider: "ollama_server",
				},
				token,
				this.currentAbortController.signal
			);

			if (!rawResponse) {
				return [];
			}

			const zetaEdits = processZetaResponse(
				rawResponse,
				zetaExcerpt.editableRange,
				document
			);

			if (zetaEdits.length === 0) {
				return [];
			}

			const groupedEdits = groupEditsNearCursor(zetaEdits, position);
			if (groupedEdits.length === 0) return [];

			return groupedEdits.map(
				edit => new InlineCompletionItem(edit.newText, edit.range)
			);
		} catch (err: any) {
			// Clear abort controller on error
			this.currentAbortController = null;

			// Don't log abort errors as they're expected
			if (err?.name !== "AbortError") {
				log.appendLine(`[Zeta Error] ${err?.message || err}`);
			}
			return [];
		} finally {
			// Clear abort controller when request completes successfully
			this.currentAbortController = null;
		}
	}
}
