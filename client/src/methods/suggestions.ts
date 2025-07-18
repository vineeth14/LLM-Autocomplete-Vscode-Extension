import { error } from "console";
import { log } from "../extension";
import {
	TextDocument,
	Position,
	InlineCompletionContext,
	CancellationToken,
	InlineCompletionItem,
	Range,
} from "vscode";

interface OllamaResponse {
	response: string;
	done: boolean;
}
export class LLMInlineCompletionProvider {
	private lastTriggerTime: number = 0;
	private debounceMs: number = 100;
	private ollamaUrl: string = "http://localhost:11434";
	private modelName: string = "gemma3n:e2b";

	async provideInlineCompletionItems(
		document: TextDocument,
		position: Position,
		context: InlineCompletionContext,
		token: CancellationToken
	): Promise<InlineCompletionItem[]> {
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
		const suggestion = await this.getSuggestion(
			textBeforeCursor,
			document,
			position,
			contextLines,
			token
		);
		if (!suggestion || suggestion.trim().length === 0) {
			return [];
		}
		const item = new InlineCompletionItem(
			suggestion,
			new Range(position, position)
		);
		return [item];
	}
	private async getSuggestion(
		textBeforeCursor: string,
		document: TextDocument,
		position: Position,
		contextLines: string[],
		token: CancellationToken
	): Promise<string | undefined> {
		// const fileExtension = path.extName(document.fileName)
		const language = document.languageId;

		const prompt =
			"You are a helpful code completion tool. \n" +
			"Only predict the next 5 words based on context I give you and send me the response";

		const suggestion = await this.callOllama(prompt + "\n" + contextLines.join("\n"), token);
		log.appendLine("Suggestion Received" + suggestion);
		// return this.cleanSuggestion(sugg)
		if (textBeforeCursor.includes("console")) {
			log.appendLine(document.languageId);
			return suggestion;
		}

		if (textBeforeCursor.includes("function")) {
			console.log("LANGUAGEID", document.languageId);
			return "() {\n\t\n}";
		}
		return undefined;
	}

	private getContextLines(
		document: TextDocument,
		position: Position
	): string[] {
		const contextSize = 4000; //Adjust as needed, remember this is times 2 to account for both sides of the cursor
		const startLine = Math.max(0, position.line - contextSize);
		const endLine = Math.min(
			document.lineCount - 1,
			position.line + contextSize
		);
		const lines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			if (i === position.line) {
				const currentLine = document.lineAt(i).text;
				lines.push(currentLine.substring(0, position.character));
			} else {
				lines.push(document.lineAt(i).text);
			}
		}
		return lines;
	}
	private async callOllama(
		prompt: string,
		token: CancellationToken
	): Promise<string> {
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
			throw new Error(
				`Ollama API error: !${response.status} ${response.statusText}`
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
	}
}
