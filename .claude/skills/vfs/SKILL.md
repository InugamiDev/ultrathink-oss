# VFS — Virtual Function Signatures

> Token-efficient code discovery using AST-extracted function signatures.

## When to Use

- Exploring unfamiliar codebases or large files
- Understanding module APIs without reading implementation details
- Mapping project structure and exports
- Pre-reading before targeted file reads (Read tool)
- Reducing token usage on code exploration by 60-98%

## Core Concept

VFS extracts **exported function, class, and interface signatures** from source files using AST/tree-sitter parsing. Bodies are stripped — you get the shape of code without the implementation.

## Usage

### CLI
```bash
# Single file — get all exported signatures
vfs src/memory.ts

# Directory — recursive scan of all supported files
vfs src/

# Specific language filter
vfs --lang typescript src/
```

### MCP Server
Configured in `.mcp.json`. Available as tool calls in Claude Code.

## Supported Languages

TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, Swift, Kotlin, Scala, Dart (13 languages).

## Workflow Pattern

### Explore-Then-Read (recommended)
1. `vfs <directory>` — Get structural overview (signatures only)
2. Identify the specific functions/classes you need
3. `Read <file>` with line offsets — Read only the relevant sections

### Compare-APIs
1. `vfs src/old-module.ts` — Get old API surface
2. `vfs src/new-module.ts` — Get new API surface
3. Compare signatures for breaking changes

### Dependency Mapping
1. `vfs src/` — Get all exports across the project
2. Identify which modules export what
3. Trace import chains without reading full files

## Token Savings

| File Size | Full Read | VFS | Savings |
|-----------|-----------|-----|---------|
| 100 lines | ~2K tokens | ~200 tokens | 90% |
| 500 lines | ~10K tokens | ~500 tokens | 95% |
| 1000+ lines | ~20K tokens | ~800 tokens | 96% |

## Integration Notes

- Binary at `~/go/bin/vfs`
- MCP config in project `.mcp.json`
- Works on any file tree — no project config needed
- Output is plain text, one signature per line with file:line prefix
