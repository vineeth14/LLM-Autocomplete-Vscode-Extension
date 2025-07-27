# Context System Architecture

This directory contains a sophisticated AST-based context retrieval system that is **currently unused** but preserved for future enhancement.

## Current State
- **Active**: `service.ts` - Simple cursor-based context (3 lines before, 1 line after)
- **Inactive**: All AST-based functionality is commented out

## AST Infrastructure (Available for Future Use)

### Core Files
- **`ast.ts`** - Tree-sitter Python AST parsing, query execution, path traversal
- **`formatters.ts`** - Context prioritization, filtering, and formatting utilities  
- **`types.ts`** - Type definitions for context items, snippets, and scope levels
- **`index.ts`** - Module exports and configuration constants

### Key Features Available
1. **AST Parsing**: Tree-sitter based Python code analysis
2. **Scope Awareness**: Module → Class → Function → Current hierarchy
3. **Smart Filtering**: Relevance-based context prioritization
4. **Query System**: Tree-sitter queries for extracting symbols
5. **Context Formatting**: LLM-optimized context string building

## Enabling AST Context

To switch from simple cursor context to AST-based context:

1. **Uncomment imports** in `service.ts`
2. **Uncomment AST functions** in `service.ts` 
3. **Change** `getContextForCompletion()` to call `getScopedASTContext()`

## Architecture Overview

```
Simple Context (Current):
Cursor Position → 3 lines before + 1 line after → FIM Prompt

AST Context (Available):
Document → AST Parse → Scope Analysis → Context Extraction → Prioritization → FIM Prompt
                                     ↓
                           Module Context (imports, top-level)
                           Scope Context (current function/class)  
                           Cursor Context (filtered local code)
```

The AST system provides much richer context but adds complexity and processing overhead.