import * as Parser from "web-tree-sitter";
import * as path from "path";
import { astLog } from "../../extension";

export type AstPath = Parser.SyntaxNode[];
// Build path from file root to cursor position

// Find scope containing cursor

// HelperVars pipeline, builds an Ast -> has fallback for autocomplete to work even if
// Ast doesn't work

//

export async function getAst(
	filepath: string,
	fileContents: string
): Promise<Parser.Tree | undefined> {
	try {
		await Parser.init();

		const parser = new Parser();

		// Load the Python language grammar from tree-sitter-wasms
		const wasmPath = path.join(
			__dirname,
			"../../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm"
		);

		const Python = await Parser.Language.load(wasmPath);
		parser.setLanguage(Python);

		const ast = parser.parse(fileContents);
		astLog.appendLine(
			`[AST] File parsed successfully, returning AST` + ast.rootNode
		);
		astLog.show();

		return ast;
	} catch (e) {
		astLog.appendLine(`[AST] Error during parsing: ${e}`);
		return undefined;
	}
}
