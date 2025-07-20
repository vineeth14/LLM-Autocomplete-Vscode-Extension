"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemPrompt = void 0;
const extension_1 = require("../extension");
const qwenCoderFimTemplate = {
    template: "{{{prefix}}}",
    completionOptions: {
        temperature: 0.3,
        top_p: 0.95,
        num_predict: 100,
        repeat_penalty: 1.05,
        stop: []
    },
};
const systemPrompt = (parameters) => {
    const prefix = parameters?.prefix || "";
    const suffix = parameters?.suffix || "";
    // Use the simplified FIM template
    const prompt = qwenCoderFimTemplate.template
        .replace("{{{prefix}}}", prefix)
        .replace("{{{suffix}}}", suffix);
    extension_1.log.appendLine("prompt: " + prompt);
    return {
        content: prompt,
        options: qwenCoderFimTemplate.completionOptions,
    };
};
exports.systemPrompt = systemPrompt;
//# sourceMappingURL=prompt.js.map