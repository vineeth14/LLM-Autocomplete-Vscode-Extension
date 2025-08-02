import { CancellationToken } from "vscode";
import { systemPrompt } from "./prompt";
import {
	Parameters,
	OllamaResponse,
	GeminiResponse,
	CompletionOptions,
} from "./types";
import { log } from "../extension";
import { Agent } from "http";
import * as dotenv from "dotenv";
import * as path from "path";
import { filterSuggestion } from "./filters/suggestion-filter";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

const DEFAULT_PROVIDER = process.env.LLM_PROVIDER || "ollama_local";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION =
	process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

// Dual Ollama configuration
const ollamaLocalUrl = process.env.OLLAMA_LOCAL_URL || "http://localhost:11434";
const ollamaServerUrl = process.env.OLLAMA_SERVER_URL || process.env.OLLAMA_URL || "http://localhost:11434";
const ollamaLocalModel = process.env.OLLAMA_LOCAL_MODEL || "starcoder:3b";
const ollamaServerModel = process.env.OLLAMA_SERVER_MODEL || process.env.OLLAMA_MODEL || "starcoder:3b";

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

// HTTP Agent for connection reuse - optimized for starcoder:3b
const httpAgent = new Agent({
	keepAlive: true,
	maxSockets: parseInt(process.env.MAX_SOCKETS || "2"),
	maxFreeSockets: parseInt(process.env.MAX_FREE_SOCKETS || "1"),
	timeout: parseInt(process.env.HTTP_TIMEOUT || "3000"),
});

async function callProvider(
	prompt: string,
	options?: CompletionOptions,
	token?: CancellationToken
): Promise<string> {
	const provider = options?.provider || DEFAULT_PROVIDER;
	switch (provider) {
		case "ollama_local":
			return callOllamaLocal(prompt, options, token);
		case "ollama_server":
			return callOllamaServer(prompt, options, token);
		case "gemini":
			return callGemini(prompt, options, token);
		default:
			throw new Error(`Unknown provider: ${provider}`);
	}
}

async function callGemini(
	prompt: string,
	options?: CompletionOptions,
	token?: CancellationToken
): Promise<string> {
	const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			const response = await fetch(geminiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": GEMINI_API_KEY,
				},
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: {
						temperature: options?.temperature || 0,
						maxOutputTokens: options?.num_predict || 12,
					},
				}),
			});

			if (response.status === 429) {
				// Rate limited - exponential backoff
				const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
				log.appendLine(`[Gemini] Rate limited, retrying in ${delay}ms`);
				await new Promise(resolve => setTimeout(resolve, delay));
				retryCount++;
				continue;
			}

			if (!response.ok) {
				throw new Error(`Gemini API error: ${response.status}`);
			}

			const data = (await response.json()) as GeminiResponse;
			return data.candidates[0]?.content?.parts[0]?.text || "";
		} catch (error) {
			if (retryCount === maxRetries - 1) {
				throw error; // Final retry failed
			}
			retryCount++;
		}
	}

	throw new Error("Max retries exceeded");
}


async function callOllamaLocal(
	prompt: string,
	options?: CompletionOptions,
	token?: CancellationToken
): Promise<string> {
	const controller = new AbortController();
	try {
		const requestBody = JSON.stringify({
			model: ollamaLocalModel,
			prompt: prompt,
			stream: false,
			keep_alive: "10m",
			options: options || {
				temperature: 0,
				top_p: 0.95,
				num_predict: 50,
				repeat_penalty: 1.1,
				stop: [
					"<fim_prefix>",
					"<fim_suffix>",
					"<fim_middle>",
					"\n\n",
				],
			},
		});

		const response = await fetch(`${ollamaLocalUrl}/api/generate`, {
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
			throw new Error(
				`Ollama Local API error: ${response.status} ${response.statusText}`
			);
		}
		const data = await response.json();
		if (
			typeof data === "object" &&
			data !== null &&
			"response" in data &&
			"done" in data
		) {
			const ollamaResponse = data as OllamaResponse;
			return ollamaResponse.response;
		} else {
			throw new Error("Invalid response format from Ollama Local API");
		}
	} finally {
	}
}

async function callOllamaServer(
	prompt: string,
	options?: CompletionOptions,
	token?: CancellationToken
): Promise<string> {
	const controller = new AbortController();
	try {
		const requestBody = JSON.stringify({
			model: ollamaServerModel,
			prompt: prompt,
			stream: false,
			keep_alive: "10m",
			options: options || {
				temperature: 0.1,
				top_p: 0.3,
				num_predict: 30,
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

		const response = await fetch(`${ollamaServerUrl}/api/generate`, {
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
			throw new Error(
				`Ollama Server API error: ${response.status} ${response.statusText}`
			);
		}
		const data = await response.json();
		if (
			typeof data === "object" &&
			data !== null &&
			"response" in data &&
			"done" in data
		) {
			const ollamaResponse = data as OllamaResponse;
			return ollamaResponse.response;
		} else {
			throw new Error("Invalid response format from Ollama Server API");
		}
	} finally {
	}
}

export async function getSuggestion(
	parameters: Parameters,
	token?: CancellationToken
): Promise<string | undefined> {
	try {
		const promptObj = systemPrompt(parameters);

		const inferenceStart = performance.now();
		const rawSuggestion = await callProvider(
			promptObj.content,
			promptObj.options,
			token
		);
		const inferenceEnd = performance.now();

		let basicCleaned = rawSuggestion
			.replace(/<fim_prefix>/g, "")
			.replace(/<fim_suffix>/g, "")
			.replace(/<fim_middle>/g, "")
			.replace(/<\|[^|]*\|>/g, "")
			.trim();

		const filteredSuggestion = filterSuggestion(basicCleaned);

		const inferenceTime = inferenceEnd - inferenceStart;
		log.appendLine(`[Timing] Inference: ${inferenceTime.toFixed(1)}ms`);

		if (!filteredSuggestion) {
			return undefined;
		}

		log.appendLine(`[Final] "${filteredSuggestion}"`);
		return filteredSuggestion;
	} catch (err: any) {
		if (
			err?.name === "AbortError" ||
			(token && token.isCancellationRequested)
		) {
			return undefined;
		}
		log.appendLine(`[getSuggestion] Error: ${err?.message || err}`);
		return undefined;
	}
}
