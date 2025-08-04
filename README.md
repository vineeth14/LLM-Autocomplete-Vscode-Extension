# LLM Autocomplete VSCode Extension

A VSCode extension that provides AI-powered inline code completion using **multiple LLM providers** (Ollama Local + Ollama Server + Gemini). Features a simple cursor-based context approach with advanced caching and latency optimizations for high-performance completions.

## Features

- **Triple Provider Support**: Ollama Local, Ollama Server, and Gemini with provider-specific optimizations
- **High Performance**: Multi-level caching, HTTP connection pooling, and generator reuse
- **Smart Context**: Cursor-based context extraction with AST-powered import handling for Python
- **Advanced Filtering**: Comprehensive response cleaning for code-only completions
- **Performance Monitoring**: Detailed timing logs and latency testing

## Quick Start

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Create `.env` file** with your LLM provider configuration

3. **Build and run:**

    ```bash
    npm run compile
    ```

4. **Debug:** Press `F5` in VSCode to launch Extension Development Host

## Available Commands

- `npm run compile` - Build the entire project
- `npm run watch` - Watch mode for development
- `npm run format` - Format code with Prettier
- `llm-autocomplete.runLatencyTests` - Run performance tests
- `llm-autocomplete.runJudgeTests` - Run LLM quality evaluation tests

## Architecture

```
client/src/autocomplete/
├── LLMInlineCompletionProvider.ts  // Main completion provider
├── suggestion.ts                   // Triple provider API calls
├── prompt.ts                      // Provider-specific templates
├── debouncer.ts                   // Request debouncing (100ms)
├── filters/
│   └── suggestion-filter.ts       // Response cleaning
└── context/
    ├── service.ts                 // Context extraction
    ├── cache.ts                   // LRU completion cache
    ├── ast.ts                     // Tree-sitter Python parsing
    └── languages/python/queries/  // Tree-sitter query files
```

## Performance

- **Cache hit**: <1ms instant response
- **Context extraction**: ~1-5ms
- **LLM inference**: ~200-1000ms (model dependent)
- **Generator reuse**: <1ms for continued completions
- **Connection pooling**: Reduces network overhead

## Debug Channels

- VSCode Output → "LLM Tab Complete" - completion results and timing
- VSCode Output → "Context" - extracted context debugging
- `/tmp/llm-judge-test.log` - quality evaluation results
