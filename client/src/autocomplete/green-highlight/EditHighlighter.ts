import * as vscode from "vscode";
import { HighlightEdit } from "./types";
import { log } from "../../extension";

export class EditHighlighter {
	private activeEdits: HighlightEdit[] = [];
	private currentEditIndex = 0;
	private activeDocument?: vscode.TextDocument;
	
	// Decoration types
	private highlightDecorationType: vscode.TextEditorDecorationType;
	private ghostTextDecorationType: vscode.TextEditorDecorationType;

	constructor() {
		// Green border highlight for active edit location
		this.highlightDecorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
			border: '2px solid',
			borderColor: new vscode.ThemeColor('charts.green'),
			borderRadius: '3px',
			isWholeLine: false
		});

		// Ghost text preview for edit content
		this.ghostTextDecorationType = vscode.window.createTextEditorDecorationType({
			after: {
				color: new vscode.ThemeColor('editorGhostText.foreground'),
				fontStyle: 'italic'
			}
		});
	}

	/**
	 * Start highlighting edits - shows first edit with green highlight
	 */
	public showEdits(document: vscode.TextDocument, edits: HighlightEdit[]) {
		if (edits.length === 0) return;

		this.activeDocument = document;
		this.activeEdits = edits;
		this.currentEditIndex = 0;

		// Set context for keybindings
		vscode.commands.executeCommand('setContext', 'zetaEditsActive', true);

		log.appendLine(`[EditHighlighter] Starting highlight cycle with ${edits.length} edits, Backtick/Escape keys active`);
		log.appendLine(`[EditHighlighter] Context 'zetaEditsActive' set to true`);
		this.highlightCurrentEdit();
	}

	/**
	 * Accept the current edit and move to the next one
	 */
	public async acceptCurrentEdit(): Promise<boolean> {
		if (!this.hasActiveEdits()) return false;

		const currentEdit = this.activeEdits[this.currentEditIndex];
		log.appendLine(`[EditHighlighter] Accepting edit ${this.currentEditIndex + 1}: ${currentEdit.newText.substring(0, 50)}...`);

		// Apply the edit to the document
		const success = await this.applyEdit(currentEdit);
		if (!success) {
			log.appendLine(`[EditHighlighter] Failed to apply edit ${this.currentEditIndex + 1}`);
			return false;
		}

		// Move to next edit
		this.currentEditIndex++;
		
		// If more edits remain, highlight the next one
		if (this.currentEditIndex < this.activeEdits.length) {
			this.highlightCurrentEdit();
			return true;
		} else {
			// All edits completed
			log.appendLine(`[EditHighlighter] All ${this.activeEdits.length} edits completed`);
			this.clearAllHighlights();
			return false;
		}
	}

	/**
	 * Cancel all remaining edits and clear highlights
	 */
	public cancelAllEdits() {
		if (this.activeEdits.length > 0) {
			const remaining = this.activeEdits.length - this.currentEditIndex;
			log.appendLine(`[EditHighlighter] Cancelling ${remaining} remaining edits`);
		}
		
		this.clearAllHighlights();
	}

	/**
	 * Check if there are active edits being highlighted
	 */
	public hasActiveEdits(): boolean {
		return this.activeEdits.length > 0 && 
			   this.currentEditIndex < this.activeEdits.length &&
			   this.activeDocument !== undefined;
	}

	/**
	 * Get info about current edit state
	 */
	public getCurrentEditInfo(): { current: number; total: number } | null {
		if (!this.hasActiveEdits()) return null;
		return {
			current: this.currentEditIndex + 1,
			total: this.activeEdits.length
		};
	}

	/**
	 * Dispose of decoration types
	 */
	public dispose() {
		this.clearAllHighlights();
		this.highlightDecorationType.dispose();
		this.ghostTextDecorationType.dispose();
	}

	// Private methods

	private highlightCurrentEdit() {
		if (!this.hasActiveEdits()) return;

		const currentEdit = this.activeEdits[this.currentEditIndex];
		const editor = vscode.window.activeTextEditor;
		
		if (!editor || editor.document !== this.activeDocument) {
			log.appendLine(`[EditHighlighter] No active editor or document mismatch`);
			return;
		}

		log.appendLine(`[EditHighlighter] Highlighting edit ${this.currentEditIndex + 1}/${this.activeEdits.length} at line ${currentEdit.range.start.line + 1}`);

		// Clear previous decorations
		editor.setDecorations(this.highlightDecorationType, []);
		editor.setDecorations(this.ghostTextDecorationType, []);

		// Apply green highlight to edit range
		editor.setDecorations(this.highlightDecorationType, [currentEdit.range]);

		// Apply ghost text preview
		const ghostDecoration: vscode.DecorationOptions = {
			range: currentEdit.range,
			renderOptions: {
				after: {
					contentText: ` ${currentEdit.newText}`,
					color: new vscode.ThemeColor('editorGhostText.foreground'),
					fontStyle: 'italic'
				}
			}
		};
		editor.setDecorations(this.ghostTextDecorationType, [ghostDecoration]);

		// Move cursor to edit location for better visibility
		editor.selection = new vscode.Selection(currentEdit.range.start, currentEdit.range.start);
		editor.revealRange(currentEdit.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}

	private async applyEdit(edit: HighlightEdit): Promise<boolean> {
		if (!this.activeDocument) return false;

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.replace(this.activeDocument.uri, edit.range, edit.newText);
		
		const success = await vscode.workspace.applyEdit(workspaceEdit);
		if (success) {
			// Update document reference after edit
			this.activeDocument = vscode.window.activeTextEditor?.document;
		}
		
		return success;
	}

	private clearAllHighlights() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.setDecorations(this.highlightDecorationType, []);
			editor.setDecorations(this.ghostTextDecorationType, []);
		}

		// Clear context for keybindings
		vscode.commands.executeCommand('setContext', 'zetaEditsActive', false);

		// Reset state
		this.activeEdits = [];
		this.currentEditIndex = 0;
		this.activeDocument = undefined;

		log.appendLine(`[EditHighlighter] Cleared all highlights, Backtick/Escape keys deactivated`);
		log.appendLine(`[EditHighlighter] Context 'zetaEditsActive' set to false`);
	}
}