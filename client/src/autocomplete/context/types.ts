import * as vscode from 'vscode';

/**
 * Represents a single piece of context information
 */
export interface ContextItem {
    /** The actual text content */
    text: string;
    
    /** File URI where this context comes from */
    uri: vscode.Uri;
    
    /** Position range in the document */
    range: vscode.Range;
    
    /** Type of context - helps with prioritization */
    type: ContextType;
    
    /** Optional relevance score (0-1) */
    relevance?: number;
}

/**
 * Different types of AST context we can retrieve
 */
export type ContextType = 
    | 'function'      // Function definitions (def)
    | 'class'         // Class definitions
    | 'variable'      // Variable assignments  
    | 'import'        // Import statements
    | 'method'        // Class methods
    | 'parameter'     // Function parameters
    | 'comment'       // Comments and docstrings
    | 'decorator';    // Python decorators (@)

/**
 * Configuration for AST context retrieval
 */
export interface ContextConfig {
    /** Maximum number of context items to retrieve */
    maxItems: number;
    
    /** Maximum distance in lines to search for context */
    searchRadius: number;
    
    /** Whether to include function signatures */
    includeFunctionSignatures: boolean;
    
    /** Whether to include class hierarchies */
    includeClassHierarchy: boolean;
    
    /** Minimum relevance score to include an item */
    minRelevance: number;
}

/**
 * Result of context retrieval operation
 */
export interface ContextResult {
    /** Retrieved context items */
    items: ContextItem[];
    
    /** Time taken for retrieval in ms */
    retrievalTime: number;
    
    /** Any errors encountered during retrieval */
    errors: string[];
}