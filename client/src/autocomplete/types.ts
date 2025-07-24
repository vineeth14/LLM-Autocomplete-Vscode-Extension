/**
 * Shared types and interfaces for the autocomplete system
 */

export interface Parameters {
	prefix: string;
	suffix: string;
	context?: string;
	// Enhanced position information
	cursorOffset?: number;
	isAtEndOfLine?: boolean;
	currentLineText?: string;
}

export interface AutocompleteTemplate {
	template: string;
	completionOptions: CompletionOptions;
}

export interface CompletionOptions {
	stop: string[];
	temperature?: number;
	top_p?: number;
	num_predict?: number;
	repeat_penalty?: number;
}

export interface OllamaResponse {
	response: string;
	done: boolean;
}

export interface PromptResult {
	content: string;
	options: CompletionOptions;
}