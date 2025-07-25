"use strict";
/**
 * AST-BASED CONTEXT EXTRACTION (Currently Unused)
 *
 * This file provides Tree-sitter based Python AST parsing for intelligent
 * context extraction. It's preserved for future use but currently inactive.
 *
 * To enable: Uncomment imports in service.ts and use getScopedASTContext()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAst = getAst;
exports.getTreePathAtCursor = getTreePathAtCursor;
exports.getContextForPath = getContextForPath;
exports.getSnippetsForNode = getSnippetsForNode;
const Parser = require("web-tree-sitter");
const path = require("path");
const fs = require("fs");
const extension_1 = require("../../extension");
// Build path from file root to cursor position
// Find scope containing cursor
// HelperVars pipeline, builds an Ast -> has fallback for autocomplete to work even if
// Ast doesn't work
//
const TYPES_TO_USE = new Set([
    "module",
    "function_definition",
    "class_definition",
]);
async function getQuery(nodeType) {
    try {
        // Handle both source (development) and compiled (production) paths
        const basePath = __dirname.includes("/out/")
            ? path.join(__dirname, "../../../../../client/src/autocomplete/context")
            : __dirname;
        // Additional fallback for different project structures
        const possiblePaths = [
            basePath,
            path.join(__dirname, "../../../../../custom-llm-autocomplete/client/src/autocomplete/context"),
            path.join(__dirname, "../../../../../../custom-llm-autocomplete/client/src/autocomplete/context"),
        ];
        let queryPath = "";
        let foundPath = false;
        // Try different possible paths
        for (const testPath of possiblePaths) {
            const testQueryPath = path.join(testPath, "languages", "python", "queries", `${nodeType}.scm`);
            if (fs.existsSync(testQueryPath)) {
                queryPath = testQueryPath;
                foundPath = true;
                break;
            }
        }
        if (!foundPath) {
            return undefined;
        }
        const querySource = fs.readFileSync(queryPath, "utf8");
        await Parser.init();
        const wasmPath = path.join(__dirname, "../../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm");
        const language = await Parser.Language.load(wasmPath);
        return language.query(querySource);
    }
    catch (error) {
        return undefined;
    }
}
async function getAst(fileContents) {
    try {
        await Parser.init();
        const parser = new Parser();
        // Load the Python language grammar from tree-sitter-wasms
        const wasmPath = path.join(__dirname, "../../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm");
        const Python = await Parser.Language.load(wasmPath);
        parser.setLanguage(Python);
        const ast = parser.parse(fileContents);
        return ast;
    }
    catch (e) {
        extension_1.astLog.appendLine(`[AST] Error during parsing: ${e}`);
        return undefined;
    }
}
async function getTreePathAtCursor(ast, cursorIndex, cursorLine) {
    // Built in tree sitter search to find deepest node at cursor
    let cursorNode = ast.rootNode.descendantForIndex(cursorIndex);
    extension_1.astLog.appendLine(`[TreePath] Cursor at byte ${cursorIndex}, line ${cursorLine}, found node: ${cursorNode.type}`);
    // Check if cursorNode is the module/root node (usually not what we want for code completion)
    if (cursorNode.type === "module" &&
        cursorNode.startIndex === 0 &&
        cursorLine !== undefined) {
        extension_1.astLog.appendLine(`[TreePath] Module node found - finding function by line number`);
        // Find all function definitions and check which one contains the cursor line
        const functions = ast.rootNode.children.filter((child) => child.type === "function_definition");
        let targetFunction = null;
        for (const func of functions) {
            extension_1.astLog.appendLine(`[TreePath] Function ${func.children.find((c) => c.type === "identifier")?.text || "unknown"} spans lines ${func.startPosition.row}-${func.endPosition.row}`);
            // Check if cursor is within this function's range
            if (cursorLine >= func.startPosition.row &&
                cursorLine <= func.endPosition.row) {
                targetFunction = func;
                extension_1.astLog.appendLine(`[TreePath] Cursor is inside function: ${func.children.find((c) => c.type === "identifier")?.text ||
                    "unknown"}`);
                break;
            }
        }
        if (targetFunction) {
            // Find the most specific node within this function at cursor position
            cursorNode =
                targetFunction.descendantForIndex(cursorIndex) || targetFunction;
            extension_1.astLog.appendLine(`[TreePath] Selected node: ${cursorNode.type} within target function`);
        }
    }
    // A SyntaxNode represents a piece of parsed code with its type, source text, position, and tree relations (parent/children).
    const path = [];
    let current = cursorNode;
    while (current) {
        path.unshift(current); // Append at start
        extension_1.astLog.appendLine(`[TreePath] Adding to path: ${current.type} (${current.startPosition.row}:${current.startPosition.column})`);
        current = current.parent;
    }
    extension_1.astLog.appendLine(`[TreePath] Final path: ${path.map((n) => n.type).join(" -> ")}`);
    return path;
}
async function getContextForPath(filepath, astPath) {
    const snippets = [];
    const usefulNodes = astPath.filter((node) => TYPES_TO_USE.has(node.type));
    // Only adding code from useful node types
    for (const astNode of usefulNodes) {
        const newSnippets = await getSnippetsForNode(filepath, astNode);
        snippets.push(...newSnippets);
    }
    return snippets;
}
async function getSnippetsForNode(filepath, astNode) {
    const snippets = [];
    // Skip if not a useful type
    if (!TYPES_TO_USE.has(astNode.type)) {
        return snippets;
    }
    // Load query for the specific node type (program, function_definition, etc.)
    const query = await getQuery(astNode.type);
    if (!query) {
        return snippets;
    }
    // Execute query and collect snippets from captures
    const matches = query.matches(astNode);
    // Process matches based on node type
    for (const match of matches) {
        const snippet = processMatchForNodeType(astNode.type, match, filepath);
        if (snippet) {
            snippets.push(snippet);
        }
        else {
            extension_1.astLog.appendLine(`[SnippetsForNode] No snippet generated from match`);
        }
    }
    return snippets;
}
function processMatchForNodeType(nodeType, match, filepath) {
    const captureMap = new Map();
    // Build map of capture names to nodes
    for (const capture of match.captures) {
        captureMap.set(capture.name, capture.node);
    }
    switch (nodeType) {
        case "module":
        case "program":
            return processProgram(captureMap, filepath);
        case "function_definition":
            return processFunctionDefinition(captureMap, filepath);
        case "class_definition":
            return processClassDefinition(captureMap, filepath);
        default:
            return null;
    }
}
function processProgram(captureMap, filepath) {
    // For imports, just return the import statement
    const importNode = captureMap.get("import") || captureMap.get("from_import");
    if (importNode) {
        return {
            content: importNode.text.trim(),
            filepath,
            type: "code",
            scopeLevel: "module",
            symbolType: "import",
        };
    }
    // For top-level functions/classes, return signature only
    const functionNode = captureMap.get("top_level_function");
    if (functionNode) {
        const nameNode = captureMap.get("function_name");
        const paramsNode = captureMap.get("parameters");
        if (nameNode && paramsNode) {
            const signature = `def ${nameNode.text}${paramsNode.text}:`;
            return {
                content: signature,
                filepath,
                type: "code",
                scopeLevel: "module",
                symbolType: "function",
            };
        }
    }
    const classNode = captureMap.get("top_level_class");
    if (classNode) {
        const nameNode = captureMap.get("class_name");
        if (nameNode) {
            const signature = `class ${nameNode.text}:`;
            return {
                content: signature,
                filepath,
                type: "code",
                scopeLevel: "module",
                symbolType: "class",
            };
        }
    }
    return null;
}
function processFunctionDefinition(captureMap, filepath) {
    const nameNode = captureMap.get("function_name");
    const paramsNode = captureMap.get("parameters");
    if (nameNode && paramsNode) {
        const signature = `def ${nameNode.text}${paramsNode.text}:`;
        return {
            content: signature,
            filepath,
            type: "code",
            scopeLevel: "current",
            symbolType: "function",
        };
    }
    return null;
}
function processMethodDefinition(captureMap, filepath) {
    const nameNode = captureMap.get("function_name");
    const paramsNode = captureMap.get("parameters");
    if (nameNode && paramsNode) {
        const signature = `def ${nameNode.text}${paramsNode.text}:`;
        return {
            content: signature,
            filepath,
            type: "code",
            scopeLevel: "class",
            symbolType: "method",
        };
    }
    return null;
}
function processClassDefinition(captureMap, filepath) {
    const nameNode = captureMap.get("class_name");
    if (nameNode) {
        const signature = `class ${nameNode.text}:`;
        return {
            content: signature,
            filepath,
            type: "code",
            scopeLevel: "current",
            symbolType: "class",
        };
    }
    return null;
}
//# sourceMappingURL=ast.js.map