type DocumentUri = string;
type DocumentBody = string;

export interface TextDocumentIdentifier {
	uri: DocumentUri;
}

export interface VersionedTextDocumentIdentifier
	extends TextDocumentIdentifier {
	version: number;
}

export interface TextDocumentContentChangeEvent {
	text: string;
}

export interface TextDocumentItem extends TextDocumentIdentifier {
	languageId: string;
	version: number;
	text: string;
}
export const documents = new Map<DocumentUri, DocumentBody>();
