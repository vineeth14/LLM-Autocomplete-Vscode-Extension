import * as vscode from "vscode";
import { ContextItem } from "./types";
import { getAst } from "./ast";
import { astLog } from "../../extension";

/**
 * Service responsible for retrieving relevant context for code completion
 * Uses simple AST parsing to gather semantic information from single files
 */
export class ContextRetrievalService {
	/**
	 * Main method to get context around the cursor position
	 * @param document - The current document
	 * @param position - Cursor position
	 * @returns Array of context items
	 */
	async getContext(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<ContextItem[]> {
		if (document.languageId !== "python") {
			return [];
		}

		const context: ContextItem[] = [];
		const text = document.getText();

		// Get AST and log it
		try {
			const ast = await getAst(document.uri.fsPath, text);
		} catch (error) {
			astLog.appendLine(`[ContextRetrieval] Error generating AST: ${error}`);
			astLog.show();
		}

		// 1. Parse imports at top of file
		// 2. Find function/class definitions in scope
		// 3. Get variable assignments in current scope
		// 4. Extract relevant comments/docstrings

		return context;
	}

	/**
	 * Extract import statements from file
	 */
	private extractImports(document: vscode.TextDocument): ContextItem[] {
		// TODO: Parse import statements
		// - import module
		// - from module import item
		// - import module as alias
		return [];
	}

	/**
	 * Find function definitions in the current scope
	 */
	private findFunctionDefinitions(
		document: vscode.TextDocument,
		position: vscode.Position
	): ContextItem[] {
		// TODO: Parse function definitions
		// - def function_name(params):
		// - Consider scope (class methods, nested functions)
		return [];
	}

	/**
	 * Find class definitions and their methods
	 */
	private findClassDefinitions(document: vscode.TextDocument): ContextItem[] {
		// TODO: Parse class definitions
		// - class ClassName:
		// - class methods and properties
		return [];
	}

	/**
	 * Extract variable assignments in current scope
	 */
	private findVariableAssignments(
		document: vscode.TextDocument,
		position: vscode.Position
	): ContextItem[] {
		// TODO: Find variable assignments
		// - var = value
		// - Consider scope (local vs global)
		return [];
	}

	/**
	 * Get relevant docstrings and comments
	 */
	private extractComments(
		document: vscode.TextDocument,
		position: vscode.Position
	): ContextItem[] {
		// TODO: Extract relevant comments
		// - Function docstrings
		// - Inline comments
		// - Class docstrings
		return [];
	}

	/**
	 * Format context items into a string suitable for the LLM prompt
	 */
	formatContextForPrompt(items: ContextItem[]): string {
		if (items.length === 0) return "";

		let result = "# Relevant context:\n";

		// Group by type for better organization
		const imports = items.filter((i) => i.type === "import");
		const functions = items.filter((i) => i.type === "function");
		const classes = items.filter((i) => i.type === "class");
		const variables = items.filter((i) => i.type === "variable");

		// TODO: Format each group appropriately

		return result;
	}
}
