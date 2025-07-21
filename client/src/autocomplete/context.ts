import { TextDocument, Position } from "vscode";
import { Parameters } from "./prompt";
import { log } from "../extension";

const MAX_CONTEXT_LINES = 20; // More context for better understanding

export function getContext(document: TextDocument, position: Position): Parameters {
	log.appendLine(`[getContext] Called at position line:${position.line}, char:${position.character}`);
	
	const text = document.getText();
	const offset = document.offsetAt(position);

	const prefix = text.substring(0, offset);
	const suffix = text.substring(offset);

	// Split into lines and take the last N lines of the prefix and first N lines of the suffix
	const prefixLines = prefix.split("\n");
	const suffixLines = suffix.split("\n");

	const limitedPrefix = prefixLines.slice(-MAX_CONTEXT_LINES).join("\n");
	const limitedSuffix = suffixLines.slice(0, MAX_CONTEXT_LINES).join("\n");

	log.appendLine(`[getContext] Prefix length: ${limitedPrefix.length}, Suffix length: ${limitedSuffix.length}`);
	log.appendLine(`[getContext] Prefix ends with: "${limitedPrefix.slice(-50)}"`);
	log.appendLine(`[getContext] Suffix starts with: "${limitedSuffix.slice(0, 50)}"`);

	// The <CURSOR> marker is no longer needed with the new FIM prompt format
	// return `${limitedPrefix}<｜fim_middle｜>${limitedSuffix}`;
    return {
        prefix:limitedPrefix,
        suffix:limitedSuffix
    }
}
