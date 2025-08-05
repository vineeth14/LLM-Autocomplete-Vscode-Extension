import * as vscode from "vscode";
import { EditPrediction, PredictionState } from "./types";
import { log } from "../../extension";

export class PredictionNavigator {
	private state: PredictionState | null = null;
	private statusBarItem: vscode.StatusBarItem;
	private highlightDecorationType: vscode.TextEditorDecorationType;
	private ghostTextDecorationType: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		context.subscriptions.push(this.statusBarItem);

		// Green border highlight for the edit range
		this.highlightDecorationType =
			vscode.window.createTextEditorDecorationType({
				border: "1px solid #00ff00",
				borderRadius: "2px",
				backgroundColor: "rgba(0, 255, 0, 0.1)",
			});

		// Soft blue highlighted ghost text
		this.ghostTextDecorationType =
			vscode.window.createTextEditorDecorationType({
				after: {
					color: "#4A90E2",
					backgroundColor: "rgba(173, 216, 230, 0.3)",
					fontStyle: "italic",
				},
			});

		context.subscriptions.push(
			this.highlightDecorationType,
			this.ghostTextDecorationType
		);
	}

	public showPredictions(
		document: vscode.TextDocument,
		predictions: EditPrediction[]
	): void {
		if (predictions.length === 0) return;
		
		log.appendLine(`[PredictionNavigator] showPredictions called with ${predictions.length} predictions`);
		
		this.state = {
			predictions,
			currentIndex: 0,
			document,
			isActive: true,
		};

		vscode.commands.executeCommand(
			"setContext",
			"zetaPredictionsActive",
			true
		);
		this.showCurrentPrediction();
		log.appendLine(`[PredictionNavigator] Finished showPredictions setup`);
	}

	public async acceptCurrentPrediction(): Promise<boolean> {
		if (!this.state || !this.state.isActive) return false;

		const currentPrediction =
			this.state.predictions[this.state.currentIndex];
		if (!currentPrediction || !currentPrediction.isValid) {
			return this.moveToNext();
		}

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.replace(
			this.state.document.uri,
			currentPrediction.edit.range,
			currentPrediction.edit.newText
		);

		const success = await vscode.workspace.applyEdit(workspaceEdit);

		if (!success) {
			return false;
		}
		return this.moveToNext();
	}

	public cancelAllPredictions(): void {
		if (!this.state) return;
		this.clearDecorations();
		this.statusBarItem.hide();
		vscode.commands.executeCommand(
			"setContext",
			"zetaPredictionsActive",
			false
		);
		this.state = null;
	}

	private moveToNext(): boolean {
		if (!this.state) return false;
		this.state.currentIndex++;
		if (this.state.currentIndex >= this.state.predictions.length) {
			this.cancelAllPredictions();
			return false;
		}
		this.showCurrentPrediction();
		return true;
	}

	private showCurrentPrediction(): void {
		if (!this.state) return;

		log.appendLine(`[PredictionNavigator] showCurrentPrediction called for index ${this.state.currentIndex}`);

		this.clearDecorations();

		const prediction = this.state.predictions[this.state.currentIndex];
		const editor = vscode.window.activeTextEditor;

		if (
			!editor ||
			editor.document.uri.toString() !==
				this.state.document.uri.toString()
		) {
			log.appendLine(`[PredictionNavigator] No active editor or document mismatch`);
			return;
		}

		log.appendLine(`[PredictionNavigator] Setting decorations for range: ${prediction.edit.range.start.line}:${prediction.edit.range.start.character} to ${prediction.edit.range.end.line}:${prediction.edit.range.end.character}`);

		// Show green highlighted ghost text preview at cursor position
		const ghostRange = new vscode.Range(
			prediction.edit.range.start,
			prediction.edit.range.start
		);
		editor.setDecorations(this.ghostTextDecorationType, [
			{
				range: ghostRange,
				renderOptions: {
					after: {
						contentText:
							prediction.edit.newText.split("\n")[0] +
							(prediction.edit.newText.includes("\n")
								? "..."
								: ""),
					},
				},
			},
		]);

		log.appendLine(`[PredictionNavigator] Applied decorations, ghost text: "${prediction.edit.newText.split("\n")[0]}"`);

		// Move cursor to prediction location
		editor.selection = new vscode.Selection(
			prediction.edit.range.start,
			prediction.edit.range.start
		);
		editor.revealRange(prediction.edit.range);

		// Update status bar
		this.statusBarItem.text = `${this.state.currentIndex + 1}/${this.state.predictions.length} predictions`;
		this.statusBarItem.show();
		
		log.appendLine(`[PredictionNavigator] Status bar updated: ${this.statusBarItem.text}`);
	}

	private clearDecorations(): void {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.setDecorations(this.highlightDecorationType, []);
			editor.setDecorations(this.ghostTextDecorationType, []);
		}
	}

	public isActive(): boolean {
		return this.state?.isActive ?? false;
	}

	public getCurrentPredictionCount(): number {
		return this.state?.predictions.length ?? 0;
	}

	public dispose(): void {
		this.cancelAllPredictions();
		this.highlightDecorationType.dispose();
		this.ghostTextDecorationType.dispose();
		this.statusBarItem.dispose();
	}
}
