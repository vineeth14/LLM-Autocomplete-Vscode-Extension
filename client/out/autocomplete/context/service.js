"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextRetrievalService = void 0;
const ast_1 = require("./ast");
const extension_1 = require("../../extension");
class ContextRetrievalService {
    constructor() {
        this.importCache = new Map();
    }
    /**
     * Get context for LLM completion using simple cursor-based approach
     * @param document - The current document
     * @param position - Cursor position
     * @returns Clean cursor-based context formatted for LLM prompt
     */
    async getContextForCompletion(document, position) {
        return await this.getSimpleCursorContext(document, position);
    }
    async getSimpleCursorContext(document, position) {
        const text = document.getText();
        const lines = text.split("\n");
        const currentLine = position.line;
        const currentChar = position.character;
        const contextBefore = 3;
        const contextAfter = 1;
        const startLine = Math.max(0, currentLine - contextBefore);
        const endLine = Math.min(lines.length - 1, currentLine + contextAfter);
        const prefixLines = lines.slice(startLine, currentLine);
        const suffixLines = lines.slice(currentLine + 1, endLine + 1);
        const currentLinePrefix = lines[currentLine]?.substring(0, currentChar) || "";
        const currentLineSuffix = lines[currentLine]?.substring(currentChar) || "";
        const imports = await this.getImportsForDocument(document);
        const cleanPrefixLines = prefixLines.filter((line) => {
            const trimmed = line.trim();
            const isImport = trimmed.startsWith("import ") || trimmed.startsWith("from ");
            if (!isImport) {
                return true; // Keep non-import lines
            }
            // For import lines, only remove if it's already in the cached imports
            return !imports.some((cachedImport) => cachedImport.trim() === trimmed);
        });
        // Build prefix context with proper spacing
        const allPrefixLines = [];
        // Add imports with separator if present
        if (imports.length > 0) {
            allPrefixLines.push(...imports);
            // Only add blank line if there are other lines to follow
            if (cleanPrefixLines.length > 0 || currentLinePrefix.trim()) {
                allPrefixLines.push("");
            }
        }
        // Add context lines
        allPrefixLines.push(...cleanPrefixLines);
        // Add current line prefix
        allPrefixLines.push(currentLinePrefix);
        const prefix = allPrefixLines.join("\n");
        const allSuffixLines = [currentLineSuffix, ...suffixLines];
        const suffix = allSuffixLines.join("\n");
        const cursorOffset = document.offsetAt(position);
        const currentLineText = lines[currentLine] || "";
        const isAtEndOfLine = currentChar === currentLineText.length;
        extension_1.contextLog.appendLine("=== CONTEXT ===");
        extension_1.contextLog.appendLine("Prefix:");
        extension_1.contextLog.appendLine(prefix);
        extension_1.contextLog.appendLine("---");
        extension_1.contextLog.appendLine("Suffix:");
        extension_1.contextLog.appendLine(suffix);
        extension_1.contextLog.appendLine("===============");
        return {
            prefix: prefix,
            suffix: suffix,
            cursorOffset: cursorOffset,
            isAtEndOfLine: isAtEndOfLine,
            currentLineText: currentLineText,
        };
    }
    getImportHash(text) {
        const importSection = text.substring(0, Math.min(1000, text.length));
        const crypto = require("crypto");
        return crypto.createHash("md5").update(importSection).digest("hex");
    }
    async extractImportsFromAST(ast) {
        const imports = [];
        for (const child of ast.rootNode.namedChildren) {
            if (child.type === "import_statement" ||
                child.type === "import_from_statement") {
                imports.push(child.text.trim()); // Ensure consistent trimming
            }
            else if (child.type !== "comment") {
                break;
            }
        }
        return imports;
    }
    async getImportsForDocument(document) {
        if (document.languageId !== "python") {
            return [];
        }
        const text = document.getText();
        const cacheKey = document.uri.toString() + ":" + this.getImportHash(text);
        const cached = this.importCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const ast = await (0, ast_1.getAst)(text);
            if (ast) {
                const imports = await this.extractImportsFromAST(ast);
                this.importCache.set(cacheKey, imports);
                return imports;
            }
        }
        catch (error) {
            const imports = this.extractImportsSimple(text);
            this.importCache.set(cacheKey, imports);
        }
        return [];
    }
    extractImportsSimple(text) {
        const lines = text.split("\n");
        const imports = [];
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith("import") || line.startsWith("from")) {
                imports.push(line); // Use trimmed line for consistency
            }
            else if (line && !line.startsWith("#")) {
                break;
            }
        }
        return imports;
    }
}
exports.ContextRetrievalService = ContextRetrievalService;
//# sourceMappingURL=service.js.map