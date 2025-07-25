"use strict";
/**
 * Context Retrieval System
 *
 * Currently uses simple cursor-based context extraction.
 * AST-based infrastructure is available but commented out.
 * See README.md for details on enabling AST context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextRetrievalService = void 0;
var service_1 = require("./service");
Object.defineProperty(exports, "ContextRetrievalService", { enumerable: true, get: function () { return service_1.ContextRetrievalService; } });
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
//# sourceMappingURL=index.js.map