import * as vscode from "vscode";
import { EditHighlighter } from "./EditHighlighter";
import { log } from "../../extension";

/**
 * Command handlers for green highlight edit system
 */
export class EditCommands {
	constructor(private editHighlighter: EditHighlighter) {}

	/**
	 * Accept current edit and move to next (Tab key)
	 */
	public async acceptCurrentEdit() {
		log.appendLine("[EditCommands] acceptCurrentEdit called");
		
		if (!this.editHighlighter.hasActiveEdits()) {
			log.appendLine("[EditCommands] No active edits to accept");
			vscode.window.showWarningMessage("No active edits to accept");
			return;
		}

		const info = this.editHighlighter.getCurrentEditInfo();
		if (info) {
			log.appendLine(`[EditCommands] Accepting edit ${info.current}/${info.total}`);
		}

		const hasMore = await this.editHighlighter.acceptCurrentEdit();
		
		if (!hasMore) {
			vscode.window.showInformationMessage("All edits completed!");
		} else {
			vscode.window.showInformationMessage(`Edit applied! ${this.editHighlighter.getCurrentEditInfo()?.current}/${this.editHighlighter.getCurrentEditInfo()?.total} remaining`);
		}
	}

	/**
	 * Cancel all edits (Escape key)
	 */
	public cancelAllEdits() {
		log.appendLine("[EditCommands] cancelAllEdits called");
		
		if (!this.editHighlighter.hasActiveEdits()) {
			log.appendLine("[EditCommands] No active edits to cancel");
			vscode.window.showWarningMessage("No active edits to cancel");
			return;
		}

		const info = this.editHighlighter.getCurrentEditInfo();
		if (info) {
			const remaining = info.total - info.current + 1;
			log.appendLine(`[EditCommands] Cancelling ${remaining} remaining edits`);
			vscode.window.showInformationMessage(`Cancelled ${remaining} remaining edits`);
		}

		this.editHighlighter.cancelAllEdits();
	}
}