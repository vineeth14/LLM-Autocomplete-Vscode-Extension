import { start } from "repl";
import { log } from "../extension";
import { Parameters, AutocompleteTemplate, PromptResult } from "./types";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// StarCoder FIM template (for local Ollama)
const ollamaLocalTemplate: AutocompleteTemplate = {
	template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
	completionOptions: {
		temperature: 0,
		top_p: 0.95,
		num_predict: 50,
		repeat_penalty: 1.1,
		stop: ["<fim_prefix>", "<fim_suffix>", "<fim_middle>", "\n\n"],
		provider: "ollama_local",
	},
};

// Server Ollama template (customizable for different server models)
const ollamaServerTemplate: AutocompleteTemplate = {
	template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
	completionOptions: {
		temperature: 0.1,
		top_p: 0.3,
		num_predict: 30,
		repeat_penalty: 1.1,
		stop: [
			"<fim_prefix>",
			"<fim_suffix>",
			"<fim_middle>",
			"\n\n",
			"\n\ndef",
			"\n\nclass",
		],
		provider: "ollama_server",
	},
};

// Gemini completion template
const geminiTemplate: AutocompleteTemplate = {
	template: `<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>`,
	completionOptions: {
		temperature: 0,
		top_p: 0.3,
		num_predict: 30,
		repeat_penalty: 1.1,
		stop: [
			"\n\n",
			"<fim_prefix>",
			"<fim_suffix>",
			"<fim_middle>",
			"def ",
			"class ",
			"import ",
		],
		provider: "gemini",
	},
};

//const qwenFimTemplate: AutocompleteTemplate = {
// template: "<|fim_prefix|>{{{prefix}}}<|fim_suffix|>{{{suffix}}}<|fim_middle|>",
// completionOptions: {
// 	temperature: 0.3,
// 	top_p: 0.95,
// 	num_predict: 30,
// 	repeat_penalty: 1.1,
// 	stop: ["<|fim_prefix|>", "<|fim_suffix|>", "<|fim_middle|>", "<|endoftext|>", "\n\n"],
// },
// }//;

export const systemPrompt = (parameters: Parameters | null): PromptResult => {
	const prefix = parameters?.prefix || "";
	const suffix = parameters?.suffix || "";
	const provider = process.env.LLM_PROVIDER || "ollama_local";

	// Use simple FIM template with just cursor context
	// Don't trim prefix to preserve indentation context
	const cleanPrefix = prefix;
	const cleanSuffix = suffix.trimEnd();

	// Choose template based on provider
	let template: AutocompleteTemplate;
	switch (provider) {
		case "gemini":
			template = geminiTemplate;
			break;
		case "ollama_server":
			template = ollamaServerTemplate;
			break;
		case "ollama_local":
		default:
			template = ollamaLocalTemplate;
			break;
	}

	const prompt = template.template
		.replace("{{{prefix}}}", cleanPrefix)
		.replace("{{{suffix}}}", cleanSuffix);

	return {
		content: prompt,
		options: template.completionOptions,
	};
};
