import { Range } from "vscode";

export interface HighlightEdit {
	range: Range;
	newText: string;
	description?: string;
}