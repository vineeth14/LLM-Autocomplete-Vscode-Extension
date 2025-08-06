import * as Parser from "web-tree-sitter";
import * as path from "path";
import * as fs from "fs";
import { AutocompleteSnippet } from "./types";
import { language } from "tree-sitter-python";
import { LRUCache } from "vscode-languageclient";
import { createHash } from "crypto";
import * as vscode from "vscode";
import { readRangeInFile, gotoDefinition } from "./file-utils";

export type AstPath = Parser.SyntaxNode[];

const TYPES_TO_USE = new Set([
	// "module",
	"function_definition",
	//"program",
	"class_definition",
]);

const cache = new LRUCache<string, AutocompleteSnippet[]>(100);

// Parser initialization state
let parserInitialized = false;
let pythonLanguage: Parser.Language | null = null;

async function initializeParser(): Promise<Parser.Language | null> {
	if (parserInitialized && pythonLanguage) {
		return pythonLanguage;
	}

	try {
		await Parser.init();
		const wasmPath = path.join(
			__dirname,
			"../../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm"
		);
		pythonLanguage = await Parser.Language.load(wasmPath);
		parserInitialized = true;
		return pythonLanguage;
	} catch (error) {
		return null;
	}
}

// Core AST parsing functions

export function nodeToRange(
	document: vscode.TextDocument,
	node: Parser.SyntaxNode
): vscode.Range {
	return new vscode.Range(
		new vscode.Position(node.startPosition.row, node.startPosition.column),
		new vscode.Position(node.endPosition.row, node.endPosition.column)
	);
}

export async function getAst(
	fileContents: string
): Promise<Parser.Tree | undefined> {
	try {
		const language = await initializeParser();
		if (!language) return undefined;

		const parser = new Parser();
		parser.setLanguage(language);
		return parser.parse(fileContents);
	} catch (error) {
		return undefined;
	}
}

export async function getTreePathAtCursor(
	ast: Parser.Tree,
	cursorIndex: number,
	cursorLine?: number
): Promise<AstPath> {
	// Built in tree sitter search to find deepest node at cursor
	let cursorNode = ast.rootNode.descendantForIndex(cursorIndex);

	// Check if cursorNode is the module/root node (usually not what we want for code completion)
	if (
		cursorNode.type === "module" &&
		cursorNode.startIndex === 0 &&
		cursorLine !== undefined
	) {
		// Find all function definitions and check which one contains the cursor line
		const functions = ast.rootNode.children.filter(
			child => child.type === "function_definition"
		);

		let targetFunction: Parser.SyntaxNode | null = null;
		for (const func of functions) {
			// Check if cursor is within this function's range
			if (
				cursorLine >= func.startPosition.row &&
				cursorLine <= func.endPosition.row
			) {
				targetFunction = func;
				break;
			}
		}

		if (targetFunction) {
			// Find the most specific node within this function at cursor position
			cursorNode =
				targetFunction.descendantForIndex(cursorIndex) ||
				targetFunction;
		}
	}

	// A SyntaxNode represents a piece of parsed code with its type:
	// source text, position, and tree relations (parent/children).
	const path: Parser.SyntaxNode[] = [];
	let current = cursorNode;
	while (current) {
		path.unshift(current); // Append at start
		current = current.parent;
	}

	return path;
}

// Context extraction functions

export async function getContextForPath(
	filepath: string,
	astPath: AstPath
): Promise<AutocompleteSnippet[]> {
	const snippets: AutocompleteSnippet[] = [];

	let parentKey = filepath;
	const usefulNodes = astPath.filter(node => TYPES_TO_USE.has(node.type));

	// Only adding code from useful node types
	for (const astNode of usefulNodes) {
		const key = keyFromNode(parentKey, astNode);
		const foundInCache = cache.get(key);
		const newSnippets =
			foundInCache ?? (await getSnippetsForNode(filepath, astNode));

		snippets.push(...newSnippets);

		if (!foundInCache) {
			cache.set(key, newSnippets);
		}

		parentKey = key;
	}
	return snippets;
}

async function getSnippetsForNode(
	filepath: string,
	astNode: Parser.SyntaxNode
): Promise<AutocompleteSnippet[]> {
	const snippets: AutocompleteSnippet[] = [];

	// Skip if not a useful type
	if (!TYPES_TO_USE.has(astNode.type)) {
		return snippets;
	}

	// Load query for the specific node type (program, function_definition, etc.)
	const query: Parser.Query | undefined = await getQuery(astNode.type);

	if (!query) {
		return snippets;
	}

	// Execute query and collect snippets from captures
	//const matches = query.matches(astNode);

	// Process matches based on node type
	const queries = query
		.matches(astNode)
		.map(async (match: Parser.QueryMatch) => {
			const matchSnippets: AutocompleteSnippet[] = [];
			for (const item of match.captures) {
				try {
					const endPosition = item.node.endPosition;
					const newSnippets = await getSnippets(
						filepath,
						endPosition
					);
					matchSnippets.push(...newSnippets);
				} catch (e) {
				}
			}
			return matchSnippets;
		});
	// Beautiful Code, to process the snippets concurrently.
	const results = await Promise.all(queries);
	snippets.push(...results.flat());
	return snippets;
}

async function getSnippets(
	filepath: string,
	endPosition: Parser.Point
): Promise<AutocompleteSnippet[]> {
	const vscodePosition = new vscode.Position(
		endPosition.row,
		endPosition.column
	);
	const definitions = await gotoDefinition(filepath, vscodePosition);

	const newSnippets = await Promise.all(
		definitions.map(
			async (def): Promise<AutocompleteSnippet> => ({
				content: await readRangeInFile(
					def.targetUri.fsPath,
					def.targetRange
				).catch(error => {
					return "// Failed to read definition content";
				}),
				filepath: def.targetUri.fsPath,
				type: "code",
			})
		)
	);
	return newSnippets;
}

// Query system functions

async function getQuery(nodeType: string): Promise<Parser.Query | undefined> {
	try {
		const language = await initializeParser();
		if (!language) return undefined;

		const queryPath = findQueryFile(nodeType);
		if (!queryPath) return undefined;

		const querySource = fs.readFileSync(queryPath, "utf8");
		return language.query(querySource);
	} catch (error) {
		return undefined;
	}
}

function findQueryFile(nodeType: string): string | undefined {
	// Handle both source (development) and compiled (production) paths
	const basePath = __dirname.includes("/out/")
		? path.join(__dirname, "../../../../../client/src/autocomplete/context")
		: __dirname;

	// Additional fallback for different project structures
	const possiblePaths = [
		basePath,
		path.join(
			__dirname,
			"../../../../../custom-llm-autocomplete/client/src/autocomplete/context"
		),
		path.join(
			__dirname,
			"../../../../../../custom-llm-autocomplete/client/src/autocomplete/context"
		),
	];

	for (const testPath of possiblePaths) {
		const queryPath = path.join(
			testPath,
			"languages",
			"python",
			"queries",
			`${nodeType}.scm`
		);
		if (fs.existsSync(queryPath)) {
			return queryPath;
		}
	}

	return undefined;
}

// Utility functions

function keyFromNode(parentKey: string, astNode: Parser.SyntaxNode): string {
	return createHash("sha256")
		.update(parentKey)
		.update(astNode.type)
		.update(astNode.startIndex.toString())
		.digest("hex");
}

export function estimateTokensZeta(text: string): number {
	return Math.ceil(text.length / 3);
}
