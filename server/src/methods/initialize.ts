import { RequestMessage } from "../server";
type ServerCapabilities = Record<string, unknown>;
interface InitializeResult {
	capabilities: ServerCapabilities;
	serverInfo?: {
		name: string;
		version?: string;
	};
}

// textDocumentSync:1 -> documents are synced by always sending the full content of the document
export const initialize = (message: RequestMessage): InitializeResult => {
	return {
		capabilities: { 
			textDocumentSync: 1 
		},
		serverInfo: {
			name: "llm-autocomplete",
			version: "0.0.1",
		},
	};
};
