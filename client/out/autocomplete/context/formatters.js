"use strict";
/**
 * CONTEXT FORMATTING UTILITIES (Currently Unused)
 *
 * This file provides sophisticated context prioritization and formatting
 * for AST-based context extraction. Currently inactive but preserved.
 *
 * Features: Scope-based prioritization, relevance filtering, LLM-optimized formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prioritizeSnippets = prioritizeSnippets;
exports.formatSnippetsAsContext = formatSnippetsAsContext;
exports.buildScopeAwareContext = buildScopeAwareContext;
/**
 * Prioritize snippets based on scope hierarchy and symbol type, filtering for relevance
 */
function prioritizeSnippets(snippets) {
    // First filter out clearly irrelevant functions
    const relevantSnippets = filterRelevantSnippets(snippets);
    // Then prioritize the relevant ones
    const priorityOrder = {
        import: 1,
        current: 2,
        class: 3,
        parent: 4,
        module: 5,
    };
    return relevantSnippets.sort((a, b) => {
        const aPriority = priorityOrder[a.scopeLevel] || 99;
        const bPriority = priorityOrder[b.scopeLevel] || 99;
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        // Secondary sort by symbol type (functions before variables)
        const symbolPriority = {
            import: 1,
            class: 2,
            function: 3,
            method: 4,
            variable: 5,
        };
        return ((symbolPriority[a.symbolType] || 99) -
            (symbolPriority[b.symbolType] || 99));
    });
}
/**
 * Filter snippets to only include truly relevant ones based on scope proximity and symbol importance
 */
function filterRelevantSnippets(snippets) {
    // Always keep imports (maximum 5 most recent/relevant)
    const imports = snippets.filter(s => s.symbolType === "import").slice(0, 5);
    // Always keep current scope items (functions/classes where cursor is)
    const currentScope = snippets.filter(s => s.scopeLevel === "current");
    // Keep class scope items only if we're in a class (methods, properties)
    const classScope = snippets
        .filter(s => s.scopeLevel === "class")
        .slice(0, 3);
    // Be very selective with module-level items - only keep 1-2 most relevant
    const moduleItems = snippets
        .filter(s => s.scopeLevel === "module" &&
        s.symbolType !== "import" &&
        // Prioritize functions over classes at module level
        (s.symbolType === "function" || s.symbolType === "class"))
        .slice(0, 1);
    return [...imports, ...currentScope, ...classScope, ...moduleItems];
}
/**
 * Format snippets into structured, compact context for LLM prompt
 */
function formatSnippetsAsContext(snippets) {
    if (snippets.length === 0)
        return "";
    const imports = snippets.filter(s => s.symbolType === "import");
    const currentScope = snippets.filter(s => s.scopeLevel === "current");
    const classScope = snippets.filter(s => s.scopeLevel === "class");
    const moduleScope = snippets.filter(s => s.scopeLevel === "module" && s.symbolType !== "import");
    let context = "";
    // Add imports compactly (one line each)
    if (imports.length > 0) {
        context += imports.map(s => s.content).join("\n") + "\n\n";
    }
    // Add current scope (most important - function/class we're in)
    if (currentScope.length > 0) {
        context += currentScope.map(s => s.content).join("\n") + "\n";
    }
    // Add class methods if in a class (compact signatures only)
    if (classScope.length > 0) {
        context += classScope.map(s => s.content).join("\n") + "\n";
    }
    // Add minimal module context (just signatures, no bodies)
    if (moduleScope.length > 0) {
        context += moduleScope.map(s => s.content).join("\n");
    }
    return context.trim();
}
/**
 * Build enhanced context combining scope-aware snippets with immediate context
 * Ensures context stays within reasonable token limits for LLM efficiency
 */
function buildScopeAwareContext(snippets, immediatePrefix, immediateSuffix) {
    // Prioritize and filter for only the most relevant snippets
    const prioritizedSnippets = prioritizeSnippets(snippets);
    // Remove duplicates between AST snippets and immediate context
    const deduplicatedSnippets = removeDuplicates(prioritizedSnippets, immediatePrefix);
    // Format context with current function scope awareness
    const scopePrefix = formatSnippetsAsContext(deduplicatedSnippets);
    // Combine intelligently - scope context + clean immediate context
    const cleanedImmediate = removeRedundantFromImmediate(immediatePrefix, deduplicatedSnippets);
    const combinedPrefix = scopePrefix
        ? `${scopePrefix}\n\n${cleanedImmediate}`
        : immediatePrefix;
    const trimmedPrefix = ensureContextLength(combinedPrefix, immediateSuffix);
    return {
        prefix: trimmedPrefix,
        suffix: immediateSuffix,
    };
}
/**
 * Remove snippets that already appear in immediate context to avoid duplication
 */
function removeDuplicates(snippets, immediateContext) {
    return snippets.filter(snippet => {
        // For imports, check if already present in immediate context
        if (snippet.symbolType === "import") {
            return !immediateContext.includes(snippet.content.trim());
        }
        // Keep function signatures as they provide scope context
        return true;
    });
}
/**
 * Remove redundant lines from immediate context that are covered by AST snippets
 */
function removeRedundantFromImmediate(immediatePrefix, snippets) {
    const lines = immediatePrefix.split("\n");
    const importLines = snippets
        .filter(s => s.symbolType === "import")
        .map(s => s.content.trim());
    // Remove import lines that are already in AST snippets
    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
            return !importLines.some(importLine => importLine === trimmed);
        }
        return true;
    });
    return cleanedLines.join("\n");
}
/**
 * Ensure total context length stays within reasonable limits for LLM performance
 * Prioritizes immediate context over scope context when trimming is needed
 */
function ensureContextLength(prefix, suffix) {
    const MAX_CONTEXT_CHARS = 2000; // Roughly 400-500 tokens
    const totalLength = prefix.length + suffix.length;
    if (totalLength <= MAX_CONTEXT_CHARS) {
        return prefix;
    }
    // If too long, prioritize immediate context over scope context
    const lines = prefix.split("\n");
    const scopeEndIndex = lines.findIndex(line => line.trim() === "") + 1;
    if (scopeEndIndex > 0 && scopeEndIndex < lines.length) {
        // Keep immediate context, trim scope context
        const immediateContext = lines.slice(scopeEndIndex).join("\n");
        const availableForScope = MAX_CONTEXT_CHARS - suffix.length - immediateContext.length - 10;
        if (availableForScope > 200) {
            const scopeContext = lines.slice(0, scopeEndIndex).join("\n");
            return (scopeContext.substring(0, availableForScope) +
                "\n\n" +
                immediateContext);
        }
        else {
            // Only keep immediate context if scope takes too much space
            return immediateContext.substring(0, MAX_CONTEXT_CHARS - suffix.length - 10);
        }
    }
    // Fallback: just trim the prefix
    return prefix.substring(0, MAX_CONTEXT_CHARS - suffix.length - 10);
}
//# sourceMappingURL=formatters.js.map