import { start } from "repl";
import { log } from "../extension";
import { Parameters, AutocompleteTemplate, PromptResult } from "./types";

// StarCoder FIM template (for reference)
const starcoderFimTemplate: AutocompleteTemplate = {
  template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
  completionOptions: {
    temperature: 0.1,
    top_p: 0.95,
    num_predict: 50,
    repeat_penalty: 1.1,
    stop: ["<fim_prefix>", "<fim_suffix>", "<fim_middle>", "\n\n"],
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

  // Use simple FIM template with just cursor context
  const cleanPrefix = prefix.trim();
  const cleanSuffix = suffix.trimEnd();

  const prompt = starcoderFimTemplate.template
    .replace("{{{prefix}}}", cleanPrefix)
    .replace("{{{suffix}}}", cleanSuffix);

  // Reduced logging - only log when needed for debugging
  // log.appendLine("=== StarCoder PROMPT ===");
  // log.appendLine(`Prefix: ${cleanPrefix}`);
  // log.appendLine(`Suffix: ${cleanSuffix}`);
  // log.appendLine(`Full prompt: ${prompt}`);
  // log.appendLine("===================");

  return {
    content: prompt,
    options: starcoderFimTemplate.completionOptions,
  };
};
