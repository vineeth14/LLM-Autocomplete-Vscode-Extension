# LLM Autocomplete Vscode Extension

NOTE: The starting template is based on [lsp-sample from vscode-extension-samples][sample]

This is the project I've choosen for 'Impossible Day' at Recurse Center.

"Self-contained" in this context means that this extension bundles its own language server code rather than wrapping an existing language server executable.

As an MVP, this omits

- linting
- testing
- behavior in the language server itself (besides connecting and listening to document changes)

## Getting Started

1. Clone this repo
2. Replace items in `package.json` marked `llm-autocomplete` with text related to your extension
3. Do the same for `client/package.json` and `server/package.json`
4. Do the same in `client/src/extension.ts`
5. Run `npm install` from the repo root.

To make it easy to get started, this language server will run on _every_ file type by default. To target specific languages, change

`package.json`'s `activationEvents` to something like

```
"activationEvents": [
  "onLanguage:plaintext"
],
```

And change the `documentSelector` in `client/src/extension.ts` to replace the `*` (e.g.)

```
documentSelector: [{ scheme: "file", language: "plaintext" }],
```

## Anatomy

```
.
├── .vscode
│   ├── launch.json         // Tells VS Code how to launch our extension
│   └── tasks.json          // Tells VS Code how to build our extension
├── LICENSE
├── README.md
├── client
│   ├── package-lock.json   // Client dependencies lock file
│   ├── package.json        // Client manifest
│   ├── src
│   │   └── extension.ts    // Code to tell VS Code how to run our language server
│   └── tsconfig.json       // TypeScript config for the client
├── package-lock.json       // Top-level Dependencies lock file
├── package.json            // Top-level manifest
├── server
│   ├── package-lock.json   // Server dependencies lock file
│   ├── package.json        // Server manifest
│   ├── src
│   │   └── server.ts       // Language server code
│   └── tsconfig.json       // TypeScript config for the client
└── tsconfig.json           // Top-level TypeScript config
```

[debug]: https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#debugging-both-client-and-server
[sample]: https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample
[publish]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
[vsix]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions
