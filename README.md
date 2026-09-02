# Context-Aware Line Capitalizer

Automatically capitalize the first letter of each line as you type in Obsidian — intelligently aware of code, LaTeX, Markdown syntax, and manual overwrites.

## Description

This plugin automatically capitalizes the first letter of each line in your notes as you type. It works in real-time while remaining context-aware so that code snippets, math formulas, links, and manual lowercase edits are never incorrectly altered.

## Features & Behavior

- **Context Aware**:
  - **Code Blocks & Inline Code**: Does not capitalize inside fenced code blocks (` ``` ` or `~~~`) or lines starting with inline code (`` `code` ``).
  - **LaTeX & Math**: Does not capitalize inside multi-line math blocks (`$$...$$`) or lines starting with LaTeX (`$...$`).
  - **YAML Frontmatter**: Ignores frontmatter metadata blocks (`---...---`).
  - **URLs, Links & Tags**: Leaves lines starting with links (`[...]`, `[[...]]`), URLs (`https://...`), or tags (`#tag`) untouched.
  - **Markdown Formatting**: Intelligently skips list markers (`-`, `*`, `+`, `1.`), task checkboxes (`- [ ]`), blockquotes (`>`), headings (`#`), and opening quotes/punctuation so the actual first word is capitalized.
- **Manual Overwrite / Undo Support**:
  - If you manually change a capitalized letter back to lowercase on the current line, the plugin recognizes your intentional overwrite and will not re-capitalize it.
- **Cursor Preservation**:
  - Seamlessly maintains your cursor position without interrupting your typing flow.
- **Unicode Support**:
  - Fully supports Unicode letters across all languages.

## How to Use

Simply install and enable the plugin. Once activated, it will automatically capitalize lines as you type. No configuration or commands are needed.

## Installation

### Manual Installation

1. Clone or download the repository files (`main.js`, `manifest.json`).
2. Place them into your vault's `.obsidian/plugins/aware-obsidian-line-capitalizer/` directory.
3. Reload Obsidian (or restart).
4. Enable the plugin in **Settings → Community Plugins**.

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/EhrenTheMan/aware-obsidian-line-capitalizer/issues) on GitHub.

## License

MIT
