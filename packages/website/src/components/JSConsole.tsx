/**
 * JavaScript debug console, suitable for letting users run code directly in docs and view results in real time.
 */
/* eslint-disable @typescript-eslint/no-base-to-string */
import { KeyboardEvent, useEffect, useImperativeHandle, useRef, useState } from 'react'

import HighlightSyntax from './HighlightSyntax'

import styles from './JSConsole.module.css'

// Global console interceptor manager
class ConsoleInterceptor {
	private static instance: ConsoleInterceptor
	private subscribers = new Set<(type: string, args: unknown[]) => void>()
	private originalConsole: {
		log: typeof console.log
		warn: typeof console.warn
		error: typeof console.error
	}
	private isIntercepting = false

	private constructor() {
		this.originalConsole = {
			log: console.log.bind(console),
			warn: console.warn.bind(console),
			error: console.error.bind(console),
		}
	}

	static getInstance() {
		if (!ConsoleInterceptor.instance) {
			ConsoleInterceptor.instance = new ConsoleInterceptor()
		}
		return ConsoleInterceptor.instance
	}

	subscribe(callback: (type: string, args: unknown[]) => void) {
		this.subscribers.add(callback)
		this.startIntercepting()
	}

	unsubscribe(callback: (type: string, args: unknown[]) => void) {
		this.subscribers.delete(callback)
		if (this.subscribers.size === 0) {
			this.stopIntercepting()
		}
	}

	private startIntercepting() {
		if (this.isIntercepting) return

		this.isIntercepting = true

		console.log = (...args: unknown[]) => {
			this.originalConsole.log(...args)
			this.notifySubscribers('log', args)
		}

		console.warn = (...args: unknown[]) => {
			this.originalConsole.warn(...args)
			this.notifySubscribers('warn', args)
		}

		console.error = (...args: unknown[]) => {
			this.originalConsole.error(...args)
			this.notifySubscribers('error', args)
		}
	}

	private stopIntercepting() {
		if (!this.isIntercepting) return

		this.isIntercepting = false
		console.log = this.originalConsole.log
		console.warn = this.originalConsole.warn
		console.error = this.originalConsole.error
	}

	private notifySubscribers(type: string, args: unknown[]) {
		this.subscribers.forEach((callback) => {
			callback(type, args)
		})
	}
}

interface JSConsoleProps {
	context?: Record<string, unknown>
	height?: string
	onExecute?: (code: string, result: unknown) => void
	placeholder?: string
	ref?: React.Ref<JSConsoleRef>
}

export interface JSConsoleRef {
	executeCode: (code: string) => Promise<unknown>
	clear: () => void
	appendOutput: (content: string) => void
}

interface OutputItem {
	type: 'input' | 'output' | 'error' | 'log'
	content: string
	timestamp: number
}

const DEFAULT_CONTEXT = {}

function JSConsole({
	context = DEFAULT_CONTEXT,
	height = '400px',
	onExecute,
	placeholder = 'Enter JavaScript code...',
	ref,
}: JSConsoleProps) {
	const [input, setInput] = useState('')
	const [outputs, setOutputs] = useState<OutputItem[]>([])
	const [isExecuting, setIsExecuting] = useState(false)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const outputRef = useRef<HTMLDivElement>(null)

	// Persistent execution context — shared scope across multiple executions
	const executionContextRef = useRef<Record<string, unknown>>({})

	// Format result value for display
	const formatResult = (value: unknown): string => {
		if (value === null) return 'null'
		if (value === undefined) return 'undefined'
		if (typeof value === 'string') return `"${value}"`
		if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value, null, 2)
			} catch {
				return value.toString()
			}
		}
		return String(value)
	}

	// Global console interception handler
	useEffect(() => {
		const interceptor = ConsoleInterceptor.getInstance()

		const handleGlobalConsole = (type: string, args: unknown[]) => {
			const content = args.map((arg) => formatResult(arg)).join(' ')

			const outputItem: OutputItem = {
				type: type as any,
				content: content,
				timestamp: Date.now(),
			}

			setOutputs((prev) => [...prev, outputItem])

			// Auto-scroll to bottom
			setTimeout(() => {
				if (outputRef.current) {
					outputRef.current.scrollTop = outputRef.current.scrollHeight
				}
			}, 0)
		}

		interceptor.subscribe(handleGlobalConsole)

		return () => {
			interceptor.unsubscribe(handleGlobalConsole)
		}
	}, [])

	// Execute code
	const executeCode = async (code: string): Promise<unknown> => {
		if (!code.trim()) return

		setIsExecuting(true)

		// Add input to output list
		const inputItem: OutputItem = {
			type: 'input',
			content: code,
			timestamp: Date.now(),
		}

		setOutputs((prev) => [...prev, inputItem])

		try {
			// Create async function to support await
			const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

			// Merge external context with persistent execution context
			const allContext = { ...context, ...executionContextRef.current }
			const contextKeys = Object.keys(allContext)
			const contextValues = Object.values(allContext)

			// Inject console.log redirect
			const logs: string[] = []
			const mockConsole = {
				log: (...args: unknown[]) => {
					logs.push(args.map((arg) => formatResult(arg)).join(' '))
				},
				error: (...args: unknown[]) => {
					logs.push('ERROR: ' + args.map((arg) => formatResult(arg)).join(' '))
				},
				warn: (...args: unknown[]) => {
					logs.push('WARN: ' + args.map((arg) => formatResult(arg)).join(' '))
				},
			}

			// Detect whether the code is an expression or a statement
			const trimmedCode = code.trim()
			const isExpression =
				!trimmedCode.includes(';') &&
				!trimmedCode.startsWith('const ') &&
				!trimmedCode.startsWith('let ') &&
				!trimmedCode.startsWith('var ') &&
				!trimmedCode.startsWith('function ') &&
				!trimmedCode.startsWith('class ') &&
				!trimmedCode.startsWith('if ') &&
				!trimmedCode.startsWith('for ') &&
				!trimmedCode.startsWith('while ') &&
				!trimmedCode.startsWith('try ') &&
				!trimmedCode.startsWith('{') &&
				!trimmedCode.includes('\n')

			// If it's an expression, automatically prepend return
			const codeToExecute = isExpression ? `return ${code}` : code

			const wrappedCode = `
					return (async function() {
						${codeToExecute}
					})();
				`

			// Execute code
			const func = new AsyncFunction('console', ...contextKeys, wrappedCode)
			const result = await func(mockConsole, ...contextValues)

			// Add console.log output
			if (logs.length > 0) {
				const logItem: OutputItem = {
					type: 'log',
					content: logs.join('\n'),
					timestamp: Date.now(),
				}
				setOutputs((prev) => [...prev, logItem])
			}

			// Always add execution result (including undefined)
			const outputItem: OutputItem = {
				type: 'output',
				content: formatResult(result),
				timestamp: Date.now(),
			}
			setOutputs((prev) => [...prev, outputItem])

			onExecute?.(code, result)
			return result
		} catch (error) {
			const errorItem: OutputItem = {
				type: 'error',
				content: error instanceof Error ? error.message : String(error),
				timestamp: Date.now(),
			}
			setOutputs((prev) => [...prev, errorItem])
			throw error
		} finally {
			setIsExecuting(false)
			// Scroll to bottom
			setTimeout(() => {
				if (outputRef.current) {
					outputRef.current.scrollTop = outputRef.current.scrollHeight
				}
			}, 0)
		}
	}

	// Clear the console
	const clear = () => {
		setOutputs([])
		// Also reset the execution context
		executionContextRef.current = {}
	}

	// Append output
	const appendOutput = (content: string) => {
		const outputItem: OutputItem = {
			type: 'output',
			content,
			timestamp: Date.now(),
		}
		setOutputs((prev) => [...prev, outputItem])
	}

	// Expose methods to parent component
	useImperativeHandle(ref, () => ({
		executeCode,
		clear,
		appendOutput,
	}))

	// Handle keyboard events
	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				// Shift+Enter: insert newline
				return
			} else {
				// Enter: execute
				e.preventDefault()
				if (!isExecuting && input.trim()) {
					executeCode(input)
					setInput('')
					setTimeout(() => inputRef.current?.focus(), 0)
				}
			}
		}
	}

	function getPrompt(type: string) {
		let prompt = ' '
		if (type === 'input') {
			prompt = '>'
		} else if (type === 'output') {
			prompt = '<'
		}
		return prompt
	}

	return (
		<div className={styles.console} style={{ height }}>
			{/* History and input area */}
			<div className={styles.historyArea} ref={outputRef}>
				{outputs.map((item) => (
					<div key={item.timestamp} className={`${styles.historyItem} ${styles[item.type]}`}>
						<span className={styles.prompt}>{getPrompt(item.type)}</span>
						<pre className={styles.content}>
							<HighlightSyntax code={item.content} />
						</pre>
					</div>
				))}
				{isExecuting && (
					<div className={styles.historyItem}>
						<span className={styles.prompt}>{'> '}</span>
						<span className={styles.executing}>Executing...</span>
					</div>
				)}
			</div>

			{/* Current input line */}
			<div className={styles.inputArea}>
				<span className={styles.prompt}>{'> '}</span>
				<textarea
					ref={inputRef}
					className={styles.input}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={isExecuting}
					rows={1}
					style={{
						height: Math.min(Math.max(20, input.split('\n').length * 20), 120),
					}}
				/>
			</div>
		</div>
	)
}

export default JSConsole
