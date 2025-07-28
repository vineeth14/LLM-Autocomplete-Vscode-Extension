import { log } from "../../extension";

const FIM_TOKENS = [
  "<fim_prefix>",
  "<fim_suffix>",
  "<fim_middle>",
  "<|endoftext|>",
];

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

const EXACT_TEMPLATE_MARKERS = new Set([]);

const PARTIAL_TEMPLATE_MARKERS = [
  "here's the code:",
  "complete the following:",
];

const USELESS_PATTERNS = [""];

// Pre-compiled regexes for performance
const FIM_TOKEN_REGEXES = FIM_TOKENS.map(token => 
  new RegExp(escapeRegex(token), "g")
);

const CONVERSATIONAL_START_REGEXES = CONVERSATIONAL_START_PHRASES.map(phrase => 
  new RegExp(`^\\s*${escapeRegex(phrase)}\\s*`, "gmi")
);

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function filterSuggestion(rawSuggestion: string): string | undefined {
  let cleaned = cleanTokensAndPhrases(rawSuggestion);
  const lines = cleaned.split("\n");
  const filteredLines = filterConversationalLines(lines);

  if (filteredLines.length === 0) {
    return undefined;
  }
  
  const result = filteredLines.join("\n").trim();
  
  return result;
}

function cleanTokensAndPhrases(text: string): string {
  let cleaned = text;
  
  FIM_TOKEN_REGEXES.forEach((regex) => {
    cleaned = cleaned.replace(regex, "");
  });

  CONVERSATIONAL_START_REGEXES.forEach((regex) => {
    cleaned = cleaned.replace(regex, "");
  });
  return cleaned;
}

function filterConversationalLines(lines: string[]): string[] {
  const result: string[] = [];
  let hasSeenCode = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    
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

function shouldSkipLineBeforeCode(trimmed: string, lower: string): boolean {
  if (!trimmed) return true;
  
  if (trimmed.startsWith('```')) return true;
  
  const hasExactMarker = EXACT_TEMPLATE_MARKERS.has(lower);
  const hasPartialMarker = PARTIAL_TEMPLATE_MARKERS.some(marker => lower.includes(marker));
    
  return hasExactMarker || hasPartialMarker || isPureConversationalLine(trimmed, lower);
}

function isPureConversationalLine(trimmed: string, lower: string): boolean {
  if (!trimmed) return false;
  
  const startsWithConversational = CONVERSATIONAL_START_PHRASES
    .some(phrase => lower.startsWith(phrase));
    
  const containsPostExplanation = CONVERSATIONAL_POST_PHRASES
    .some(phrase => lower.includes(phrase));
    
  return startsWithConversational || containsPostExplanation;
}

function isTemplateMarker(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  return EXACT_TEMPLATE_MARKERS.has(trimmed) || 
         PARTIAL_TEMPLATE_MARKERS.some((marker) => trimmed.includes(marker));
}

function isEmptyOrUseless(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || USELESS_PATTERNS.includes(trimmed);
}
