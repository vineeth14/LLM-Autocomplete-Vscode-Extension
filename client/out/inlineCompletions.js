"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInlineCompletions = registerInlineCompletions;
// THIS ISN'T BEING USED -> Implements a demo/test provider that looks for special comments above the cursor and creates inline completions based on those.
const vscode = require("vscode");
const vscode_1 = require("vscode");
function registerInlineCompletions(context) {
    const provider = {
        async provideInlineCompletionItems(document, position, _context, _token) {
            const regexp = /\/\/ \[(.+?),(.+?)\)(.*?):(.*)/;
            // if (position.line <= 0) {
            // 	return; // If cursor is at the top of the file, don't show completions
            // }
            const result = {
                items: [],
            };
            let offset = 1;
            while (offset > 0) {
                if (position.line - offset < 0) {
                    break;
                }
                const lineBefore = document.lineAt(position.line - offset).text;
                const matches = lineBefore.match(regexp);
                if (!matches) {
                    break;
                }
                offset++;
                const start = matches[1];
                const startInt = parseInt(start, 10);
                const end = matches[2];
                const endInt = end === "*"
                    ? document.lineAt(position.line).text.length
                    : parseInt(end, 10);
                const flags = matches[3];
                // const completeBracketPairs = flags.includes("b");
                const isSnippet = flags.includes("s");
                const text = matches[4].replace(/\\n/g, "\n");
                result.items.push({
                    insertText: isSnippet ? new vscode.SnippetString(text) : text,
                    range: new vscode_1.Range(position.line, startInt, position.line, endInt),
                    // completeBracketPairs,
                    //     });
                    // }
                    // if (result.items.length > 0) {
                    //     result.commands!.push({
                    //         command: 'demo-ext.command1',
                    //         title: 'My Inline Completion Demo Command',
                    //         arguments: [1, 2],
                    //     });
                    // }
                    command: {
                        command: "demo-ext.command1",
                        title: "My Inline Completion Demo Command",
                        arguments: [1, 2],
                    },
                });
            }
            return result;
        },
        // handleDidShowCompletionItem(_completionItem: vscode.InlineCompletionItem, _updatedInsertText: string): void {
        //     console.log('handleDidShowCompletionItem', _completionItem, _updatedInsertText);
        // },
        // handleDidPartiallyAcceptCompletionItem(_completionItem: vscode.InlineCompletionItem, _info: any): void {
        //     console.log('handleDidPartiallyAcceptCompletionItem', _completionItem, _info);
        // },
    };
    context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, provider
    // {
    // 	displayName: "LLM Autocomplete",
    // 	debounceDelayMs: 50,
    // }
    ));
}
//# sourceMappingURL=inlineCompletions.js.map