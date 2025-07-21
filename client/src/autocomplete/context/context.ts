import { TextDocument, Position } from "vscode";
import { Parameters } from "./../types";
import { log } from "../../extension";

const MAX_CONTEXT_LINES = 100; // More context for better understanding

export function getContext(
	document: TextDocument,
	position: Position
): Parameters {
	log.appendLine(
		`[getContext] Called at position line:${position.line}, char:${position.character}`
	);

	const text = document.getText();
	const offset = document.offsetAt(position);

	const prefix = text.substring(0, offset);
	const suffix = text.substring(offset);

	// Split into lines and take the last N lines of the prefix and first N lines of the suffix
	const prefixLines = prefix.split("\n");
	const suffixLines = suffix.split("\n");

	const limitedPrefix = prefixLines.slice(-MAX_CONTEXT_LINES).join("\n");
	const limitedSuffix = suffixLines.slice(0, MAX_CONTEXT_LINES).join("\n");

	return {
		prefix: prefix,
		suffix: suffix,
	};
}
