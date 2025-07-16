import { RequestMessage } from "../../server";
import { documents, TextDocumentIdentifier } from "../../documents";
import * as fs from "fs";
import log from "../../log";

const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
interface CompletionItem {
	label: string;
}

interface CompletionList {
	isIncomplete: boolean;
	items: CompletionItem[];
}

interface Position {
	line: number;
	character: number;
}

interface TextDocumentPositionParams {
	textDocument: TextDocumentIdentifier;
	position: Position;
}
export interface CompletionParams extends TextDocumentPositionParams {}

export const completion = (message: RequestMessage): CompletionList | null => {
	const params = message.params as CompletionParams;
	const content = documents.get(params.textDocument.uri);
	if (!content) {
		return null;
	}
	const currentLine = content.split("\n")[params.position.line]; // Splits the document into lines and gets the line where the cursor is.
	const lineUntilCursor = currentLine.slice(0, params.position.character); // Slices that line up to the cursor's character position.
	//extract the current word being typed (after the last non-word character).
	const currentPrefix = lineUntilCursor.replace(/.*\W(.*?)/, "$1");

	const items = words
		.filter((word) => {
			return word.startsWith(currentPrefix);
		})
		.slice(0, 1000)
		.map((word) => {
			return { label: word };
		});
	log.write({
		completion: { content, currentLine, lineUntilCursor, currentPrefix },
	});
	return {
		isIncomplete: true,
		items,
	};
};
