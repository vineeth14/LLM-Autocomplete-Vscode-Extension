import * as vscode from "vscode";
import { EditPrediction, PredictionNavigatorState } from "./types";
import { log } from "../../extension";
import { levenshteinDistance } from "./utils";

export class PredictionNavigator {
	private state: PredictionNavigatorState = {
		predictions: [],
		currentIndex: 0,
		activeDocument: undefined,
		isNavigating: false
	};

	// Decoration types for visual highlighting
	private currentDecorationType: vscode.TextEditorDecorationType;
	private ghostTextDecorationType: vscode.TextEditorDecorationType;
	private statusBarItem: vscode.StatusBarItem;

	constructor() {
		// Green highlight for current prediction
		this.currentDecorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
			border: '2px solid',
			borderColor: new vscode.ThemeColor('charts.green'),
			borderRadius: '3px',
			isWholeLine: false
		});

		// Ghost text preview for prediction content
		this.ghostTextDecorationType = vscode.window.createTextEditorDecorationType({
			after: {
				color: new vscode.ThemeColor('editorGhostText.foreground'),
				fontStyle: 'italic'
			}
		});

		// Status bar for showing prediction info
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	}

	/**
	 * Start showing multiple predictions with ghost text navigation
	 */
	public showPredictions(document: vscode.TextDocument, predictions: EditPrediction[]): void {
		if (predictions.length === 0) return;

		this.state = {
			predictions,
			currentIndex: 0,
			activeDocument: document,
			isNavigating: true
		};

		// Set context for keybindings
		vscode.commands.executeCommand('setContext', 'zetaPredictionsActive', true);

		log.appendLine(`[PredictionNavigator] Starting navigation with ${predictions.length} predictions`);
		
		// Debug: Log all predictions
		predictions.forEach((pred, i) => {
			log.appendLine(`[PredictionNavigator] Prediction ${i + 1}: "${pred.edit.newText.substring(0, 100)}" at range ${pred.edit.range.start.line}:${pred.edit.range.start.character}-${pred.edit.range.end.line}:${pred.edit.range.end.character}`);
		});
		
		this.highlightCurrentPrediction();
		this.updateStatusBar();
	}

	/**
	 * Accept current prediction and move to next one
	 */
	public async acceptCurrentPrediction(): Promise<boolean> {
		if (!this.isActive()) return false;

		const currentPrediction = this.state.predictions[this.state.currentIndex];
		log.appendLine(`[PredictionNavigator] Accepting prediction: ${currentPrediction.description}`);

		// Apply the edit to the document
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.replace(this.state.activeDocument!.uri, currentPrediction.edit.range, currentPrediction.edit.newText);
		
		const success = await vscode.workspace.applyEdit(workspaceEdit);
		if (!success) {
			log.appendLine(`[PredictionNavigator] Failed to apply prediction`);
			return false;
		}

		// Remove the accepted prediction
		this.state.predictions.splice(this.state.currentIndex, 1);
		
		// If no more predictions, clear everything
		if (this.state.predictions.length === 0) {
			log.appendLine(`[PredictionNavigator] All predictions completed`);
			this.clear();
			return false;
		}

		// Adjust current index if needed
		if (this.state.currentIndex >= this.state.predictions.length) {
			this.state.currentIndex = 0;
		}

		// Update document reference and continue to next prediction
		this.state.activeDocument = vscode.window.activeTextEditor?.document;
		this.highlightCurrentPrediction();
		this.updateStatusBar();

		return true;
	}


	/**
	 * Cancel all predictions and clear navigation
	 */
	public cancelAllPredictions(): void {
		if (this.state.predictions.length > 0) {
			const remaining = this.state.predictions.length;
			log.appendLine(`[PredictionNavigator] Cancelling ${remaining} remaining predictions`);
		}
		
		this.clear();
	}

	/**
	 * Check if navigator is actively showing predictions
	 */
	public isActive(): boolean {
		return this.state.isNavigating && 
			   this.state.predictions.length > 0 && 
			   this.state.activeDocument !== undefined;
	}

	/**
	 * Get current prediction for inline completion
	 */
	public getCurrentPrediction(): EditPrediction | null {
		if (!this.isActive()) return null;
		return this.state.predictions[this.state.currentIndex];
	}

	/**
	 * Get current prediction info for display
	 */
	public getCurrentPredictionInfo(): { current: number; total: number; description: string } | null {
		if (!this.isActive()) return null;
		
		const prediction = this.state.predictions[this.state.currentIndex];
		return {
			current: this.state.currentIndex + 1,
			total: this.state.predictions.length,
			description: prediction.description
		};
	}

	/**
	 * Validate predictions against current document state
	 */
	public validatePredictions(): void {
		if (!this.isActive()) return;

		const document = vscode.window.activeTextEditor?.document;
		if (!document || document !== this.state.activeDocument) {
			log.appendLine(`[PredictionNavigator] Document changed, clearing predictions`);
			this.clear();
			return;
		}

		// Filter out invalid predictions
		const validPredictions = this.state.predictions.filter(pred => {
			const range = pred.edit.range;
			
			// Check if range is still valid
			if (range.end.line >= document.lineCount) {
				log.appendLine(`[PredictionNavigator] Prediction ${pred.id} invalid: range exceeds document`);
				return false;
			}

			// Check if anchor line content hasn't changed dramatically
			try {
				const currentLine = document.lineAt(pred.anchor.line);
				const similarity = levenshteinDistance(currentLine.text, pred.anchor.lineContent);
				if (similarity > 20) {
					log.appendLine(`[PredictionNavigator] Prediction ${pred.id} invalid: line content changed too much`);
					return false;
				}
			} catch (error) {
				log.appendLine(`[PredictionNavigator] Prediction ${pred.id} invalid: anchor line error`);
				return false;
			}

			return true;
		});

		// Update predictions
		this.state.predictions = validPredictions;

		// Clear if no valid predictions remain
		if (this.state.predictions.length === 0) {
			log.appendLine(`[PredictionNavigator] No valid predictions remain, clearing`);
			this.clear();
			return;
		}

		// Adjust current index if needed
		if (this.state.currentIndex >= this.state.predictions.length) {
			this.state.currentIndex = 0;
		}

		// Update status bar
		this.updateStatusBar();
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		this.clear();
		this.currentDecorationType.dispose();
		this.ghostTextDecorationType.dispose();
		this.statusBarItem.dispose();
	}

	// Private methods

	private highlightCurrentPrediction(): void {
		if (!this.isActive()) return;

		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document !== this.state.activeDocument) {
			log.appendLine(`[PredictionNavigator] No active editor or document mismatch`);
			return;
		}

		const currentPrediction = this.state.predictions[this.state.currentIndex];
		log.appendLine(`[PredictionNavigator] Highlighting prediction ${this.state.currentIndex + 1}/${this.state.predictions.length} at line ${currentPrediction.edit.range.start.line + 1}`);

		// Clear previous decorations
		editor.setDecorations(this.currentDecorationType, []);
		editor.setDecorations(this.ghostTextDecorationType, []);

		// Apply green highlight to edit range
		editor.setDecorations(this.currentDecorationType, [currentPrediction.edit.range]);

		// Apply ghost text preview
		const ghostDecoration: vscode.DecorationOptions = {
			range: currentPrediction.edit.range,
			renderOptions: {
				after: {
					contentText: ` ${currentPrediction.edit.newText}`,
					color: new vscode.ThemeColor('editorGhostText.foreground'),
					fontStyle: 'italic'
				}
			}
		};
		editor.setDecorations(this.ghostTextDecorationType, [ghostDecoration]);

		// Move cursor to edit location for better visibility
		editor.selection = new vscode.Selection(currentPrediction.edit.range.start, currentPrediction.edit.range.start);
		editor.revealRange(currentPrediction.edit.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}

	private updateStatusBar(): void {
		if (!this.isActive()) {
			this.statusBarItem.hide();
			return;
		}

		const info = this.getCurrentPredictionInfo()!;
		this.statusBarItem.text = `$(edit) ${info.current}/${info.total} predictions`;
		this.statusBarItem.tooltip = info.description;
		this.statusBarItem.show();
	}

	private clear(): void {
		// Clear decorations
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.setDecorations(this.currentDecorationType, []);
			editor.setDecorations(this.ghostTextDecorationType, []);
		}

		// Hide status bar
		this.statusBarItem.hide();

		// Clear context for keybindings
		vscode.commands.executeCommand('setContext', 'zetaPredictionsActive', false);

		// Reset state
		this.state = {
			predictions: [],
			currentIndex: 0,
			activeDocument: undefined,
			isNavigating: false
		};

		log.appendLine(`[PredictionNavigator] Cleared all predictions and highlights`);
	}
}