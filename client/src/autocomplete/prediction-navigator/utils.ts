import * as vscode from "vscode";
import * as crypto from "crypto";
import { EditPrediction, DocumentAnchor, DocumentSnapshot } from "./types";
import { ZetaEdit } from "../zeta/response-parser";

export function createEditPrediction(
	edit: ZetaEdit,
	document: vscode.TextDocument,
	index: number
): EditPrediction {
	const lineText = document.lineAt(edit.range.start.line).text;

	return {
		id: `edit-${index}-${Date.now()}`,
		edit,
		anchor: {
			position: edit.range.start,
			lineText,
			hash: crypto.createHash("md5").update(lineText).digest("hex"),
		},
		snapshot: {
			uri: document.uri.toString(),
			timestamp: Date.now(),
			hash: crypto
				.createHash("md5")
				.update(document.getText())
				.digest("hex"),
		},
		confidence: 0.8,
		description: `Edit ${index + 1}: ${edit.newText.split("\n")[0].substring(0, 50)}...`,
		isValid: true,
	};
}
