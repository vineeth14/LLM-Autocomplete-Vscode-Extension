"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAst = getAst;
const Parser = require("web-tree-sitter");
const path = require("path");
const extension_1 = require("../../extension");
// Build path from file root to cursor position
// Find scope containing cursor
// HelperVars pipeline, builds an Ast -> has fallback for autocomplete to work even if
// Ast doesn't work
//
async function getAst(filepath, fileContents) {
    try {
        await Parser.init();
        const parser = new Parser();
        // Load the Python language grammar from tree-sitter-wasms
        const wasmPath = path.join(__dirname, "../../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm");
        const Python = await Parser.Language.load(wasmPath);
        parser.setLanguage(Python);
        const ast = parser.parse(fileContents);
        extension_1.astLog.appendLine(`[AST] File parsed successfully, returning AST` + ast.rootNode);
        extension_1.astLog.show();
        return ast;
    }
    catch (e) {
        extension_1.astLog.appendLine(`[AST] Error during parsing: ${e}`);
        return undefined;
    }
}
//# sourceMappingURL=ast.js.map