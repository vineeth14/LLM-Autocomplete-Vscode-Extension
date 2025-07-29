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
	provider?: "ollama" | "gemini";
}

export interface OllamaResponse {
	response: string;
	done: boolean;
}

export interface GeminiResponse {
	candidates: Array<{
		content: {
			parts: Array<{
				text: string;
			}>;
		};
		finishReason?: string;
	}>;
	usageMetadata?: {
		promptTokenCount: number;
		candidatesTokenCount: number;
		totalTokenCount: number;
	};
}

export interface PromptResult {
	content: string;
	options: CompletionOptions;
}
