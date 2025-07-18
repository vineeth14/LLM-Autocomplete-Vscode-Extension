"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMInlineCompletionProvider = void 0;
const extension_1 = require("../extension");
const vscode_1 = require("vscode");
class LLMInlineCompletionProvider {
    constructor() {
        this.lastTriggerTime = 0;
        this.debounceMs = 100;
        this.ollamaUrl = "http://localhost:11434";
        this.modelName = "gemma3n:e2b";
    }
    async provideInlineCompletionItems(document, position, context, token) {
        const now = Date.now();
        if (now - this.lastTriggerTime < this.debounceMs) {
            return [];
        }
        this.lastTriggerTime = now;
        const line = document.lineAt(position);
        const textBeforeCursor = line.text.substring(0, position.character);
        if (textBeforeCursor.trim().length === 0) {
            return [];
        }
        const contextLines = this.getContextLines(document, position);
        const suggestion = await this.getSuggestion(textBeforeCursor, document, position, contextLines, token);
        if (!suggestion || suggestion.trim().length === 0) {
            return [];
        }
        const item = new vscode_1.InlineCompletionItem(suggestion, new vscode_1.Range(position, position));
        return [item];
    }
    async getSuggestion(textBeforeCursor, document, position, contextLines, token) {
        // const fileExtension = path.extName(document.fileName)
        const language = document.languageId;
        const prompt = "You are a helpful code completion tool. \n" +
            "Only predict the next 5 words based on context I give you and send me the response";
        const suggestion = await this.callOllama(prompt + "\n" + contextLines.join("\n"), token);
        extension_1.log.appendLine("Suggestion Received" + suggestion);
        // return this.cleanSuggestion(sugg)
        if (textBeforeCursor.includes("console")) {
            extension_1.log.appendLine(document.languageId);
            return suggestion;
        }
        if (textBeforeCursor.includes("function")) {
            console.log("LANGUAGEID", document.languageId);
            return "() {\n\t\n}";
        }
        return undefined;
    }
    getContextLines(document, position) {
        const contextSize = 4000; //Adjust as needed, remember this is times 2 to account for both sides of the cursor
        const startLine = Math.max(0, position.line - contextSize);
        const endLine = Math.min(document.lineCount - 1, position.line + contextSize);
        const lines = [];
        for (let i = startLine; i <= endLine; i++) {
            if (i === position.line) {
                const currentLine = document.lineAt(i).text;
                lines.push(currentLine.substring(0, position.character));
            }
            else {
                lines.push(document.lineAt(i).text);
            }
        }
        return lines;
    }
    async callOllama(prompt, token) {
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.modelName,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    top_p: 0.9,
                    max_tokens: 50,
                    stop: ["\n\n", "```"],
                },
            }),
            signal: token.isCancellationRequested
                ? AbortSignal.timeout(1)
                : AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: !${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (typeof data === "object" &&
            data !== null &&
            "response" in data &&
            "done" in data) {
            const ollamaResponse = data;
            return ollamaResponse.response;
        }
        else {
            throw new Error("Invalid response format from Ollama API");
        }
    }
}
exports.LLMInlineCompletionProvider = LLMInlineCompletionProvider;
//# sourceMappingURL=suggestions.js.map