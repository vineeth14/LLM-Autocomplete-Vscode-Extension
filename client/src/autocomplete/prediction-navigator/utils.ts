import * as vscode from "vscode";
import { createHash } from "crypto";
import { DocumentAnchor, DocumentSnapshot, EditPrediction } from "./types";
import { ZetaEdit } from "../zeta/response-parser";

export function createAnchor(range: vscode.Range, document: vscode.TextDocument): DocumentAnchor {
	const line = document.lineAt(range.start.line);
	return {
		line: range.start.line,
		character: range.start.character,
		lineContent: line.text
	};
}

export function captureSnapshot(document: vscode.TextDocument): DocumentSnapshot {
	const content = document.getText();
	const contentHash = createHash('md5').update(content).digest('hex');
	
	return {
		version: document.version,
		contentHash,
		timestamp: Date.now()
	};
}

export function generatePredictionId(): string {
	return `zeta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEditPrediction(
	edit: ZetaEdit, 
	document: vscode.TextDocument, 
	index: number
): EditPrediction {
	return {
		id: generatePredictionId(),
		edit,
		anchor: createAnchor(edit.range, document),
		snapshot: captureSnapshot(document),
		confidence: 1.0 - (index * 0.1), // Decrease confidence for later predictions
		description: `Prediction ${index + 1}: ${edit.newText.substring(0, 50)}${edit.newText.length > 50 ? '...' : ''}`,
		isValid: true
	};
}

export function levenshteinDistance(str1: string, str2: string): number {
	const matrix = [];
	
	for (let i = 0; i <= str2.length; i++) {
		matrix[i] = [i];
	}
	
	for (let j = 0; j <= str1.length; j++) {
		matrix[0][j] = j;
	}
	
	for (let i = 1; i <= str2.length; i++) {
		for (let j = 1; j <= str1.length; j++) {
			if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}
	
	return matrix[str2.length][str1.length];
}