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
import { PredictionNavigator } from "./prediction-navigator/PredictionNavigator";
import { createEditPrediction } from "./prediction-navigator/utils";

export class ZetaInlineCompletionProvider {
	private debouncer = new RequestDebouncer();
	private currentAbortController: AbortController | null = null;
	private toolbarDecorationType: vscode.TextEditorDecorationType;
	
	constructor(private predictionNavigator: PredictionNavigator) {
		// Create toolbar decoration for single completions
		this.toolbarDecorationType = vscode.window.createTextEditorDecorationType({});
	}

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		inlineContext: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
		try {
			// CRITICAL: Prevent new completions during active multi-edit navigation
			if (this.predictionNavigator.isActive()) {
				return [];
			}

			// Cancel previous request if it exists
			if (this.currentAbortController) {
				this.currentAbortController.abort();
			}

			// Debounce rapid calls - only the most recent request proceeds
			const shouldSkip = await this.debouncer.delayAndDebounce(100);
			if (shouldSkip) {
				return [];
			}

			// Create new abort controller for this request after debouncing
			this.currentAbortController = new AbortController();
			const zetaExcerpt = await excerptForCursorPosition(
				position,
				document
			);

			const startTime = performance.now();
			const rawResponse = await callProvider(
				zetaExcerpt.prompt,
				{
					num_predict: 500,
					temperature: 0,
					stop: [],
				},
				token,
				this.currentAbortController.signal
			);
			const endTime = performance.now();

			log.appendLine(
				`[Timing] Total server time: ${endTime - startTime}ms`
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

			if (groupedEdits.length > 1) {
				const predictions = groupedEdits.map((edit, index) =>
					createEditPrediction(edit, document, index)
				);
				this.predictionNavigator.showPredictions(document, predictions);
				return [];
			}

			const predictions = groupedEdits.map((edit, index) =>
				createEditPrediction(edit, document, index)
			);
			this.predictionNavigator.showPredictions(document, predictions);
			return [];
		} catch (err: any) {
			// Clear abort controller on error
			this.currentAbortController = null;

			return [];
		} finally {
			// Clear abort controller when request completes successfully
			this.currentAbortController = null;
		}
	}
}
