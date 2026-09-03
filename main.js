var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LineCapitalizerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var LineCapitalizerPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.lineHistory = /* @__PURE__ */ new Map();
    this.overwrittenLines = /* @__PURE__ */ new Set();
  }
  onload() {
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) => {
        this.handleEditorChange(editor);
      })
    );
  }
  handleEditorChange(editor) {
    const cursor = editor.getCursor();
    const currentLineNum = cursor.line;
    const currentLine = editor.getLine(currentLineNum);
    let history = this.lineHistory.get(editor);
    if (!history || history.lineNumber !== currentLineNum) {
      history = {
        lineNumber: currentLineNum,
        text: currentLine,
        capitalizedIndex: null
      };
      this.lineHistory.set(editor, history);
    } else {
      const prevText = history.text;
      const prevCapIndex = history.capitalizedIndex;
      if (prevCapIndex !== null && prevCapIndex < currentLine.length) {
        const prevChar = prevText[prevCapIndex];
        const currChar = currentLine[prevCapIndex];
        if (prevChar && currChar && prevChar === prevChar.toUpperCase() && currChar === currChar.toLowerCase() && prevChar.toLowerCase() === currChar.toLowerCase()) {
          this.overwrittenLines.add(currentLineNum);
        }
      }
      if (currentLine.length < prevText.length) {
        this.overwrittenLines.delete(currentLineNum);
      }
      history.text = currentLine;
    }
    if (this.isInMultiLineBlock(editor, currentLineNum)) {
      return;
    }
    if (this.overwrittenLines.has(currentLineNum)) {
      return;
    }
    const targetIndex = this.getFirstCapitalizableIndex(currentLine);
    if (targetIndex === -1) {
      return;
    }
    const char = currentLine[targetIndex];
    if (char !== char.toUpperCase()) {
      const capitalizedChar = char.toUpperCase();
      const newLine = currentLine.slice(0, targetIndex) + capitalizedChar + currentLine.slice(targetIndex + 1);
      history.capitalizedIndex = targetIndex;
      history.text = newLine;
      editor.setLine(currentLineNum, newLine);
      editor.setCursor(cursor);
    }
  }
  /**
   * Check if a line is inside a multi-line fenced code block (``` or ~~~),
   * LaTeX block ($$...$$), or YAML frontmatter (---...---).
   */
  isInMultiLineBlock(editor, targetLineNum) {
    let inCodeBlock = false;
    let inMathBlock = false;
    let inFrontmatter = false;
    for (let i = 0; i <= targetLineNum; i++) {
      const line = editor.getLine(i);
      const trimmedLine = line.trim();
      if (i === 0 && trimmedLine === "---") {
        inFrontmatter = true;
        if (targetLineNum === 0)
          return true;
        continue;
      }
      if (inFrontmatter) {
        if (trimmedLine === "---" || trimmedLine === "...") {
          inFrontmatter = false;
          if (i === targetLineNum)
            return true;
        } else if (i === targetLineNum) {
          return true;
        }
        continue;
      }
      const codeBlockMatch = trimmedLine.match(/^(`{3}|~{3})/);
      if (codeBlockMatch) {
        if (!inCodeBlock) {
          inCodeBlock = true;
        } else {
          inCodeBlock = false;
        }
        if (i === targetLineNum) {
          return true;
        }
        continue;
      }
      if (trimmedLine.startsWith("$$")) {
        const occurrences = (trimmedLine.match(/\$\$/g) || []).length;
        if (occurrences % 2 === 1) {
          inMathBlock = !inMathBlock;
        }
        if (i === targetLineNum) {
          return true;
        }
        continue;
      }
      if (i === targetLineNum) {
        if (inCodeBlock || inMathBlock) {
          return true;
        }
      }
    }
    return false;
  }
  /**
   * Find the index in `line` of the first letter that should be capitalized,
   * skipping markdown prefixes (lists, blockquotes, headings, checkboxes, callouts)
   * and ignoring lines that begin with code, math, links, tags, URLs, HTML tags, etc.
   */
  getFirstCapitalizableIndex(line) {
    let offset = 0;
    let text = line;
    const bqMatch = text.match(/^(\s*>\s*)+/);
    if (bqMatch) {
      offset += bqMatch[0].length;
      text = text.slice(bqMatch[0].length);
    }
    const listMatch = text.match(/^\s*(?:[-*+]\s+(?:\[[ xX\-/]\]\s+)?|\d+[\.\)]\s+)/);
    if (listMatch) {
      offset += listMatch[0].length;
      text = text.slice(listMatch[0].length);
    }
    const headingMatch = text.match(/^\s*#{1,6}\s+/);
    if (headingMatch) {
      offset += headingMatch[0].length;
      text = text.slice(headingMatch[0].length);
    }
    const wsMatch = text.match(/^\s+/);
    if (wsMatch) {
      offset += wsMatch[0].length;
      text = text.slice(wsMatch[0].length);
    }
    if (text.length === 0) {
      return -1;
    }
    if (text.startsWith("`")) {
      return -1;
    }
    if (text.startsWith("$")) {
      return -1;
    }
    if (text.startsWith("[") || text.startsWith("![") || text.startsWith("[[")) {
      return -1;
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) {
      return -1;
    }
    if (text.startsWith("#")) {
      return -1;
    }
    if (text.startsWith("<")) {
      return -1;
    }
    const match = text.match(/\p{L}/u);
    if (!match || match.index === void 0) {
      return -1;
    }
    const letterIndexInText = match.index;
    const prefix = text.slice(0, letterIndexInText);
    if (!/^["'“‘«(（\[{<_\s]*$/u.test(prefix)) {
      return -1;
    }
    return offset + letterIndexInText;
  }
};
