import {
	CURSOR_MARKER,
	EDITABLE_REGION_START_MARKER,
	EDITABLE_REGION_END_MARKER,
	START_OF_FILE_MARKER,
} from "./input-excerpt";
import * as diff from "fast-diff";
import * as vscode from "vscode";
import { log } from "../../extension";

export interface ParsedZetaResponse {
	extractedCode: string;
	isValid: boolean;
	error?: string;
}

export interface TextEdit {
	start: number;
	end: number;
	newText: string;
}

//Represents a single text modification
export interface ZetaEdit {
	range: vscode.Range;
	newText: string;
}

export function parseZetaResponse(rawResponse: string): ParsedZetaResponse {
	try {
		// Remove cursor markers first
		let content = rawResponse.replace(
			new RegExp(escapeRegex(CURSOR_MARKER), "g"),
			""
		);

		// Find start markers
		const startMarkerMatches = [
			...content.matchAll(
				new RegExp(escapeRegex(EDITABLE_REGION_START_MARKER), "g")
			),
		];
		if (startMarkerMatches.length !== 1) {
			return {
				extractedCode: "",
				isValid: false,
				error: `Expected exactly one start marker, found ${startMarkerMatches.length}`,
			};
		}

		// Find end markers with newline prefix (like zeta.rs does)
		const endMarkerPattern = `\\n${escapeRegex(EDITABLE_REGION_END_MARKER)}`;
		const endMarkerMatches = [
			...content.matchAll(new RegExp(endMarkerPattern, "g")),
		];
		if (endMarkerMatches.length !== 1) {
			return {
				extractedCode: "",
				isValid: false,
				error: `Expected exactly one end marker, found ${endMarkerMatches.length}`,
			};
		}

		// 1. Start from the start marker position
		const startMarkerPos = startMarkerMatches[0].index!;
		let contentFromStart = content.substring(startMarkerPos);

		// 2. Find first newline after start marker and skip it
		const newlineAfterStart = contentFromStart.indexOf("\n");
		if (newlineAfterStart === -1) {
			return {
				extractedCode: "",
				isValid: false,
				error: "Could not find newline after start marker",
			};
		}
		contentFromStart = contentFromStart.substring(newlineAfterStart + 1);

		// 3. Find end marker with newline prefix
		const endMarkerPos = contentFromStart.indexOf(
			`\n${EDITABLE_REGION_END_MARKER}`
		);
		if (endMarkerPos === -1) {
			return {
				extractedCode: "",
				isValid: false,
				error: "Could not find end marker with newline prefix",
			};
		}

		// 4. Extract the code between markers
		const extractedCode = contentFromStart.substring(0, endMarkerPos);

		return {
			extractedCode,
			isValid: true,
		};
	} catch (error) {
		return {
			extractedCode: "",
			isValid: false,
			error: `Parser error: ${error}`,
		};
	}
}

export function computeAllEdits(oldText: string, newText: string): TextEdit[] {
	const diffs = diff(oldText, newText);
	const edits: TextEdit[] = [];
	let oldPos = 0;

	for (const [operation, text] of diffs) {
		if (operation === diff.DELETE) {
			edits.push({
				start: oldPos,
				end: oldPos + text.length,
				newText: "",
			});
			oldPos += text.length;
		} else if (operation === diff.INSERT) {
			edits.push({ start: oldPos, end: oldPos, newText: text });
		} else {
			oldPos += text.length;
		}
	}
	return edits;
}

export function textEditToVSCodeEdit(
	edit: TextEdit,
	editableRange: vscode.Range,
	document: vscode.TextDocument
): ZetaEdit {
	// Convert text edit offsets (relative to editable region) to absolute document offsets
	const editableStartOffset = document.offsetAt(editableRange.start);
	const startOffset = editableStartOffset + edit.start;
	const endOffset = editableStartOffset + edit.end;

	const startPos = document.positionAt(startOffset);
	const endPos = document.positionAt(endOffset);

	return {
		range: new vscode.Range(startPos, endPos),
		newText: edit.newText,
	};
}

export function processZetaResponse(
	rawResponse: string,
	editableRange: vscode.Range,
	document: vscode.TextDocument
): ZetaEdit[] {
	const parsed = parseZetaResponse(rawResponse);
	if (!parsed.isValid) {
		log.appendLine(`[Zeta Debug] Parse failed: ${parsed.error}`);
		return [];
	}

	const oldText = document.getText(editableRange);

	const allEdits = computeAllEdits(oldText, parsed.extractedCode);
	return allEdits
		.filter(edit => !(edit.start === edit.end && edit.newText === ""))
		.map(edit => textEditToVSCodeEdit(edit, editableRange, document));
}

export function groupEditsNearCursor(
	edits: ZetaEdit[],
	cursorPosition: vscode.Position
): ZetaEdit[] {
	if (edits.length === 0) return [];

	const cursorRow = cursorPosition.line;
	let closestEditIndex = 0;
	let minDistance = Number.MAX_SAFE_INTEGER;

	// Find CLosest Edit
	edits.forEach((edit, index) => {
		const startDistance = Math.abs(cursorRow - edit.range.start.line);
		const endDistance = Math.abs(cursorRow - edit.range.end.line);
		const distance = Math.min(startDistance, endDistance);

		if (distance < minDistance) {
			minDistance = distance;
			closestEditIndex = index;
		}
	});

	const closestEdit = edits[closestEditIndex];

	let startIndex = closestEditIndex;
	let endIndex = closestEditIndex + 1;

	for (let i = closestEditIndex - 1; i >= 0; i--) {
		const distance = closestEdit.range.start.line - edits[i].range.end.line;
		if (distance <= 1) {
			startIndex = i;
		} else {
			break;
		}
	}

	for (let i = closestEditIndex + 1; i < edits.length; i++) {
		const distance = edits[i].range.start.line - closestEdit.range.end.line;
		if (distance <= 3) {
			endIndex = i + 1;
		} else {
			break;
		}
	}
	return edits.slice(startIndex, endIndex);
}

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeCodeFences(code: string): string {
	return code
		.replace(/^```[\w]*\n/, "") // Remove opening fence
		.replace(/\n```$/, ""); // Remove closing fence
}
