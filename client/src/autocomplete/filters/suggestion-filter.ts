import * as levenshtein from "fast-levenshtein";
import { LCS } from "js-lcs";

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
const FIM_TOKEN_REGEXES = FIM_TOKENS.map(
	token => new RegExp(escapeRegex(token), "g")
);

const CONVERSATIONAL_START_REGEXES = CONVERSATIONAL_START_PHRASES.map(
	phrase => new RegExp(`^\\s*${escapeRegex(phrase)}\\s*`, "gmi")
);

function rewritesLineAbove(
	suggestionLines: string[],
	contextPrefix: string
): boolean {
	const prefixLines = contextPrefix.split("\n");
	const lastMeaningfulPrefix = prefixLines
		.reverse()
		.find(line => line.trim().length > 0);
	const firstMeaningfulSuggestion = suggestionLines.find(
		line => line.trim().length > 0
	);
	if (!lastMeaningfulPrefix || !firstMeaningfulSuggestion) return false;
	const distance = levenshtein.get(
		lastMeaningfulPrefix.trim(),
		firstMeaningfulSuggestion.trim()
	);
	return distance < Math.max(5, lastMeaningfulPrefix.length * 0.1);
}
// Prevent infinite loop repititions
function stopAtRepeatingLines(lines: string[]): string[] {
	if (lines.length < 3) return lines;
	for (let i = 0; i <= lines.length - 3; i++) {
		if (lines[i] === lines[i + 1] && lines[i + 1] === lines[i + 2]) {
			// if identical lines found, return first occurence only
			return lines.slice(0, i + 1);
		}
	}
	return lines;
}

/* Use cases:
  // BAD completion with extreme repetition:
  function test() {
    console.log("processing");
    console.log("processing"); // <- similar pattern
    console.log("processing"); // <- similar pattern
    console.log("processing"); // <- similar pattern
    return result;
    return result; // <- similar pattern
  }

  // GOOD completion:
  function test() {
    console.log("processing");
    validateInput();
    return result;
  } */

const lcsInstance = new LCS({ maxSize: 1000 }); // Adjust maxSize based on your typical line lengths

/**
 * Detects extreme repetition in code suggestions using optimized LCS algorithm
 * Returns true if more than 30% of line pairs show high similarity (>80% LCS overlap)
 */
function isExtremeRepetition(lines: string[]): boolean {
	if (lines.length < 4) return false;

	const meaningfulLines = lines
		.map(line => line.trim())
		.filter(line => line.length > 5); // Skip very short lines

	if (meaningfulLines.length < 4) return false;

	const similarities = meaningfulLines.flatMap((line1, i) =>
		meaningfulLines
			.slice(i + 1)
			.map(line2 => calculateSimilarity(line1, line2))
	);

	const highSimilarityCount = similarities.filter(
		similarity => similarity > 0.8
	).length;
	const repetitionRatio = highSimilarityCount / similarities.length;

	return repetitionRatio > 0.3;
}

function calculateSimilarity(str1: string, str2: string): number {
	if (str1 === str2) return 1;
	if (!str1 || !str2) return 0;

	const lcsLength = lcsInstance.size(str1, str2);
	const minLength = Math.min(str1.length, str2.length);

	// Only consider meaningful similarities (at least 10 chars LCS)
	return lcsLength >= 10 ? lcsLength / minLength : 0;
}

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function filterSuggestion(
	rawSuggestion: string,
	contextPrefix?: string
): string | undefined {
	let cleaned = cleanTokensAndPhrases(rawSuggestion);
	const lines = cleaned.split("\n");
	const filteredLines = filterConversationalLines(lines);
	if (filteredLines.length === 0) {
		return undefined;
	}
	if (contextPrefix && rewritesLineAbove(filteredLines, contextPrefix)) {
		return undefined;
	}
	if (isExtremeRepetition(filteredLines)) {
		return undefined;
	}
	const nonRepeatingLines = stopAtRepeatingLines(filteredLines);
	if (nonRepeatingLines.length === 0) {
		return undefined;
	}
	// Return multi-line completions to prevent semantic fragmentation
	const result = nonRepeatingLines.join("\n").trim();
	return result || undefined;
}

function cleanTokensAndPhrases(text: string): string {
	let cleaned = text;
	// Use pre-compiled regexes
	FIM_TOKEN_REGEXES.forEach(regex => {
		cleaned = cleaned.replace(regex, "");
	});
	CONVERSATIONAL_START_REGEXES.forEach(regex => {
		cleaned = cleaned.replace(regex, "");
	});
	return cleaned;
}

function filterConversationalLines(lines: string[]): string[] {
	const result: string[] = [];
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
		if (
			hasSeenCode &&
			(isPureConversationalLine(trimmed, lower) ||
				trimmed.startsWith("```"))
		) {
			break;
		}
		result.push(line);
	}
	return result;
}

function shouldSkipLineBeforeCode(trimmed: string, lower: string): boolean {
	if (!trimmed) return true;
	// Skip markdown code block markers (```python, ```, etc.)
	if (trimmed.startsWith("```")) return true;
	// Fast exact lookup using Set + partial matching using array
	const hasExactMarker = EXACT_TEMPLATE_MARKERS.has(lower);
	const hasPartialMarker = PARTIAL_TEMPLATE_MARKERS.some(marker =>
		lower.includes(marker)
	);
	return (
		hasExactMarker ||
		hasPartialMarker ||
		isPureConversationalLine(trimmed, lower)
	);
}

function isPureConversationalLine(trimmed: string, lower: string): boolean {
	if (!trimmed) return false;
	// Use arrays directly for partial matching
	const startsWithConversational = CONVERSATIONAL_START_PHRASES.some(phrase =>
		lower.startsWith(phrase)
	);
	const containsPostExplanation = CONVERSATIONAL_POST_PHRASES.some(phrase =>
		lower.includes(phrase)
	);
	return startsWithConversational || containsPostExplanation;
}

function isTemplateMarker(line: string): boolean {
	const trimmed = line.trim().toLowerCase();
	return (
		EXACT_TEMPLATE_MARKERS.has(trimmed) ||
		PARTIAL_TEMPLATE_MARKERS.some(marker => trimmed.includes(marker))
	);
}

function isEmptyOrUseless(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.length === 0 || USELESS_PATTERNS.includes(trimmed);
}
