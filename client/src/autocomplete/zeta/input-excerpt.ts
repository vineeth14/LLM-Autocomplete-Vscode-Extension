import {
	getAst,
	getTreePathAtCursor,
	nodeToRange,
	estimateTokensZeta,
} from "../context/ast";
import { InputExcerpt } from "./types";
import { expandRange } from "./range-expander";

import * as vscode from "vscode";

// Marker constants for prompt formatting
export const CURSOR_MARKER = "<|user_cursor_is_here|>";
export const EDITABLE_REGION_START_MARKER = "<|editable_region_start|>";
export const EDITABLE_REGION_END_MARKER = "<|editable_region_end|>";
export const START_OF_FILE_MARKER = "<|start_of_file|>";

async function findSyntaxScope(
	document: vscode.TextDocument,
	position: vscode.Position,
	editableRegionTokenLimit: number
): Promise<{ range: vscode.Range; remainingEditTokens: number }> {
	const tree = await getAst(document.getText());
	if (!tree) {
		return {
			range: new vscode.Range(position, position),
			remainingEditTokens: editableRegionTokenLimit,
		};
	}
	const cursorIndex = document.offsetAt(position);
	const astPath = await getTreePathAtCursor(tree, cursorIndex, position.line);
	let scopeRange = new vscode.Range(position, position);
	let remainingEditTokens = editableRegionTokenLimit;

	for (let i = astPath.length - 1; i >= 0; i--) {
		const node = astPath[i];
		const nodeRange = nodeToRange(document, node);
		const nodeTokens = estimateTokensZeta(document.getText(nodeRange));

		if (nodeRange.isEqual(scopeRange)) {
			break;
		} else if (nodeTokens <= editableRegionTokenLimit) {
			scopeRange = nodeRange;
			remainingEditTokens = editableRegionTokenLimit - nodeTokens;
		} else {
			break;
		}
	}
	return { range: scopeRange, remainingEditTokens };
}

export async function excerptForCursorPosition(
	position: vscode.Position,
	document: vscode.TextDocument,
	editableRegionTokenLimit: number = 350,
	contextTokenLimit: number = 500
): Promise<InputExcerpt> {
	// Find largest syntax scope within token budget
	const syntaxResult = await findSyntaxScope(
		document,
		position,
		editableRegionTokenLimit
	);

	const editableRange = expandRange(
		document,
		syntaxResult.range,
		syntaxResult.remainingEditTokens
	);

	const contextRange = expandRange(
		document,
		editableRange,
		contextTokenLimit
	);

	const prompt = buildPrompt(document, position, editableRange, contextRange);
	const speculatedOutput = buildSpeculatedOutput(
		document,
		position,
		editableRange
	);

	return { editableRange, prompt, speculatedOutput };
}

function buildPrompt(
	document: vscode.TextDocument,
	position: vscode.Position,
	editableRange: vscode.Range,
	contextRange: vscode.Range
): string {
	const filepath = document.uri.fsPath;
	const filename = filepath.split("/").pop() || "unknown";

	let prompt = `\`\`\`${filename}\n`;

	if (contextRange.start.line === 0 && contextRange.start.character === 0) {
		prompt += `${START_OF_FILE_MARKER}\n`;
	}

	if (contextRange.start.isBefore(editableRange.start)) {
		const beforeText = document.getText(
			new vscode.Range(contextRange.start, editableRange.start)
		);
		prompt += beforeText;
	}

	prompt += `${EDITABLE_REGION_START_MARKER}\n`;

	// Content before cursor
	if (editableRange.start.isBefore(position)) {
		const beforeCursor = document.getText(
			new vscode.Range(editableRange.start, position)
		);
		prompt += beforeCursor;
	}

	prompt += CURSOR_MARKER;

	if (position.isBefore(editableRange.end)) {
		const afterCursor = document.getText(
			new vscode.Range(position, editableRange.end)
		);
		prompt += afterCursor;
	}

	prompt += `\n${EDITABLE_REGION_END_MARKER}`;

	if (editableRange.end.isBefore(contextRange.end)) {
		const afterText = document.getText(
			new vscode.Range(editableRange.end, contextRange.end)
		);
		prompt += afterText;
	}

	prompt += "\n```";

	return prompt;
}

function buildSpeculatedOutput(
	document: vscode.TextDocument,
	position: vscode.Position,
	editableRange: vscode.Range
): string {
	let output = `${EDITABLE_REGION_START_MARKER}\n`;

	// Content before cursor
	if (editableRange.start.isBefore(position)) {
		const beforeCursor = document.getText(
			new vscode.Range(editableRange.start, position)
		);
		output += beforeCursor;
	}

	output += CURSOR_MARKER;

	if (position.isBefore(editableRange.end)) {
		const afterCursor = document.getText(
			new vscode.Range(position, editableRange.end)
		);
		output += afterCursor;
	}

	output += `\n${EDITABLE_REGION_END_MARKER}`;

	return output;
}
