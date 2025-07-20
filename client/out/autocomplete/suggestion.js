"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestion = getSuggestion;
const prompt_1 = require("./prompt");
const extension_1 = require("../extension");
const ollamaUrl = "http://localhost:11434";
const modelName = "qwen2.5-coder:1.5b";
async function callOllama(prompt, options, token) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const cancellationListener = token?.onCancellationRequested
        ? token.onCancellationRequested(() => {
            controller.abort();
        })
        : { dispose: () => { } };
    try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                options: options || {
                    temperature: 0.1,
                    top_p: 0.9,
                    num_predict: 20,
                    repeat_penalty: 1.1,
                    stop: ["<|endoftext|>"],
                },
            }),
            signal: signal,
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
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
    finally {
        clearTimeout(timeoutId);
        cancellationListener.dispose();
    }
}
async function getSuggestion(parameters, token) {
    try {
        extension_1.log.appendLine(`[getSuggestion] Called with parameters: ${JSON.stringify(parameters)}`);
        const promptObj = (0, prompt_1.systemPrompt)(parameters);
        const rawSuggestion = await callOllama(promptObj.content, promptObj.options, token);
        extension_1.log.appendLine(`[getSuggestion] Raw response from Ollama: "${rawSuggestion}"`);
        // Just clean up basic tokens and return the suggestion
        let suggestion = rawSuggestion
            .replace(/<\|fim_[^|]*\|>/g, "") // Remove FIM tokens
            .replace(/<\|[^|]*\|>/g, "") // Remove any other special tokens
            .trim();
        extension_1.log.appendLine(`[getSuggestion] After trimming: "${suggestion}"`);
        if (!suggestion || suggestion.trim().length === 0) {
            return undefined;
        }
        extension_1.log.appendLine(`[getSuggestion] Returning suggestion: "${suggestion}"`);
        return suggestion;
    }
    catch (err) {
        if (err?.name === "AbortError" ||
            (token && token.isCancellationRequested)) {
            return undefined;
        }
        extension_1.log.appendLine(`[getSuggestion] Error: ${err?.message || err}`);
        return undefined;
    }
}
function isValidCodeCompletion(response) {
    const invalidPhrases = [
        "it looks like",
        "however",
        "here's a",
        "let me",
        "you're trying to",
        "i can help",
        "the issue is",
    ];
    return !invalidPhrases.some((phrase) => response.toLowerCase().includes(phrase));
}
//# sourceMappingURL=suggestion.js.map