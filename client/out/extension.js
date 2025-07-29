"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextLog = exports.log = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const path = require("path");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const LLMInlineCompletionProvider_1 = require("./autocomplete/LLMInlineCompletionProvider");
const latency_test_1 = require("./tests/latency-test");
let client;
// Global debug -> print to extension host output channels
exports.log = vscode.window.createOutputChannel("LLM Tab Complete");
exports.contextLog = vscode.window.createOutputChannel("Context");
function activate(context) {
    exports.log.appendLine("Extension activated");
    exports.log.show();
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join("server", "out", "server.js"));
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.stdio },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.stdio,
        },
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server for all documents by default
        documentSelector: [{ scheme: "file", language: "*" }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher("**/.clientrc"),
        },
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient("llm-autocomplete language-server-id", "llm-autocomplete language server name", serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
    const provider = new LLMInlineCompletionProvider_1.LLMInlineCompletionProvider();
    const disposable = vscode_1.languages.registerInlineCompletionItemProvider({ pattern: "**" }, provider);
    context.subscriptions.push(disposable);
    // Register latency test commands
    const testCommand = vscode.commands.registerCommand("llm-autocomplete.runLatencyTests", latency_test_1.runLatencyTests);
    const partialTestCommand = vscode.commands.registerCommand("llm-autocomplete.runPartialTests", latency_test_1.runPartialCompletionTests);
    const functionTestCommand = vscode.commands.registerCommand("llm-autocomplete.runFunctionTests", latency_test_1.runFunctionCompletionTests);
    context.subscriptions.push(testCommand, partialTestCommand, functionTestCommand);
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map