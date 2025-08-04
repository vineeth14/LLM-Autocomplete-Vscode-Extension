import * as vscode from "vscode";
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
import { PredictionNavigator, createEditPrediction } from "./prediction-navigator";

export class ZetaInlineCompletionProvider {
	private debouncer = new RequestDebouncer();
	private currentAbortController: AbortController | null = null;
	private predictionNavigator: PredictionNavigator;

	constructor(private context?: any) {
		this.predictionNavigator = new PredictionNavigator();
	}

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		inlineContext: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
		log.appendLine("[Zeta] Called");

		try {
			// If we have active predictions, don't interfere with navigation
			if (this.predictionNavigator.isActive()) {
				log.appendLine("[Zeta] Active predictions in progress, skipping new completion");
				return [];
			}

			// Cancel previous request if it exists
			if (this.currentAbortController) {
				log.appendLine("[Zeta] Cancelling previous request");
				this.currentAbortController.abort();
			}

			// Debounce rapid calls - only the most recent request proceeds
			const shouldSkip = await this.debouncer.delayAndDebounce(300);
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

			// If multiple grouped edits, use prediction navigation system
			if (groupedEdits.length > 1) {
				log.appendLine(`[Zeta] ${groupedEdits.length} grouped edits found, starting prediction navigation`);
				
				// Convert ZetaEdit[] to EditPrediction[]
				const predictions = groupedEdits.map((edit, index) => 
					createEditPrediction(edit, document, index)
				);

				// Start the prediction navigation with ghost text highlights
				this.predictionNavigator.showPredictions(document, predictions);
				return []; // No inline completion when using prediction navigation
			}

			// Single edit - use normal inline completion
			const bestEdit = groupedEdits[0];
			log.appendLine(
				`[Zeta] Single edit: ${bestEdit.newText.substring(0, 50)}...`
			);

			// Use the actual edit range instead of cursor position
			return [new InlineCompletionItem(bestEdit.newText, bestEdit.range)];
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

	/**
	 * Get the PredictionNavigator instance for command registration
	 */
	public getPredictionNavigator(): PredictionNavigator {
		return this.predictionNavigator;
	}

	/**
	 * Dispose of resources
	 */
	public dispose() {
		this.predictionNavigator.dispose();
	}
}
