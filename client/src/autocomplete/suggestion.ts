import { CancellationToken } from "vscode";
import { systemPrompt, Parameters } from "./prompt";
import { log } from "../extension";

interface OllamaResponse {
	response: string;
	done: boolean;
}

const ollamaUrl = "http://localhost:11434";
const modelName = "starcoder:3b";

async function callOllama(
	prompt: string,
	options?: any,
	token?: CancellationToken
): Promise<string> {
	const controller = new AbortController();
	const signal = controller.signal;
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	const cancellationListener = token?.onCancellationRequested
		? token.onCancellationRequested(() => {
				controller.abort();
		  })
		: { dispose: () => {} };
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
			throw new Error(
				`Ollama API error: ${response.status} ${response.statusText}`
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
			throw new Error("Invalid response format from Ollama API");
		}
	} finally {
		clearTimeout(timeoutId);
		cancellationListener.dispose();
	}
}

export async function getSuggestion(
	parameters: Parameters,
	token?: CancellationToken
): Promise<string | undefined> {
	try {
		log.appendLine(
			`[getSuggestion] Called with parameters: ${JSON.stringify(parameters)}`
		);
		const promptObj = systemPrompt(parameters);

		const rawSuggestion = await callOllama(
			promptObj.content,
			promptObj.options,
			token
		);
		log.appendLine(
			`[getSuggestion] Raw response from Ollama: "${rawSuggestion}"`
		);

		// Just clean up basic tokens and return the suggestion
		let suggestion = rawSuggestion
			.replace(/<\|fim_[^|]*\|>/g, "") // Remove FIM tokens
			.replace(/<\|[^|]*\|>/g, "") // Remove any other special tokens
			.trim();

		log.appendLine(`[getSuggestion] After trimming: "${suggestion}"`);

		// Filter out conversational responses that start with explanatory text
		if (
			suggestion.toLowerCase().startsWith("it looks like") ||
			suggestion.toLowerCase().startsWith("however") ||
			suggestion.toLowerCase().startsWith("here's") ||
			suggestion.includes("issues with your code") ||
			suggestion.includes("corrected version")
		) {
			log.appendLine(`[getSuggestion] Filtered out conversational response`);
			return undefined;
		}

		if (!suggestion || suggestion.trim().length === 0) {
			return undefined;
		}

		log.appendLine(`[getSuggestion] Returning suggestion: "${suggestion}"`);
		return suggestion;
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

function isValidCodeCompletion(response: string): boolean {
	const invalidPhrases = [
		"it looks like",
		"however",
		"here's a",
		"let me",
		"you're trying to",
		"i can help",
		"the issue is",
	];
	return !invalidPhrases.some((phrase) =>
		response.toLowerCase().includes(phrase)
	);
}
