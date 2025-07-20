import { log } from "../extension";

export interface Parameters {
	prefix: string;
	suffix: string;
	context?: string;
}

export interface AutocompleteTemplate {
	template: string;
	completionOptions: {
		stop: string[];
		temperature?: number;
		top_p?: number;
		num_predict?: number;
		repeat_penalty?: number;
	};
}

const qwenCoderFimTemplate: AutocompleteTemplate = {
	template: "{{{prefix}}}",
	completionOptions: {
		temperature: 0.3,
		top_p: 0.95,
		num_predict: 100,
		repeat_penalty: 1.05,
		stop: []
	},
};

export const systemPrompt = (parameters: Parameters | null) => {
	const prefix = parameters?.prefix || "";
	const suffix = parameters?.suffix || "";

	// Use the simplified FIM template
	const prompt = qwenCoderFimTemplate.template
		.replace("{{{prefix}}}", prefix)
		.replace("{{{suffix}}}", suffix);

	log.appendLine("prompt: " + prompt);
	return {
		content: prompt,
		options: qwenCoderFimTemplate.completionOptions,
	};
};
