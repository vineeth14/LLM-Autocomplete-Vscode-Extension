"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemPrompt = void 0;
const dotenv = require("dotenv");
const path = require("path");
// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });
// StarCoder FIM template (for reference)
const starcoderFimTemplate = {
    template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
    completionOptions: {
        temperature: 0.1,
        top_p: 0.95,
        num_predict: 50,
        repeat_penalty: 1.1,
        stop: ["<fim_prefix>", "<fim_suffix>", "<fim_middle>", "\n\n"],
        provider: "ollama",
    },
};
// Gemini completion template
const geminiTemplate = {
    template: `Complete the following code. Only provide the completion, no explanations or extra text.

Code before cursor:
{{{prefix}}}

Code after cursor:
{{{suffix}}}

Complete the code at the cursor position:`,
    completionOptions: {
        temperature: 0.1,
        top_p: 0.95,
        num_predict: 50,
        repeat_penalty: 1.1,
        stop: ["\n\n", "```", "Complete", "Code before", "Code after"],
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
const systemPrompt = (parameters) => {
    const prefix = parameters?.prefix || "";
    const suffix = parameters?.suffix || "";
    const provider = process.env.LLM_PROVIDER || "ollama";
    // Use simple FIM template with just cursor context
    // Don't trim prefix to preserve indentation context
    const cleanPrefix = prefix;
    const cleanSuffix = suffix.trimEnd();
    // Choose template based on provider
    const template = provider === "gemini" ? geminiTemplate : starcoderFimTemplate;
    const prompt = template.template
        .replace("{{{prefix}}}", cleanPrefix)
        .replace("{{{suffix}}}", cleanSuffix);
    return {
        content: prompt,
        options: template.completionOptions,
    };
};
exports.systemPrompt = systemPrompt;
//# sourceMappingURL=prompt.js.map