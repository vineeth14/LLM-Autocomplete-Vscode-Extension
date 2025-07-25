import * as path from "path";
import * as vscode from "vscode";
import { workspace, ExtensionContext, languages } from "vscode";

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";

import { LLMInlineCompletionProvider } from "./autocomplete/LLMInlineCompletionProvider";
import { runLatencyTests } from "./autocomplete/latency-test";

let client: LanguageClient;

// Global debug -> print to extension host output channel
export const log = vscode.window.createOutputChannel("LLM Tab Complete");
export const astLog = vscode.window.createOutputChannel("AST Testing");

export function activate(context: ExtensionContext) {
	log.appendLine("Extension activated");
	// log.show();
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join("server", "out", "server.js")
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.stdio },
		debug: {
			module: serverModule,
			transport: TransportKind.stdio,
		},
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for all documents by default
		documentSelector: [{ scheme: "file", language: "*" }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
		},
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		"llm-autocomplete language-server-id",
		"llm-autocomplete language server name",
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	const provider = new LLMInlineCompletionProvider();

	const disposable = languages.registerInlineCompletionItemProvider(
		{ pattern: "**" },
		provider
	);
	context.subscriptions.push(disposable);

	// Register latency test command
	const testCommand = vscode.commands.registerCommand('llm-autocomplete.runLatencyTests', runLatencyTests);
	context.subscriptions.push(testCommand);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
