import { TextDocument, Position } from "vscode";
import { Parameters } from "./prompt";

const MAX_CONTEXT_LINES = 40; // Max number of lines to use for context

export function getContext(document: TextDocument, position: Position): Parameters {
	const text = document.getText();
	const offset = document.offsetAt(position);

	const prefix = text.substring(0, offset);
	const suffix = text.substring(offset);

	// Split into lines and take the last N lines of the prefix and first N lines of the suffix
	const prefixLines = prefix.split("\n");
	const suffixLines = suffix.split("\n");

	const limitedPrefix = prefixLines.slice(-MAX_CONTEXT_LINES).join("\n");
	const limitedSuffix = suffixLines.slice(0, MAX_CONTEXT_LINES).join("\n");

	// The <CURSOR> marker is no longer needed with the new FIM prompt format
	// return `${limitedPrefix}<｜fim_middle｜>${limitedSuffix}`;
    return {
        prefix:limitedPrefix,
        suffix:limitedSuffix
    }
}
