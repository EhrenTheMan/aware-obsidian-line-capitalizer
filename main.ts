import { Plugin, Editor } from 'obsidian'

interface LineHistory {
	lineNumber: number
	text: string
	overwrittenIndices: Set<number>
}

export default class LineCapitalizerPlugin extends Plugin {
	private lineHistory: Map<Editor, LineHistory> = new Map()

	onload() {
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				this.handleEditorChange(editor)
			})
		)
	}

	private handleEditorChange(editor: Editor) {
		const cursor = editor.getCursor()
		const currentLineNum = cursor.line
		const currentLine = editor.getLine(currentLineNum)

		let history = this.lineHistory.get(editor)

		// Check if we switched lines
		if (!history || history.lineNumber !== currentLineNum) {
			history = {
				lineNumber: currentLineNum,
				text: currentLine,
				overwrittenIndices: new Set()
			}
			this.lineHistory.set(editor, history)
		} else {
			// Check if the user manually changed an uppercase letter back to lowercase (intentional overwrite)
			const prevText = history.text
			// If length didn't change (e.g., character replaced / overwritten)
			if (prevText.length === currentLine.length) {
				for (let i = 0; i < currentLine.length; i++) {
					const prevChar = prevText[i]
					const currChar = currentLine[i]
					if (
						prevChar !== currChar &&
						prevChar.toLowerCase() === currChar.toLowerCase() &&
						prevChar === prevChar.toUpperCase() &&
						currChar === currChar.toLowerCase()
					) {
						// The user explicitly changed uppercase to lowercase at index i
						history.overwrittenIndices.add(i)
					}
				}
			} else if (currentLine.length < prevText.length) {
				// Characters deleted or replaced with shorter text: adjust or clear tracked indices
				history.overwrittenIndices.clear()
			}
			history.text = currentLine
		}

		// Don't capitalize inside multi-line code blocks or math blocks
		if (this.isInMultiLineBlock(editor, currentLineNum)) {
			return
		}

		// Find the index of the first character to capitalize, taking context into account
		const targetIndex = this.getFirstCapitalizableIndex(currentLine)
		if (targetIndex === -1) {
			return
		}

		// Check if this position was explicitly overwritten to lowercase by the user
		if (history.overwrittenIndices.has(targetIndex)) {
			return
		}

		const char = currentLine[targetIndex]
		if (char !== char.toUpperCase()) {
			const capitalizedChar = char.toUpperCase()
			const newLine = currentLine.slice(0, targetIndex) + capitalizedChar + currentLine.slice(targetIndex + 1)
			history.text = newLine
			editor.setLine(currentLineNum, newLine)
			editor.setCursor(cursor)
		}
	}

	/**
	 * Check if a line is inside a multi-line fenced code block (``` or ~~~),
	 * LaTeX block ($$...$$), or YAML frontmatter (---...---).
	 */
	private isInMultiLineBlock(editor: Editor, targetLineNum: number): boolean {
		let inCodeBlock = false
		let inMathBlock = false
		let inFrontmatter = false

		for (let i = 0; i <= targetLineNum; i++) {
			const line = editor.getLine(i).trim()

			// Check YAML frontmatter (only at the very beginning of the document)
			if (i === 0 && line === '---') {
				inFrontmatter = true
				if (targetLineNum === 0) return true
				continue
			}
			if (inFrontmatter) {
				if (line === '---' || line === '...') {
					inFrontmatter = false
					if (i === targetLineNum) return true
				} else if (i === targetLineNum) {
					return true
				}
				continue
			}

			// Check multi-line fenced code blocks
			if (line.startsWith('```') || line.startsWith('~~~')) {
				if (!inCodeBlock) {
					inCodeBlock = true
				} else {
					inCodeBlock = false
				}
				if (i === targetLineNum) {
					return true
				}
				continue
			}

			// Check multi-line math blocks ($$)
			// A line containing both opening and closing $$ on the same line doesn't toggle multiline math block state
			if (line.startsWith('$$')) {
				const occurrences = (line.match(/\$\$/g) || []).length
				if (occurrences % 2 === 1) {
					inMathBlock = !inMathBlock
				}
				if (i === targetLineNum) {
					return true
				}
				continue
			}

			if (i === targetLineNum) {
				if (inCodeBlock || inMathBlock) {
					return true
				}
			}
		}

		return false
	}

	/**
	 * Find the index in `line` of the first letter that should be capitalized,
	 * skipping markdown prefixes (lists, blockquotes, headings, checkboxes, callouts)
	 * and ignoring lines that begin with code, math, links, tags, URLs, HTML tags, etc.
	 */
	private getFirstCapitalizableIndex(line: string): number {
		// Strip / skip leading Markdown syntax (blockquotes, lists, task checkboxes, headers)
		let offset = 0
		let text = line

		// Skip blockquotes '> ' or '>>> '
		const bqMatch = text.match(/^(\s*>\s*)+/)
		if (bqMatch) {
			offset += bqMatch[0].length
			text = text.slice(bqMatch[0].length)
		}

		// Skip list markers (- , * , + , 1. , 1) ) and task list checkboxes (- [ ] , * [x] )
		const listMatch = text.match(/^\s*(?:[-*+]\s+(?:\[[ xX\-/]\]\s+)?|\d+[\.\)]\s+)/)
		if (listMatch) {
			offset += listMatch[0].length
			text = text.slice(listMatch[0].length)
		}

		// Skip markdown headings (# , ## , etc.)
		const headingMatch = text.match(/^\s*#{1,6}\s+/)
		if (headingMatch) {
			offset += headingMatch[0].length
			text = text.slice(headingMatch[0].length)
		}

		// Skip leading whitespace
		const wsMatch = text.match(/^\s+/)
		if (wsMatch) {
			offset += wsMatch[0].length
			text = text.slice(wsMatch[0].length)
		}

		if (text.length === 0) {
			return -1
		}

		// Check if the remaining text starts with code snippet / inline code (`...`)
		if (text.startsWith('`')) {
			return -1
		}

		// Check if it starts with LaTeX / Math ($...$ or $$...$$)
		if (text.startsWith('$')) {
			return -1
		}

		// Check if it starts with markdown link/image ([...](...), [[]], ![...])
		if (text.startsWith('[') || text.startsWith('![') || text.startsWith('[[')) {
			return -1
		}

		// Check if it starts with URL (http://, https://, obsidian://, etc.)
		if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) {
			return -1
		}

		// Check if it starts with tag (#tag)
		if (text.startsWith('#')) {
			return -1
		}

		// Check if it starts with HTML tag (<...>) or comment (<!--...-->)
		if (text.startsWith('<')) {
			return -1
		}

		// Find the first Unicode letter in the text
		const match = text.match(/\p{L}/u)
		if (!match || match.index === undefined) {
			return -1
		}

		const letterIndexInText = match.index

		// If there is punctuation or symbols before the first letter, verify it's allowed (e.g. quotes '"', '“', '(', '«')
		const prefix = text.slice(0, letterIndexInText)
		// If prefix contains characters other than opening punctuation / quotes, skip
		if (!/^["'“‘«(（\[{<_\s]*$/u.test(prefix)) {
			return -1
		}

		return offset + letterIndexInText
	}
}
