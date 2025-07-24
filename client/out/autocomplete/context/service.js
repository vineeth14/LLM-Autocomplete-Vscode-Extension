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
     * Get context for LLM completion using simple cursor-based approach
     * @param document - The current document
     * @param position - Cursor position
     * @returns Clean cursor-based context formatted for LLM prompt
     */
    async getContextForCompletion(document, position) {
        extension_1.astLog.appendLine(`[ContextRetrievalService] Getting simple cursor context at line:${position.line}, char:${position.character}`);
        // Use simple context around cursor for all files
        return this.getSimpleCursorContext(document, position);
    }
    /**
     * Get scoped AST context - pure AST approach without raw text mixing
     * @param document - The current document
     * @param position - Cursor position
     * @returns Clean AST-based context
     */
    async getScopedASTContext(document, position) {
        const text = document.getText();
        const characterOffset = document.offsetAt(position);
        // Convert character offset to byte offset for tree-sitter
        const textUpToCursor = text.substring(0, characterOffset);
        const byteOffset = Buffer.from(textUpToCursor, "utf8").length;
        extension_1.astLog.appendLine(`[AST-Only Context] Processing at line:${position.line}, char:${position.character}`);
        const ast = await (0, ast_1.getAst)(text);
        if (!ast) {
            extension_1.astLog.appendLine("[AST-Only Context] Failed to parse AST");
            return null;
        }
        // Get the AST path to understand scope
        const astPath = await (0, ast_1.getTreePathAtCursor)(ast, byteOffset, position.line);
        if (!astPath || astPath.length === 0) {
            extension_1.astLog.appendLine("[AST-Only Context] No valid AST path found");
            return null;
        }
        // Extract structured context from AST
        const contextData = await this.extractStructuredContext(ast, astPath, document, position, byteOffset);
        return contextData;
    }
    getSimpleCursorContext(document, position) {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        const currentChar = position.character;
        // Get 3-4 lines before and 1-2 lines after cursor for context
        const contextBefore = 3;
        const contextAfter = 1;
        const startLine = Math.max(0, currentLine - contextBefore);
        const endLine = Math.min(lines.length - 1, currentLine + contextAfter);
        // Build prefix: all context lines + current line up to cursor
        const prefixLines = lines.slice(startLine, currentLine);
        const currentLinePrefix = lines[currentLine]?.substring(0, currentChar) || '';
        const allPrefixLines = [...prefixLines, currentLinePrefix];
        const prefix = allPrefixLines.join('\n');
        // Build suffix: current line after cursor + context lines after
        const currentLineSuffix = lines[currentLine]?.substring(currentChar) || '';
        const suffixLines = lines.slice(currentLine + 1, endLine + 1);
        const allSuffixLines = [currentLineSuffix, ...suffixLines];
        const suffix = allSuffixLines.join('\n');
        // Enhanced position information
        const cursorOffset = document.offsetAt(position);
        const currentLineText = lines[currentLine] || '';
        const isAtEndOfLine = currentChar === currentLineText.length;
        extension_1.astLog.appendLine(`[SimpleCursorContext] Prefix: ${prefix.length} chars, Suffix: ${suffix.length} chars`);
        extension_1.astLog.appendLine(`[SimpleCursorContext] Cursor offset: ${cursorOffset}, isAtEndOfLine: ${isAtEndOfLine}`);
        return {
            prefix: prefix,
            suffix: suffix,
            // Enhanced position information
            cursorOffset: cursorOffset,
            isAtEndOfLine: isAtEndOfLine,
            currentLineText: currentLineText,
            // No additional context - just what's around the cursor
        };
    }
    /**
     * Extract structured context using pure AST approach
     * @param ast - Parsed AST
     * @param astPath - Path from root to cursor
     * @param document - Current document
     * @param position - Cursor position
     * @param byteOffset - Byte offset for cursor
     * @returns Clean structured context
     */
    async extractStructuredContext(ast, astPath, document, position, byteOffset) {
        const text = document.getText();
        // Find current scope (function/class we're in)
        const currentScope = astPath.find(node => node.type === 'function_definition' || node.type === 'class_definition');
        // Get relevant imports and top-level definitions
        const moduleContext = await this.extractModuleContext(ast, document.uri.fsPath);
        // Get current scope context if we're inside a function/class
        const scopeContext = currentScope
            ? await this.extractCurrentScopeContext(currentScope, document.uri.fsPath)
            : '';
        // Extract clean prefix/suffix around cursor without duplication
        const { prefix, suffix } = this.extractCleanCursorContext(ast, text, byteOffset, position);
        extension_1.astLog.appendLine("[AST-Only Context] Context extracted:");
        extension_1.astLog.appendLine(`Module context: ${moduleContext.length} chars`);
        extension_1.astLog.appendLine(`Scope context: ${scopeContext.length} chars`);
        extension_1.astLog.appendLine(`Prefix: ${prefix.length} chars`);
        extension_1.astLog.appendLine(`Suffix: ${suffix.length} chars`);
        return {
            prefix,
            suffix,
            context: moduleContext + (scopeContext ? '\n\n' + scopeContext : '')
        };
    }
    /**
     * Extract module-level context (imports, top-level function/class signatures)
     */
    async extractModuleContext(ast, filepath) {
        const snippets = await (0, ast_1.getContextForPath)(filepath, [ast.rootNode]);
        const moduleSnippets = snippets.filter(s => s.scopeLevel === 'module' && (s.symbolType === 'import' || s.symbolType === 'function' || s.symbolType === 'class'));
        return moduleSnippets.map(s => s.content).join('\n');
    }
    /**
     * Extract current scope context (current function/class signature and local variables)
     */
    async extractCurrentScopeContext(scopeNode, filepath) {
        const snippets = await (0, ast_1.getContextForPath)(filepath, [scopeNode]);
        const scopeSnippets = snippets.filter(s => s.scopeLevel === 'current' && (s.symbolType === 'function' || s.symbolType === 'class'));
        return scopeSnippets.map(s => s.content).join('\n');
    }
    /**
     * Extract clean prefix/suffix around cursor without AST-duplicated content
     */
    extractCleanCursorContext(ast, text, byteOffset, position) {
        const lines = text.split('\n');
        const currentLineIndex = position.line;
        const currentColumnIndex = position.character;
        // Get a small window around the cursor for immediate context
        const CONTEXT_WINDOW = 5; // lines before/after
        const startLine = Math.max(0, currentLineIndex - CONTEXT_WINDOW);
        const endLine = Math.min(lines.length - 1, currentLineIndex + CONTEXT_WINDOW);
        // Extract lines and clean them
        const prefixLines = lines.slice(startLine, currentLineIndex + 1);
        const suffixLines = lines.slice(currentLineIndex + 1, endLine + 1);
        // For the current line, split at cursor position
        if (prefixLines.length > 0) {
            const currentLine = prefixLines[prefixLines.length - 1];
            prefixLines[prefixLines.length - 1] = currentLine.substring(0, currentColumnIndex);
        }
        // Filter to keep only the most relevant executable content
        const cleanPrefixLines = this.filterForCursorContext(prefixLines);
        const cleanSuffixLines = this.filterForCursorContext(suffixLines);
        return {
            prefix: cleanPrefixLines.join('\n').trim(),
            suffix: cleanSuffixLines.join('\n').trim()
        };
    }
    /**
     * Filter lines for cursor context - more permissive than module filtering
     * Keeps variable assignments and partial statements that might be relevant for completion
     */
    filterForCursorContext(lines) {
        return lines.filter((line) => {
            const trimmed = line.trim();
            // Skip empty lines
            if (trimmed === "")
                return false;
            // Skip pure comment lines (keep inline comments)
            if (trimmed.startsWith("#"))
                return false;
            // Skip docstring lines
            if (trimmed.startsWith('"""') || trimmed.startsWith("'''"))
                return false;
            // Skip decorator lines 
            if (trimmed.startsWith("@"))
                return false;
            // Skip imports (already in module context)
            if (trimmed.startsWith("import ") || trimmed.startsWith("from "))
                return false;
            // Skip function/class definitions (already in module/scope context)  
            if (trimmed.startsWith("def ") || trimmed.startsWith("class "))
                return false;
            // Keep everything else: assignments, calls, control flow, partial statements
            return true;
        });
    }
    /**
     * Legacy filter for backward compatibility
     */
    filterExecutableLines(lines) {
        return this.filterForCursorContext(lines);
    }
}
exports.ContextRetrievalService = ContextRetrievalService;
ContextRetrievalService.MAX_CONTEXT_LINES = 20; // Reduced from 40
ContextRetrievalService.ENHANCED_CONTEXT_LINES = 15; // Reduced from 25
//# sourceMappingURL=service.js.map