"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const path = require("path");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const suggestions_1 = require("./methods/suggestions");
let client;
// Global debug -> print to extension host output channel
exports.log = vscode.window.createOutputChannel("LLM Tab Complete");
function activate(context) {
    exports.log.appendLine("Extension activated");
    // log.show();
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
    const provider = new suggestions_1.LLMInlineCompletionProvider();
    const disposable = vscode_1.languages.registerInlineCompletionItemProvider({ pattern: "**" }, provider);
    context.subscriptions.push(disposable);
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map