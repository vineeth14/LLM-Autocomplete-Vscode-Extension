import * as vscode from "vscode";

export interface InputExcerpt {
	editableRange: vscode.Range;
	prompt: string;
	speculatedOutput: string;
}

export interface ScopeResult {
	range: vscode.Range;
	remainingEditTokens: number;
}

export interface TokenBudget {
	editableRegionTokenLimit: number;
	contextTokenLimit: number;
}
