"use strict";
/**
 * This module is responsible for gathering relevant code context
 * to improve LLM completion quality using AST parsing and scope awareness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT_CONFIG = exports.buildScopeAwareContext = exports.formatSnippetsAsContext = exports.prioritizeSnippets = exports.ContextRetrievalService = void 0;
var service_1 = require("./service");
Object.defineProperty(exports, "ContextRetrievalService", { enumerable: true, get: function () { return service_1.ContextRetrievalService; } });
// Export utility functions
var formatters_1 = require("./formatters");
Object.defineProperty(exports, "prioritizeSnippets", { enumerable: true, get: function () { return formatters_1.prioritizeSnippets; } });
Object.defineProperty(exports, "formatSnippetsAsContext", { enumerable: true, get: function () { return formatters_1.formatSnippetsAsContext; } });
Object.defineProperty(exports, "buildScopeAwareContext", { enumerable: true, get: function () { return formatters_1.buildScopeAwareContext; } });
exports.DEFAULT_CONTEXT_CONFIG = {
    maxItems: 8,
    searchRadius: 100,
    includeFunctionSignatures: true,
    includeClassHierarchy: true,
    minRelevance: 0.2,
};
//# sourceMappingURL=index.js.map