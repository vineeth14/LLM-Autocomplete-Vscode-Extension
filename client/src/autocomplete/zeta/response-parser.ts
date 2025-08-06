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
	const editableText = document.getText(editableRange);
	const editableLines = editableText.split("\n");


	let startLine = 0,
		startChar = edit.start;
	for (const line of editableLines) {
		if (startChar <= line.length) break;
		startChar -= line.length + 1; // +1 for newline
		startLine++;
	}

	let endLine = 0,
		endChar = edit.end;
	for (const line of editableLines) {
		if (endChar <= line.length) break;
		endChar -= line.length + 1;
		endLine++;
	}


	const startPos = new vscode.Position(
		editableRange.start.line + startLine,
		startLine === 0 ? editableRange.start.character + startChar : startChar
	);
	const endPos = new vscode.Position(
		editableRange.start.line + endLine,
		endLine === 0 ? editableRange.start.character + endChar : endChar
	);


	const result = {
		range: new vscode.Range(startPos, endPos),
		newText: edit.newText,
	};

	return result;
}

export function mergeOverlappingEdits(
	edits: TextEdit[],
	oldText: string
): TextEdit[] {
	if (edits.length <= 1) return edits;

	const sorted = [...edits].sort((a, b) => a.start - b.start);

	const merged: TextEdit[] = [];
	let current = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		const next = sorted[i];

		// Check if current and next should be merged
		if (current.end >= next.start - 2) {
			const mergedStart = Math.min(current.start, next.start);
			const mergedEnd = Math.max(current.end, next.end);

			// Get the text that was between the two edits
			const betweenText = oldText.substring(current.end, next.start);
			const combinedText = current.newText + betweenText + next.newText;

			current = {
				start: mergedStart,
				end: mergedEnd,
				newText: combinedText,
			};
		} else {
			// No overlap - keep current and move to next
			merged.push(current);
			current = next;
		}
	}

	// Don't forget the last edit
	merged.push(current);
	return merged;
}

// Remove # comments from newText to clean up AI-generated suggestions
function stripComments(text: string): string {
	return text
		.split('\n')
		.map(line => {
			// Remove lines that are purely comments (only whitespace + # + comment)
			if (line.trim().startsWith('#')) {
				return '';
			}
			// Remove inline comments (preserve code before #)
			const commentIndex = line.indexOf('#');
			if (commentIndex !== -1) {
				// Make sure it's not inside a string literal
				const beforeComment = line.substring(0, commentIndex);
				const singleQuotes = (beforeComment.match(/'/g) || []).length;
				const doubleQuotes = (beforeComment.match(/"/g) || []).length;
				
				// If even number of quotes, comment is outside string literals
				if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
					return line.substring(0, commentIndex).trimEnd();
				}
			}
			return line;
		})
		.filter(line => line.trim() !== '') // Remove empty lines
		.join('\n');
}

export function processZetaResponse(
	rawResponse: string,
	editableRange: vscode.Range,
	document: vscode.TextDocument
): ZetaEdit[] {
	const parsed = parseZetaResponse(rawResponse);
	if (!parsed.isValid) {
		return [];
	}

	const oldText = document.getText(editableRange);

	const allEdits = computeAllEdits(oldText, parsed.extractedCode);
	const filteredEdits = allEdits.filter(
		edit => !(edit.start === edit.end && edit.newText === "")
	);

	// Merge overlapping/adjacent edits to fix character-by-character issues
	const mergedEdits = mergeOverlappingEdits(filteredEdits, oldText);

	const vscodeEdits = mergedEdits.map(edit =>
		textEditToVSCodeEdit(edit, editableRange, document)
	);

	// Strip comments from all edits to clean up AI suggestions
	const cleanedEdits = vscodeEdits.map(edit => ({
		...edit,
		newText: stripComments(edit.newText)
	})).filter(edit => edit.newText.trim() !== ''); // Remove edits that become empty after comment removal

	return cleanedEdits;
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
