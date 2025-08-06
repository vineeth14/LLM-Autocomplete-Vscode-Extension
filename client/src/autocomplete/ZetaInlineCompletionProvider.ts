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
	private hoverDecorationType: vscode.TextEditorDecorationType;
	
	constructor(private predictionNavigator: PredictionNavigator) {
		// Create toolbar decoration for single completions
		this.toolbarDecorationType = vscode.window.createTextEditorDecorationType({});
		
		// Create hover decoration for multi-line previews
		this.hoverDecorationType = vscode.window.createTextEditorDecorationType({
			border: '1px solid rgba(128, 128, 128, 0.3)',
			backgroundColor: 'rgba(128, 128, 128, 0.05)',
		});
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

			// Handle single edit - check if it's multi-line
			const singleEdit = groupedEdits[0];
			const lines = singleEdit.newText.split('\n');

			if (lines.length > 1) {
				// Create ghost text showing first line with indicator
				const firstLine = lines[0];
				const lineCount = lines.length;
				const truncatedText = firstLine + ` ...(+${lineCount - 1} lines)`;
				
				// Add hover decoration showing full content
				this.showMultilineHover(singleEdit.range, singleEdit.newText);
				
				return [{
					insertText: singleEdit.newText, // Insert full content when accepted
					range: singleEdit.range,
				}];
			}

			// Single-line edit - return as standard inline completion (default ghost text)
			return [{
				insertText: singleEdit.newText,
				range: singleEdit.range,
			}];
		} catch (err: any) {
			// Clear abort controller on error
			this.currentAbortController = null;

			return [];
		} finally {
			// Clear abort controller when request completes successfully
			this.currentAbortController = null;
		}
	}

	private showMultilineHover(range: vscode.Range, fullContent: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		// Create hover message with full multi-line content
		const hoverMessage = new vscode.MarkdownString();
		hoverMessage.appendCodeblock(fullContent, 'python');
		hoverMessage.appendText('\n\n💡 *Full multi-line completion - press Tab to accept*');

		// Set decoration with hover message
		editor.setDecorations(this.hoverDecorationType, [{
			range,
			hoverMessage
		}]);

		// Clear decoration after a timeout or when user moves cursor
		const clearDecoration = () => {
			editor.setDecorations(this.hoverDecorationType, []);
		};

		// Clear after 10 seconds
		setTimeout(clearDecoration, 10000);

		// Clear when cursor moves (listen once)
		const disposable = vscode.window.onDidChangeTextEditorSelection(() => {
			clearDecoration();
			disposable.dispose();
		});
	}
}
