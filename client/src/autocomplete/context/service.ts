import * as vscode from 'vscode';
import { Parameters } from '../types';
import { getAst } from './ast';
import { contextLog } from '../../extension';

export class ContextRetrievalService {
    private importCache = new Map<string, string[]>();

    /**
     * Get context for LLM completion using simple cursor-based approach
     * @param document - The current document
     * @param position - Cursor position
     * @returns Clean cursor-based context formatted for LLM prompt
     */
    async getContextForCompletion(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<Parameters> {
        return await this.getSimpleCursorContext(document, position);
    }

    private async getSimpleCursorContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<Parameters> {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        const currentChar = position.character;

        const contextBefore = 15;
        const contextAfter = 10;
        const startLine = Math.max(0, currentLine - contextBefore);
        const endLine = Math.min(lines.length - 1, currentLine + contextAfter);

        const prefixLines = lines.slice(startLine, currentLine);
        const suffixLines = lines.slice(currentLine + 1, endLine + 1);

        const currentLinePrefix =
            lines[currentLine]?.substring(0, currentChar) || '';
        const currentLineSuffix =
            lines[currentLine]?.substring(currentChar) || '';

        const imports = await this.getImportsForDocument(document);

        const cleanPrefixLines = prefixLines.filter(line => {
            const trimmed = line.trim();
            const isImport =
                trimmed.startsWith('import ') || trimmed.startsWith('from ');

            if (!isImport) {
                return true; // Keep non-import lines
            }

            // For import lines, only remove if it's already in the cached imports
            return !imports.some(
                cachedImport => cachedImport.trim() === trimmed
            );
        });

        // Build prefix context with proper spacing
        const allPrefixLines: string[] = [];

        // Add imports with separator if present
        if (imports.length > 0) {
            allPrefixLines.push(...imports);
            // Only add blank line if there are other lines to follow
            if (cleanPrefixLines.length > 0 || currentLinePrefix.trim()) {
                allPrefixLines.push('');
            }
        }

        // Add context lines
        allPrefixLines.push(...cleanPrefixLines);

        // Add current line prefix
        allPrefixLines.push(currentLinePrefix);

        const prefix = allPrefixLines.join('\n');

        const allSuffixLines = [currentLineSuffix, ...suffixLines];
        const suffix = allSuffixLines.join('\n');

        const cursorOffset = document.offsetAt(position);
        const currentLineText = lines[currentLine] || '';
        const isAtEndOfLine = currentChar === currentLineText.length;

        contextLog.appendLine('=== CONTEXT ===');
        contextLog.appendLine('Prefix:');
        contextLog.appendLine(prefix);
        contextLog.appendLine('---');
        contextLog.appendLine('Suffix:');
        contextLog.appendLine(suffix);
        contextLog.appendLine('===============');

        return {
            prefix: prefix,
            suffix: suffix,
            cursorOffset: cursorOffset,
            isAtEndOfLine: isAtEndOfLine,
            currentLineText: currentLineText,
        };
    }

    private getImportHash(text: string): string {
        const importSection = text.substring(0, Math.min(1000, text.length));
        const crypto = require('crypto');
        return crypto.createHash('md5').update(importSection).digest('hex');
    }

    private async extractImportsFromAST(ast: any): Promise<string[]> {
        const imports: string[] = [];
        for (const child of ast.rootNode.namedChildren) {
            if (
                child.type === 'import_statement' ||
                child.type === 'import_from_statement'
            ) {
                imports.push(child.text.trim()); // Ensure consistent trimming
            } else if (child.type !== 'comment') {
                break;
            }
        }
        return imports;
    }

    private async getImportsForDocument(
        document: vscode.TextDocument
    ): Promise<string[]> {
        if (document.languageId !== 'python') {
            return [];
        }
        const text = document.getText();
        const cacheKey =
            document.uri.toString() + ':' + this.getImportHash(text);
        const cached = this.importCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const ast = await getAst(text);
            if (ast) {
                const imports = await this.extractImportsFromAST(ast);
                this.importCache.set(cacheKey, imports);
                return imports;
            }
        } catch (error) {
            const imports = this.extractImportsSimple(text);
            this.importCache.set(cacheKey, imports);
        }
        return [];
    }

    private extractImportsSimple(text: string): string[] {
        const lines = text.split('\n');
        const imports: string[] = [];
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('import') || line.startsWith('from')) {
                imports.push(line); // Use trimmed line for consistency
            } else if (line && !line.startsWith('#')) {
                break;
            }
        }
        return imports;
    }
}
