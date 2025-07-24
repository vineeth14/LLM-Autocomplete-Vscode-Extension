"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemPrompt = void 0;
const extension_1 = require("../extension");
const starcoderFimTemplate = {
    template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
    completionOptions: {
        temperature: 0.1,
        top_p: 0.95,
        num_predict: 50,
        repeat_penalty: 1.1,
        stop: ["<fim_prefix>", "<fim_suffix>", "<fim_middle>", "\n\n"],
    },
};
const systemPrompt = (parameters) => {
    const prefix = parameters?.prefix || "";
    const suffix = parameters?.suffix || "";
    // Use simple FIM template with just cursor context
    const cleanPrefix = prefix.trim();
    const cleanSuffix = suffix.trimEnd();
    const prompt = starcoderFimTemplate.template
        .replace("{{{prefix}}}", cleanPrefix)
        .replace("{{{suffix}}}", cleanSuffix);
    extension_1.log.appendLine("=== SIMPLE PROMPT ===");
    extension_1.log.appendLine(`Prefix: ${cleanPrefix}`);
    extension_1.log.appendLine(`Suffix: ${cleanSuffix}`);
    extension_1.log.appendLine(`Full prompt: ${prompt}`);
    extension_1.log.appendLine("=====================");
    return {
        content: prompt,
        options: starcoderFimTemplate.completionOptions,
    };
};
exports.systemPrompt = systemPrompt;
//# sourceMappingURL=prompt.js.map