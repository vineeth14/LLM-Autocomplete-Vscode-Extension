"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextRetrievalService = void 0;
const ast_1 = require("./ast");
const extension_1 = require("../../extension");
/**
 * Service responsible for retrieving relevant context for code completion
 * Uses AST parsing to gather semantic information with scope awareness
 */
class ContextRetrievalService {
    /**
     * Get context for LLM completion in Parameters format
     * @param document - The current document
     * @param position - Cursor position
     * @returns Context formatted for LLM prompt
     */
    async getContextForCompletion(document, position) {
        extension_1.astLog.appendLine(`[ContextRetrievalService] Getting context at line:${position.line}, char:${position.character}`);
        // Try enhanced scope-aware context for Python files
        if (document.languageId === "python") {
            try {
                const enhancedContext = await this.getEnhancedContext(document, position);
                if (enhancedContext) {
                    return enhancedContext;
                }
            }
            catch (error) {
                extension_1.astLog.appendLine(`[ContextRetrievalService] Enhanced context failed: ${error}`);
            }
        }
        // Fallback to basic line-based context
        return this.getBasicContext(document, position);
    }
    /**
     * Get legacy context items (for backwards compatibility)
     * @param document - The current document
     * @param position - Cursor position
     * @returns Array of context items
     */
    async getContext(document, position) {
        if (document.languageId !== "python") {
            return [];
        }
        const context = [];
        const text = document.getText();
        try {
            const ast = await (0, ast_1.getAst)(text);
            if (ast) {
                // Convert position to byte offset for tree-sitter
                const cursorIndex = document.offsetAt(position);
                // Get AST path from root to cursor
                const astPath = await (0, ast_1.getTreePathAtCursor)(ast, cursorIndex);
                // Get context snippets from the path
                const snippets = await (0, ast_1.getContextForPath)(document.uri.fsPath, astPath);
                extension_1.astLog.appendLine(`[ContextRetrieval] Retrieved ${snippets.length} context snippets`);
                // Convert snippets to ContextItems (for now, just log them)
                for (const snippet of snippets) {
                    extension_1.astLog.appendLine(`[ContextRetrieval] Snippet: ${snippet.content}`);
                }
            }
        }
        catch (error) {
            extension_1.astLog.appendLine(`[ContextRetrieval] Error generating AST: ${error}`);
            extension_1.astLog.show();
        }
        return context;
    }
    async getEnhancedContext(document, position) {
        const text = document.getText();
        const offset = document.offsetAt(position);
        // Get AST-based context
        const ast = await (0, ast_1.getAst)(text);
        if (!ast) {
            return null;
        }
        const astPath = await (0, ast_1.getTreePathAtCursor)(ast, offset);
        const snippets = await (0, ast_1.getContextForPath)(document.uri.fsPath, astPath);
        // Combine scope-aware snippets with immediate context
        const scopeContext = this.buildScopeAwareContext(snippets, document, position);
        return scopeContext;
    }
    getBasicContext(document, position) {
        const text = document.getText();
        const offset = document.offsetAt(position);
        const prefix = text.substring(0, offset);
        const suffix = text.substring(offset);
        // Split into lines and take the last N lines of the prefix and first N lines of the suffix
        const prefixLines = prefix.split("\n");
        const suffixLines = suffix.split("\n");
        const limitedPrefix = prefixLines.slice(-ContextRetrievalService.MAX_CONTEXT_LINES).join("\n");
        const limitedSuffix = suffixLines.slice(0, ContextRetrievalService.MAX_CONTEXT_LINES).join("\n");
        return {
            prefix: limitedPrefix,
            suffix: limitedSuffix,
        };
    }
    buildScopeAwareContext(snippets, document, position) {
        const offset = document.offsetAt(position);
        const text = document.getText();
        // Get immediate context around cursor (reduced lines)
        const prefixLines = text.substring(0, offset).split("\n");
        const suffixLines = text.substring(offset).split("\n");
        const immediatePrefix = prefixLines.slice(-ContextRetrievalService.ENHANCED_CONTEXT_LINES).join("\n");
        const immediateSuffix = suffixLines.slice(0, Math.floor(ContextRetrievalService.ENHANCED_CONTEXT_LINES / 2)).join("\n");
        // Prioritize and format scope-aware snippets
        const prioritizedSnippets = this.prioritizeSnippets(snippets);
        const scopePrefix = this.formatSnippetsAsContext(prioritizedSnippets);
        // Combine scope context with immediate context
        const enhancedPrefix = scopePrefix ? `${scopePrefix}\n\n${immediatePrefix}` : immediatePrefix;
        extension_1.astLog.appendLine(`[ContextRetrievalService] Enhanced context with ${snippets.length} scope items`);
        return {
            prefix: enhancedPrefix,
            suffix: immediateSuffix,
        };
    }
    prioritizeSnippets(snippets) {
        // Define priority order: imports first, then current scope, then broader scope
        const priorityOrder = {
            "import": 1,
            "current": 2,
            "class": 3,
            "parent": 4,
            "module": 5
        };
        return snippets.sort((a, b) => {
            const aPriority = priorityOrder[a.scopeLevel] || 99;
            const bPriority = priorityOrder[b.scopeLevel] || 99;
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            // Secondary sort by symbol type (functions before variables)
            const symbolPriority = { "import": 1, "class": 2, "function": 3, "method": 4, "variable": 5 };
            return (symbolPriority[a.symbolType] || 99) - (symbolPriority[b.symbolType] || 99);
        });
    }
    formatSnippetsAsContext(snippets) {
        if (snippets.length === 0)
            return "";
        // Group snippets by scope level for cleaner formatting
        const imports = snippets.filter(s => s.symbolType === "import");
        const definitions = snippets.filter(s => s.symbolType !== "import");
        let context = "";
        // Add imports first
        if (imports.length > 0) {
            context += "# Imports\n";
            context += imports.map(s => s.content).join("\n");
            context += "\n\n";
        }
        // Add definitions
        if (definitions.length > 0) {
            context += "# Context\n";
            context += definitions.map(s => s.content).join("\n\n");
        }
        return context.trim();
    }
    /**
     * Extract import statements from file
     */
    extractImports(document) {
        // TODO: Parse import statements
        // - import module
        // - from module import item
        // - import module as alias
        return [];
    }
    /**
     * Find function definitions in the current scope
     */
    findFunctionDefinitions(document, position) {
        // TODO: Parse function definitions
        // - def function_name(params):
        // - Consider scope (class methods, nested functions)
        return [];
    }
    /**
     * Find class definitions and their methods
     */
    findClassDefinitions(document) {
        // TODO: Parse class definitions
        // - class ClassName:
        // - class methods and properties
        return [];
    }
    /**
     * Extract variable assignments in current scope
     */
    findVariableAssignments(document, position) {
        // TODO: Find variable assignments
        // - var = value
        // - Consider scope (local vs global)
        return [];
    }
    /**
     * Get relevant docstrings and comments
     */
    extractComments(document, position) {
        // TODO: Extract relevant comments
        // - Function docstrings
        // - Inline comments
        // - Class docstrings
        return [];
    }
    /**
     * Format context items into a string suitable for the LLM prompt
     */
    formatContextForPrompt(items) {
        if (items.length === 0)
            return "";
        let result = "# Relevant context:\n";
        // Group by type for better organization
        const imports = items.filter((i) => i.type === "import");
        const functions = items.filter((i) => i.type === "function");
        const classes = items.filter((i) => i.type === "class");
        const variables = items.filter((i) => i.type === "variable");
        // TODO: Format each group appropriately
        return result;
    }
}
exports.ContextRetrievalService = ContextRetrievalService;
ContextRetrievalService.MAX_CONTEXT_LINES = 40;
ContextRetrievalService.ENHANCED_CONTEXT_LINES = 25;
//# sourceMappingURL=contextRetrievalService.js.map