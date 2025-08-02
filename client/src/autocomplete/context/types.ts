/**
 * TYPE DEFINITIONS FOR CONTEXT SYSTEM
 *
 * These types support both simple cursor-based context (currently active)
 * and sophisticated AST-based context extraction (currently inactive).
 */

import * as vscode from "vscode";

export interface ContextItem {
	text: string;

	uri: vscode.Uri;

	range: vscode.Range;

	type: ContextType;

	relevance?: number;
}

export type ContextType =
	| "function" // Function definitions (def)
	| "class" // Class definitions
	| "variable" // Variable assignments
	| "import" // Import statements
	| "method" // Class methods
	| "parameter" // Function parameters
	| "comment" // Comments and docstrings
	| "decorator"; // Python decorators (@)

export interface ContextConfig {
	/** Maximum number of context items to retrieve */
	maxItems: number;

	/** Maximum distance in lines to search for context */
	searchRadius: number;

	/** Whether to include function signatures */
	includeFunctionSignatures: boolean;

	/** Whether to include class hierarchies */
	includeClassHierarchy: boolean;

	/** Minimum relevance score to include an item */
	minRelevance: number;
}

/**
 * Result of context retrieval operation
 */
export interface ContextResult {
	/** Retrieved context items */
	items: ContextItem[];

	/** Time taken for retrieval in ms */
	retrievalTime: number;

	/** Any errors encountered during retrieval */
	errors: string[];
}

/**
 * Autocomplete snippet with scope information
 */
export interface AutocompleteSnippet {
	content: string;
	filepath: string;
	type: "code";
	description?: string; // Compressed docstring or comment
}
