"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestion = getSuggestion;
const prompt_1 = require("./prompt");
const extension_1 = require("../extension");
const http_1 = require("http");
const ollamaUrl = "http://localhost:11434";
const modelName = "starcoder:3b";
// HTTP Agent for connection reuse - optimized for starcoder:3b
const httpAgent = new http_1.Agent({
    keepAlive: true,
    maxSockets: 2,
    maxFreeSockets: 1,
    timeout: 3000,
});
async function callOllama(prompt, options, token) {
    const controller = new AbortController();
    // const signal = controller.signal;
    // const timeoutId = setTimeout(() => controller.abort(), 5000);
    //  const cancellationListener = token?.onCancellationRequested
    //    ? token.onCancellationRequested(() => {
    //        controller.abort();
    //      })
    //    : { dispose: () => {} };
    try {
        const jsonStart = performance.now();
        const requestBody = JSON.stringify({
            model: modelName,
            prompt: prompt,
            stream: false,
            keep_alive: "10m",
            options: options || {
                temperature: 0.1,
                top_p: 0.3,
                num_predict: 12,
                repeat_penalty: 1.1,
                stop: [
                    "<fim_prefix>",
                    "<fim_suffix>",
                    "<fim_middle>",
                    "\n\n",
                    "\n\ndef ",
                    "\n\nclass ",
                    "\n\nif ",
                ],
            },
        });
        const jsonEnd = performance.now();
        const fetchStart = performance.now();
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Connection: "keep-alive",
            },
            body: requestBody,
            // signal: signal,
            // @ts-ignore - TypeScript doesn't recognize agent in fetch
            agent: httpAgent,
        });
        const fetchEnd = performance.now();
        extension_1.log.appendLine(`[HTTP] JSON serialize: ${(jsonEnd - jsonStart).toFixed(1)}ms | Fetch: ${(fetchEnd - fetchStart).toFixed(1)}ms`);
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }
        const parseStart = performance.now();
        const data = await response.json();
        const parseEnd = performance.now();
        extension_1.log.appendLine(`[HTTP] JSON parse: ${(parseEnd - parseStart).toFixed(1)}ms`);
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
        //clearTimeout(timeoutId);
        //cancellationListener.dispose();
    }
}
async function getSuggestion(parameters, token) {
    const startTime = performance.now();
    try {
        const promptObj = (0, prompt_1.systemPrompt)(parameters);
        const rawSuggestion = await callOllama(promptObj.content, promptObj.options, token);
        // Clean up StarCoder FIM tokens and other special tokens
        const cleanStart = performance.now();
        let suggestion = rawSuggestion
            .replace(/<fim_prefix>/g, "")
            .replace(/<fim_suffix>/g, "")
            .replace(/<fim_middle>/g, "")
            .replace(/<\|[^|]*\|>/g, "") // Remove any other special tokens
            .trim();
        const cleanEnd = performance.now();
        extension_1.log.appendLine(`[Processing] String cleanup: ${(cleanEnd - cleanStart).toFixed(1)}ms`);
        // Filter out conversational responses that start with explanatory text
        if (suggestion.toLowerCase().startsWith("it looks like") ||
            suggestion.toLowerCase().startsWith("however") ||
            suggestion.toLowerCase().startsWith("here's") ||
            suggestion.includes("issues with your code") ||
            suggestion.includes("corrected version")) {
            return undefined;
        }
        if (!suggestion || suggestion.trim().length === 0) {
            return undefined;
        }
        const endTime = performance.now();
        const duration = endTime - startTime;
        extension_1.log.appendLine(`[Performance] Suggestion took ${duration.toFixed(1)}ms`);
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