"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestion = getSuggestion;
const prompt_1 = require("./prompt");
const extension_1 = require("../extension");
const http_1 = require("http");
const dotenv = require("dotenv");
const path = require("path");
const suggestion_filter_1 = require("./filters/suggestion-filter");
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });
const DEFAULT_PROVIDER = process.env.LLM_PROVIDER || "ollama";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
const modelName = process.env.OLLAMA_MODEL || "starcoder:3b";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
// HTTP Agent for connection reuse - optimized for starcoder:3b
const httpAgent = new http_1.Agent({
    keepAlive: true,
    maxSockets: parseInt(process.env.MAX_SOCKETS || "2"),
    maxFreeSockets: parseInt(process.env.MAX_FREE_SOCKETS || "1"),
    timeout: parseInt(process.env.HTTP_TIMEOUT || "3000"),
});
async function callProvider(prompt, options, token) {
    const provider = options?.provider || DEFAULT_PROVIDER;
    switch (provider) {
        case "ollama":
            return callOllama(prompt, options, token);
        case "gemini":
            return callGemini(prompt, options, token);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
async function callGemini(prompt, options, token) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options?.temperature || 0.1,
                maxOutputTokens: options?.num_predict || 12,
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }
    const data = (await response.json());
    return data.candidates[0]?.content?.parts[0]?.text || "";
}
async function callOllama(prompt, options, token) {
    const controller = new AbortController();
    try {
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
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Connection: "keep-alive",
            },
            body: requestBody,
            // @ts-ignore - TypeScript doesn't recognize agent in fetch
            agent: httpAgent,
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
    }
}
async function getSuggestion(parameters, token) {
    try {
        const promptObj = (0, prompt_1.systemPrompt)(parameters);
        const inferenceStart = performance.now();
        const rawSuggestion = await callProvider(promptObj.content, promptObj.options, token);
        const inferenceEnd = performance.now();
        let basicCleaned = rawSuggestion
            .replace(/<fim_prefix>/g, "")
            .replace(/<fim_suffix>/g, "")
            .replace(/<fim_middle>/g, "")
            .replace(/<\|[^|]*\|>/g, "")
            .trim();
        const filteredSuggestion = (0, suggestion_filter_1.filterSuggestion)(basicCleaned);
        const inferenceTime = inferenceEnd - inferenceStart;
        extension_1.log.appendLine(`[Timing] Inference: ${inferenceTime.toFixed(1)}ms`);
        if (!filteredSuggestion) {
            return undefined;
        }
        extension_1.log.appendLine(`[Final] "${filteredSuggestion}"`);
        return filteredSuggestion;
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
//# sourceMappingURL=suggestion.js.map