# LLM Autocomplete VSCode Extension

A VSCode extension that provides AI-powered inline code completion using **[Zeta](https://huggingface.co/zed-industries/zeta)** completion engine with AST-aware context extraction, multi-edit workflows, caching optimizations, and high-performance completions.

## Features

- **Multiple Provider Support**: Ollama Local, Ollama Server, Gemini with provider-specific optimizations
- **High Performance**: Multi-level caching, HTTP connection pooling, and generator reuse
- **Smart Context**: AST-aware context extraction with tree-sitter parsing and structured prompting for Python
- **Multi-Edit Workflow**: Sequential Tab-through navigation for AI-generated multi-location edits
- **Token Budget Management**: Optimized context windows (500 tokens total) for fast inference
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

## Performance

- **Cache hit**: <1ms instant response
- **AST parsing**: ~5-15ms (tree-sitter parsing and node traversal)
- **Context extraction**: ~2-8ms (syntax-aware range expansion)
- **LLM inference**: ~300-600ms (model dependent)
- **Generator reuse**: <1ms for continued completions
- **Connection pooling**: Reduces network overhead
- **Multi-edit processing**: ~1-5ms (prediction creation and metadata)

## Debug Channels

- VSCode Output → "LLM Tab Complete" - completion results and timing
- VSCode Output → "Context" - extracted context debugging
- `/tmp/llm-judge-test.log` - quality evaluation results
