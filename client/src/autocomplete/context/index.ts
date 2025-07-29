/**
 * Context Retrieval System
 * 
 * Currently uses simple cursor-based context extraction.
 * AST-based infrastructure is available but commented out.
 * See README.md for details on enabling AST context.
 */

export { ContextRetrievalService } from "./service";

// Currently unused - available for future AST-based context
export type {
	ContextItem,
	ContextType,
	ContextConfig,
	ContextResult,
	AutocompleteSnippet,
	ScopeLevel,
	SymbolType,
} from "./types";

// Currently unused - available for future AST-based context
// export { 
// 	prioritizeSnippets, 
// 	formatSnippetsAsContext, 
// 	buildScopeAwareContext 
// } from "./formatters";

// Currently unused - available for future AST-based context
// export const DEFAULT_CONTEXT_CONFIG = {
// 	maxItems: 8,
// 	searchRadius: 100,
// 	includeFunctionSignatures: true,
// 	includeClassHierarchy: true,
// 	minRelevance: 0.2,
// } as const;
