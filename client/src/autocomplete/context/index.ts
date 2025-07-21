/**
 * This module is responsible for gathering relevant code context
 * to improve LLM completion quality using VSCode's language services.
 */

export { ContextRetrievalService } from "./contextRetrievalService";

export type {
	ContextItem,
	ContextType,
	ContextConfig,
	ContextResult,
} from "./types";

// Export utility functions (when we add them)
// export { formatContext, filterContext } from './utils';

export const DEFAULT_CONTEXT_CONFIG = {
	maxItems: 8,
	searchRadius: 100,
	includeFunctionSignatures: true,
	includeClassHierarchy: true,
	minRelevance: 0.2,
} as const;
