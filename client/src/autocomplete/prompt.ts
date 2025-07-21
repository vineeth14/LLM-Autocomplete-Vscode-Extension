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
	template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
	completionOptions: {
		temperature: 0.1,
		top_p: 0.3,
		num_predict: 30,
		repeat_penalty: 1.05,
		stop: [
			"<fim_prefix>", 
			"<fim_suffix>", 
			"<fim_middle>",
			"\n\n"
		]
	},
};

export const systemPrompt = (parameters: Parameters | null) => {
	const prefix = parameters?.prefix || "";
	const suffix = parameters?.suffix || "";

	// Use the simplified FIM template with better formatting
	const cleanPrefix = prefix.trim();
	const cleanSuffix = suffix.trim();
	
	const prompt = qwenCoderFimTemplate.template
		.replace("{{{prefix}}}", cleanPrefix)
		.replace("{{{suffix}}}", cleanSuffix);

	log.appendLine("prompt: " + prompt);
	return {
		content: prompt,
		options: qwenCoderFimTemplate.completionOptions,
	};
};
