"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterSuggestion = filterSuggestion;
const FIM_TOKENS = [
    "<fim_prefix>",
    "<fim_suffix>",
    "<fim_middle>",
    "<|endoftext|>",
];
// Keep as arrays for partial matching (startsWith, includes)
const CONVERSATIONAL_START_PHRASES = [
    "here is",
    "here's",
    "sure, here",
    "sure!",
    "to fill",
    "certainly",
    "of course",
    "the code should",
];
const CONVERSATIONAL_POST_PHRASES = [
    "explanation:",
    "here is",
    "here's how",
    "the above",
    "this code",
    "the function",
];
// Use Set for exact matching (markdown now handled separately)
const EXACT_TEMPLATE_MARKERS = new Set([
// Markdown blocks now handled by startsWith('```') check
]);
// Keep as array for partial matching
const PARTIAL_TEMPLATE_MARKERS = [
    "here's the code:",
    "complete the following:",
];
const USELESS_PATTERNS = [""];
// Pre-compiled regexes for performance
const FIM_TOKEN_REGEXES = FIM_TOKENS.map(token => new RegExp(escapeRegex(token), "g"));
const CONVERSATIONAL_START_REGEXES = CONVERSATIONAL_START_PHRASES.map(phrase => new RegExp(`^\\s*${escapeRegex(phrase)}\\s*`, "gmi"));
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function filterSuggestion(rawSuggestion) {
    let cleaned = cleanTokensAndPhrases(rawSuggestion);
    const lines = cleaned.split("\n");
    const filteredLines = filterConversationalLines(lines);
    if (filteredLines.length === 0) {
        return undefined;
    }
    const result = filteredLines.join("\n").trim();
    return result;
}
function cleanTokensAndPhrases(text) {
    let cleaned = text;
    // Use pre-compiled regexes
    FIM_TOKEN_REGEXES.forEach((regex) => {
        cleaned = cleaned.replace(regex, "");
    });
    CONVERSATIONAL_START_REGEXES.forEach((regex) => {
        cleaned = cleaned.replace(regex, "");
    });
    return cleaned;
}
function filterConversationalLines(lines) {
    const result = [];
    let hasSeenCode = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const lower = trimmed.toLowerCase(); // Calculate once
        if (!hasSeenCode && shouldSkipLineBeforeCode(trimmed, lower)) {
            continue;
        }
        if (!hasSeenCode && trimmed) {
            hasSeenCode = true;
        }
        if (hasSeenCode && (isPureConversationalLine(trimmed, lower) || trimmed.startsWith('```'))) {
            break;
        }
        result.push(line);
    }
    return result;
}
function shouldSkipLineBeforeCode(trimmed, lower) {
    if (!trimmed)
        return true;
    // Skip markdown code block markers (```python, ```, etc.)
    if (trimmed.startsWith('```'))
        return true;
    // Fast exact lookup using Set + partial matching using array
    const hasExactMarker = EXACT_TEMPLATE_MARKERS.has(lower);
    const hasPartialMarker = PARTIAL_TEMPLATE_MARKERS.some(marker => lower.includes(marker));
    return hasExactMarker || hasPartialMarker || isPureConversationalLine(trimmed, lower);
}
function isPureConversationalLine(trimmed, lower) {
    if (!trimmed)
        return false;
    // Use arrays directly for partial matching
    const startsWithConversational = CONVERSATIONAL_START_PHRASES
        .some(phrase => lower.startsWith(phrase));
    const containsPostExplanation = CONVERSATIONAL_POST_PHRASES
        .some(phrase => lower.includes(phrase));
    return startsWithConversational || containsPostExplanation;
}
function isTemplateMarker(line) {
    const trimmed = line.trim().toLowerCase();
    return EXACT_TEMPLATE_MARKERS.has(trimmed) ||
        PARTIAL_TEMPLATE_MARKERS.some((marker) => trimmed.includes(marker));
}
function isEmptyOrUseless(line) {
    const trimmed = line.trim();
    return trimmed.length === 0 || USELESS_PATTERNS.includes(trimmed);
}
//# sourceMappingURL=suggestion-filter.js.map