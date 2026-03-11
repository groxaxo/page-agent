/**
 * JavaScript syntax highlighting component, suitable for demonstrating code snippets in articles.
 */
import React from 'react'

import styles from './HighlightSyntax.module.css'

interface HighlightSyntaxProps {
	code: string
}

// JavaScript/TypeScript keywords
const keywords =
	'async|await|function|const|let|var|if|else|for|while|return|try|catch|finally|class|extends|from|import|export|default|undefined|throw|break|continue|switch|case|do|with|yield|delete|typeof|void|static|get|set|super|debugger'

// TypeScript-specific keywords
const tsKeywords =
	'interface|type|enum|namespace|module|declare|abstract|implements|public|private|protected|readonly|as|satisfies|infer|keyof|is'

// Boolean and null literals
const literals = 'true|false|null|undefined|NaN|Infinity'

// TypeScript built-in types
const tsTypes =
	'string|number|boolean|any|unknown|never|void|object|symbol|bigint|Array|Promise|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|Parameters|ConstructorParameters|InstanceType|ThisType|Uppercase|Lowercase|Capitalize|Uncapitalize'

// Helper function: escape HTML special characters
function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Syntax highlighting function: extract tokens first, then escape and highlight
function highlightSyntax(code: string): string {
	// Build regex pattern covering all token types (matched on raw text)
	const pattern = new RegExp(
		'(' +
			// 1. Strings (double-quoted, single-quoted, template literals)
			'"([^"\\\\]|\\\\.)*"|' +
			"'([^'\\\\]|\\\\.)*'|" +
			'`([^`\\\\]|\\\\.)*`|' +
			// 2. Comments (single-line and multi-line)
			'//[^\\n]*|' +
			'/\\*[\\s\\S]*?\\*/|' +
			// 3. Decorators
			'@[a-zA-Z_$][\\w$]*|' +
			// 4. Numbers (decimal, hexadecimal, scientific notation)
			'\\b0[xX][0-9a-fA-F]+\\b|' +
			'\\b\\d+\\.?\\d*(?:[eE][+-]?\\d+)?\\b|' +
			// 5. TypeScript/JavaScript keywords
			'\\b(?:' +
			keywords +
			'|' +
			tsKeywords +
			'|' +
			literals +
			')\\b|' +
			// 6. TypeScript built-in types
			'\\b(?:' +
			tsTypes +
			')\\b|' +
			// 7. Arrow function
			'=>|' +
			// 8. Function calls (identifier followed by parenthesis)
			'\\b[a-zA-Z_$][\\w$]*(?=\\()|' +
			// 9. Property access
			'\\.[a-zA-Z_$][\\w$]*|' +
			// 10. Operators and special symbols
			'[+\\-*/%&|^!~<>=?:]+|' +
			'[{}\\[\\]();,.]' +
			')',
		'g'
	)

	const tokens: string[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = pattern.exec(code)) !== null) {
		if (match.index > lastIndex) {
			const gap = code.slice(lastIndex, match.index)
			// Split gaps on whitespace, preserving whitespace tokens
			tokens.push(...gap.split(/(\s+)/))
		}
		tokens.push(match[0])
		lastIndex = pattern.lastIndex
	}
	if (lastIndex < code.length) {
		tokens.push(...code.slice(lastIndex).split(/(\s+)/))
	}

	const highlighted = tokens
		.map((token) => {
			// Return whitespace tokens as-is
			if (/^\s+$/.test(token)) {
				return token
			}

			// 1. Comments (single-line and multi-line)
			if (/^\/\/.*$/.test(token) || /^\/\*[\s\S]*?\*\/$/.test(token)) {
				return `<span class="${styles.comment}">${escapeHtml(token)}</span>`
			}

			// 2. Strings
			if (
				/^"([^"\\]|\\.)*"$/.test(token) ||
				/^'([^'\\]|\\.)*'$/.test(token) ||
				/^`([^`\\]|\\.)*`$/.test(token)
			) {
				return `<span class="${styles.string}">${escapeHtml(token)}</span>`
			}

			// 3. Numbers
			if (/^(0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)$/.test(token)) {
				return `<span class="${styles.number}">${escapeHtml(token)}</span>`
			}

			// 4. Boolean and special literals
			if (new RegExp(`^(?:${literals})$`).test(token)) {
				return `<span class="${styles.literal}">${escapeHtml(token)}</span>`
			}

			// 5. JavaScript/TypeScript keywords
			if (new RegExp(`^(?:${keywords})$`).test(token)) {
				return `<span class="${styles.keyword}">${escapeHtml(token)}</span>`
			}

			// 6. TypeScript-specific keywords
			if (new RegExp(`^(?:${tsKeywords})$`).test(token)) {
				return `<span class="${styles.tsKeyword}">${escapeHtml(token)}</span>`
			}

			// 7. TypeScript built-in types
			if (new RegExp(`^(?:${tsTypes})$`).test(token)) {
				return `<span class="${styles.type}">${escapeHtml(token)}</span>`
			}

			// 8. Decorators
			if (/^@[a-zA-Z_$][\w$]*$/.test(token)) {
				return `<span class="${styles.decorator}">${escapeHtml(token)}</span>`
			}

			// 9. Arrow function
			if (token === '=>') {
				return `<span class="${styles.arrow}">${escapeHtml(token)}</span>`
			}

			// 10. Function calls and identifiers
			if (/^[a-zA-Z_$][\w$]*$/.test(token)) {
				return `<span class="${styles.identifier}">${escapeHtml(token)}</span>`
			}

			// 11. Property access
			if (/^\.[a-zA-Z_$][\w$]*$/.test(token)) {
				return `<span class="${styles.property}">${escapeHtml(token)}</span>`
			}

			// 12. Operators
			if (/^[+\-*/%&|^!~<>=?:]+$/.test(token)) {
				return `<span class="${styles.operator}">${escapeHtml(token)}</span>`
			}

			// 13. Other symbols — escape and return
			return escapeHtml(token)
		})
		.join('')

	return highlighted
}

const HighlightSyntaxClient: React.FC<HighlightSyntaxProps> = ({ code }) => {
	const htmlContent = highlightSyntax(code)

	// eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
	return <code className={styles.syntax} dangerouslySetInnerHTML={{ __html: htmlContent }} />
}

export default HighlightSyntaxClient
