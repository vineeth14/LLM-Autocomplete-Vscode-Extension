import {
	getAst,
	getTreePathAtCursor,
	nodeToRange,
	estimateTokensZeta,
	getContextForPath,
} from "../context/ast";
import { InputExcerpt } from "./types";
import { expandRange } from "./range-expander";
import { log } from "../../extension";
import { AutocompleteSnippet } from "../context/types";

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

// Get definition snippets for unknown types at cursor position
async function getDefinitionSnippets(
	position: vscode.Position,
	document: vscode.TextDocument,
	tokenLimit: number = 100
): Promise<AutocompleteSnippet[]> {
	try {
		const tree = await getAst(document.getText());
		if (!tree) {
			log.appendLine(`[Debug] No AST tree generated`);
			return [];
		}

		const cursorIndex = document.offsetAt(position);
		const astPath = await getTreePathAtCursor(tree, cursorIndex, position.line);
		
		// Get context snippets (which include goto definitions)
		const snippets = await getContextForPath(document.uri.fsPath, astPath);
		
		// Filter and apply token budget
		let usedTokens = 0;
		const budgetedSnippets: AutocompleteSnippet[] = [];
		
		for (const snippet of snippets) {
			const snippetTokens = estimateTokensZeta(snippet.content);
			if (usedTokens + snippetTokens <= tokenLimit) {
				budgetedSnippets.push(snippet);
				usedTokens += snippetTokens;
			}
		}
		
		return budgetedSnippets;
	} catch (error) {
		return [];
	}
}

export async function excerptForCursorPosition(
	position: vscode.Position,
	document: vscode.TextDocument,
	editableRegionTokenLimit: number = 350,
	contextTokenLimit: number = 150
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

	// Get definition snippets for unknown types (with reduced token budget)
	const definitionTokenLimit = 100;
	const definitionSnippets = await getDefinitionSnippets(
		position,
		document,
		definitionTokenLimit
	);

	const prompt = buildPrompt(document, position, editableRange, contextRange, definitionSnippets);
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
	contextRange: vscode.Range,
	definitionSnippets: AutocompleteSnippet[] = []
): string {
	const filepath = document.uri.fsPath;
	const filename = filepath.split("/").pop() || "unknown";

	let prompt = `### User Excerpt:\n\`\`\`${filename}\n`;

	// if (contextRange.start.line === 0 && contextRange.start.character === 0) {
	// 	prompt += `${START_OF_FILE_MARKER}\n`;
	// }

	if (contextRange.start.isBefore(editableRange.start)) {
		const beforeText = document.getText(
			new vscode.Range(contextRange.start, editableRange.start)
		);
		prompt += beforeText;
	}

	// Add definition snippets before editable region (as context)
	if (definitionSnippets.length > 0) {
		prompt += "\n# Relevant type definitions:\n";
		definitionSnippets.forEach((snippet, index) => {
			const snippetPath = snippet.filepath.split("/").pop() || "unknown";
			prompt += `# From ${snippetPath}:\n${snippet.content}\n\n`;
		});
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
