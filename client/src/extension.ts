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
import { ZetaInlineCompletionProvider } from "./autocomplete/ZetaInlineCompletionProvider";
import { PredictionCommands } from "./autocomplete/prediction-navigator";
import {
	runLatencyTests,
	runPartialCompletionTests,
	runFunctionCompletionTests,
} from "./tests/latency-test";
import { runLLMJudgeTests } from "./tests/llm-judge-test";

let client: LanguageClient;

// Global debug -> print to extension host output channels
export const log = vscode.window.createOutputChannel("LLM Tab Complete");
export const contextLog = vscode.window.createOutputChannel("Context");

export function activate(context: ExtensionContext) {
	log.appendLine("Extension activated");
	log.show();
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

	const provider = new ZetaInlineCompletionProvider(context);
	providerInstance = provider;

	const disposable = languages.registerInlineCompletionItemProvider(
		{ pattern: "**" },
		provider
	);
	context.subscriptions.push(disposable);

	// Register prediction navigation commands
	const predictionCommands = new PredictionCommands(provider.getPredictionNavigator());
	
	const acceptPredictionCommand = vscode.commands.registerCommand(
		"zeta.acceptPrediction",
		() => predictionCommands.acceptCurrentPrediction()
	);
	const cancelPredictionsCommand = vscode.commands.registerCommand(
		"zeta.cancelPredictions", 
		() => predictionCommands.cancelAllPredictions()
	);
	
	context.subscriptions.push(
		acceptPredictionCommand, 
		cancelPredictionsCommand
	);

	// Register document change listener for prediction validation
	const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (provider.getPredictionNavigator().isActive()) {
			// Simple validation: if there are significant changes, clear predictions
			const hasSignificantChanges = event.contentChanges.some(change => {
				// Consider changes significant if they're not just whitespace
				return change.text.trim() !== '' || change.rangeLength > 0;
			});

			if (hasSignificantChanges) {
				log.appendLine("[Extension] Document changed significantly, validating predictions");
				provider.getPredictionNavigator().validatePredictions();
			}
		}
	});
	
	context.subscriptions.push(documentChangeListener);

	// Register latency test commands
	const testCommand = vscode.commands.registerCommand(
		"llm-autocomplete.runLatencyTests",
		runLatencyTests
	);
	const partialTestCommand = vscode.commands.registerCommand(
		"llm-autocomplete.runPartialTests",
		runPartialCompletionTests
	);
	const functionTestCommand = vscode.commands.registerCommand(
		"llm-autocomplete.runFunctionTests",
		runFunctionCompletionTests
	);
	const judgeTestCommand = vscode.commands.registerCommand(
		"llm-autocomplete.runJudgeTests",
		runLLMJudgeTests
	);

	context.subscriptions.push(
		testCommand,
		partialTestCommand,
		functionTestCommand,
		judgeTestCommand
	);
}

let providerInstance: ZetaInlineCompletionProvider | undefined;

export function deactivate(): Thenable<void> | undefined {
	// Dispose provider resources
	if (providerInstance) {
		providerInstance.dispose();
		providerInstance = undefined;
	}
	
	if (!client) {
		return undefined;
	}
	return client.stop();
}
