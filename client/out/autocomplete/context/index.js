"use strict";
/**
 * Context retrieval module
 *
 * This module is responsible for gathering relevant code context
 * to improve LLM completion quality using VSCode's language services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT_CONFIG = exports.ContextRetrievalService = void 0;
// Export main service class
var contextRetrivalService_1 = require("./contextRetrivalService");
Object.defineProperty(exports, "ContextRetrievalService", { enumerable: true, get: function () { return contextRetrivalService_1.ContextRetrievalService; } });
// Export utility functions (when we add them)
// export { formatContext, filterContext } from './utils';
/**
 * Default configuration for AST context retrieval
 */
exports.DEFAULT_CONTEXT_CONFIG = {
    maxItems: 8,
    searchRadius: 100,
    includeFunctionSignatures: true,
    includeClassHierarchy: true,
    minRelevance: 0.2
};
//# sourceMappingURL=index.js.map