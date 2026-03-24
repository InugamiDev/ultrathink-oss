---
name: tiptap
description: Tiptap rich-text editor — headless, extensible framework built on ProseMirror for React/Vue/vanilla
layer: domain
category: editor
triggers:
  - "tiptap"
  - "rich text editor"
  - "prosemirror"
  - "WYSIWYG"
  - "collaborative editing"
  - "bubble menu"
  - "slash commands"
linksTo:
  - react
  - typescript-frontend
  - forms
linkedFrom:
  - code-writer
riskLevel: low
---

# tiptap

## Overview

Headless, extensible rich-text editor framework based on ProseMirror. Provides a modular extension system, real-time collaboration, and framework-agnostic core with first-class React bindings. Output as HTML, JSON, or Markdown.

## When to Use

- Building rich-text or block-based editors in React/Vue/vanilla
- Need collaborative real-time editing (Yjs + Hocuspocus)
- Require custom nodes, marks, or slash-command UIs
- Want headless control over editor styling and behavior

## Key Patterns

- **Editor setup**: `useEditor({ extensions, content })` hook + `<EditorContent editor={editor} />` component
- **StarterKit**: Bundle of common extensions (bold, italic, heading, lists, code, blockquote, etc.) — start here, override as needed
- **Custom extensions**: `Node.create({ name, group, content, renderHTML, parseHTML, addCommands, addKeyboardShortcuts })`
- **Marks & nodes**: Bold, italic, strike, code, link (marks); heading, image, table, codeBlock, taskList (nodes)
- **Collaborative editing**: `Collaboration` + `CollaborationCursor` extensions with `HocuspocusProvider` (Yjs backend)
- **Custom commands**: `editor.chain().focus().toggleBold().run()` — chainable command API
- **Keyboard shortcuts**: Define via `addKeyboardShortcuts()` in extensions, e.g., `'Mod-Shift-x': () => this.editor.commands.toggleStrike()`
- **BubbleMenu**: `<BubbleMenu editor={editor}>` — toolbar appears on text selection
- **FloatingMenu**: `<FloatingMenu editor={editor}>` — toolbar appears on empty lines
- **Serialization**: `editor.getHTML()`, `editor.getJSON()`, Markdown via `@tiptap/extension-markdown` or `tiptap-markdown`
- **Slash commands / suggestions**: `@tiptap/suggestion` extension — trigger on `/` char, render a popup with command list

## Anti-Patterns

- Directly mutating ProseMirror state outside tiptap's command/transaction API
- Wrapping the entire editor in uncontrolled React state (let tiptap own document state)
- Loading all extensions at once instead of tree-shaking only what you need
- Ignoring `onUpdate` debouncing — saving on every keystroke causes performance issues
- Using raw innerHTML for tiptap output — use `generateHTML()` from `@tiptap/html` or render JSON with a custom renderer, and sanitize with DOMPurify

## Related Skills

react, typescript-frontend, forms
