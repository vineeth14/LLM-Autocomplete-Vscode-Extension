import * as vscode from "vscode";
import { astLog } from "../../extension";
import { Parameters } from "../types";

// Commented out unused imports for potential future use
// import { ContextItem, AutocompleteSnippet } from "./types";
// import { getAst, getTreePathAtCursor, getContextForPath } from "./ast";
// import {
// 	prioritizeSnippets,
// 	formatSnippetsAsContext,
// 	buildScopeAwareContext,
// } from "./formatters";

export class ContextRetrievalService {
	private static readonly MAX_CONTEXT_LINES = 20; // Reduced from 40
	private static readonly ENHANCED_CONTEXT_LINES = 15; // Reduced from 25
	/**
	 * Get context for LLM completion using simple cursor-based approach
	 * @param document - The current document
	 * @param position - Cursor position
	 * @returns Clean cursor-based context formatted for LLM prompt
	 */
	async getContextForCompletion(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<Parameters> {
		return this.getSimpleCursorContext(document, position);
	}

	private getSimpleCursorContext(
		document: vscode.TextDocument,
		position: vscode.Position
	): Parameters {
		const text = document.getText();
		const lines = text.split("\n");
		const currentLine = position.line;
		const currentChar = position.character;

		// Get 3-4 lines before and 1-2 lines after cursor for context
		const contextBefore = 3;
		const contextAfter = 1;

		const startLine = Math.max(0, currentLine - contextBefore);
		const endLine = Math.min(lines.length - 1, currentLine + contextAfter);

		// Build prefix: all context lines + current line up to cursor
		const prefixLines = lines.slice(startLine, currentLine);
		const currentLinePrefix =
			lines[currentLine]?.substring(0, currentChar) || "";
		const allPrefixLines = [...prefixLines, currentLinePrefix];
		const prefix = allPrefixLines.join("\n");

		// Build suffix: current line after cursor + context lines after
		const currentLineSuffix = lines[currentLine]?.substring(currentChar) || "";
		const suffixLines = lines.slice(currentLine + 1, endLine + 1);
		const allSuffixLines = [currentLineSuffix, ...suffixLines];
		const suffix = allSuffixLines.join("\n");

		// Enhanced position information
		const cursorOffset = document.offsetAt(position);
		const currentLineText = lines[currentLine] || "";
		const isAtEndOfLine = currentChar === currentLineText.length;

		astLog.appendLine(
			`[SimpleCursorContext] Prefix: ${prefix.length} chars, Suffix: ${suffix.length} chars`
		);
		astLog.appendLine(
			`[SimpleCursorContext] Cursor offset: ${cursorOffset}, isAtEndOfLine: ${isAtEndOfLine}`
		);

		return {
			prefix: prefix,
			suffix: suffix,
			cursorOffset: cursorOffset,
			isAtEndOfLine: isAtEndOfLine,
			currentLineText: currentLineText,
		};
	}

	// =============================================================================
	// AST-BASED CONTEXT FUNCTIONS (Currently commented out for future use)
	// =============================================================================
	
	// Main AST context extraction method - enable this to use AST-based context
	// private async getScopedASTContext(
	// 	document: vscode.TextDocument,
	// 	position: vscode.Position
	// ): Promise<Parameters | null> {
	// 	const { getAst, getTreePathAtCursor } = await import("./ast");
	// 	const text = document.getText();
	// 	const characterOffset = document.offsetAt(position);
	// 	const textUpToCursor = text.substring(0, characterOffset);
	// 	const byteOffset = Buffer.from(textUpToCursor, "utf8").length;

	// 	const ast = await getAst(text);
	// 	if (!ast) return null;

	// 	const astPath = await getTreePathAtCursor(ast, byteOffset, position.line);
	// 	if (!astPath || astPath.length === 0) return null;

	// 	return this.extractStructuredContext(ast, astPath, document, position, byteOffset);
	// }

	// Core AST context builder - combines module context + scope context + cursor context
	// private async extractStructuredContext(
	// 	ast: any,
	// 	astPath: any[],
	// 	document: vscode.TextDocument,
	// 	position: vscode.Position,
	// 	byteOffset: number
	// ): Promise<Parameters> {
	// 	const text = document.getText();
	// 	const currentScope = astPath.find(node => 
	// 		node.type === "function_definition" || node.type === "class_definition"
	// 	);

	// 	const moduleContext = await this.extractModuleContext(ast, document.uri.fsPath);
	// 	const scopeContext = currentScope 
	// 		? await this.extractCurrentScopeContext(currentScope, document.uri.fsPath) 
	// 		: "";
	// 	const { prefix, suffix } = this.extractCleanCursorContext(ast, text, byteOffset, position);

	// 	return {
	// 		prefix,
	// 		suffix,
	// 		context: moduleContext + (scopeContext ? "\n\n" + scopeContext : "")
	// 	};
	// }

	// Extract imports and top-level function/class signatures
	// private async extractModuleContext(ast: any, filepath: string): Promise<string> {
	// 	const { getContextForPath } = await import("./ast");
	// 	const snippets = await getContextForPath(filepath, [ast.rootNode]);
	// 	const moduleSnippets = snippets.filter(s => 
	// 		s.scopeLevel === "module" && 
	// 		["import", "function", "class"].includes(s.symbolType)
	// 	);
	// 	return moduleSnippets.map(s => s.content).join("\n");
	// }

	// Extract current function/class context where cursor is located
	// private async extractCurrentScopeContext(scopeNode: any, filepath: string): Promise<string> {
	// 	const { getContextForPath } = await import("./ast");
	// 	const snippets = await getContextForPath(filepath, [scopeNode]);
	// 	const scopeSnippets = snippets.filter(s => 
	// 		s.scopeLevel === "current" && 
	// 		["function", "class"].includes(s.symbolType)
	// 	);
	// 	return scopeSnippets.map(s => s.content).join("\n");
	// }

	// Extract clean prefix/suffix with filtering
	// private extractCleanCursorContext(
	// 	ast: any, 
	// 	text: string, 
	// 	byteOffset: number, 
	// 	position: vscode.Position
	// ): { prefix: string; suffix: string } {
	// 	const lines = text.split("\n");
	// 	const CONTEXT_WINDOW = 5;
	// 	const startLine = Math.max(0, position.line - CONTEXT_WINDOW);
	// 	const endLine = Math.min(lines.length - 1, position.line + CONTEXT_WINDOW);
		
	// 	const prefixLines = lines.slice(startLine, position.line + 1);
	// 	const suffixLines = lines.slice(position.line + 1, endLine + 1);
		
	// 	if (prefixLines.length > 0) {
	// 		prefixLines[prefixLines.length - 1] = prefixLines[prefixLines.length - 1]
	// 			.substring(0, position.character);
	// 	}
		
	// 	return {
	// 		prefix: this.filterCodeLines(prefixLines).join("\n").trim(),
	// 		suffix: this.filterCodeLines(suffixLines).join("\n").trim()
	// 	};
	// }

	// Smart filter to keep relevant code lines and skip noise
	// private filterCodeLines(lines: string[]): string[] {
	// 	return lines.filter(line => {
	// 		const trimmed = line.trim();
	// 		if (!trimmed) return false;
	// 		if (trimmed.startsWith("#")) return false;
	// 		if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) return false;
	// 		if (trimmed.startsWith("@")) return false;
	// 		if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) return false;
	// 		if (trimmed.startsWith("def ") || trimmed.startsWith("class ")) return false;
	// 		return true;
	// 	});
	// }
}
