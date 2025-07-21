/**
 * Context retrieval module
 * 
 * This module is responsible for gathering relevant code context
 * to improve LLM completion quality using VSCode's language services.
 */

// Export main service class
export { ContextRetrievalService } from './contextRetrivalService';

// Export all types and interfaces
export type { 
    ContextItem, 
    ContextType, 
    ContextConfig, 
    ContextResult 
} from './types';

// Export utility functions (when we add them)
// export { formatContext, filterContext } from './utils';

/**
 * Default configuration for AST context retrieval
 */
export const DEFAULT_CONTEXT_CONFIG = {
    maxItems: 8,
    searchRadius: 100,
    includeFunctionSignatures: true,
    includeClassHierarchy: true,
    minRelevance: 0.2
} as const;