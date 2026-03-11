import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
	browserSessionInfoSchema,
	clickElementParamsSchema,
	executeJavascriptParamsSchema,
	inputTextParamsSchema,
	openUrlParamsSchema,
	scrollHorizontallyParamsSchema,
	scrollParamsSchema,
	selectOptionParamsSchema,
	sessionTargetParamsSchema,
	switchToSessionParamsSchema,
} from '@page-agent/browser-bridge'
import { PageAgentCore } from '@page-agent/core'
import * as z from 'zod/v4'

import { BridgePageControllerAdapter, HttpBrowserBridge } from './PageAgentBridge'
import type { PageAgentMcpServerConfig } from './config'

const runPageAgentTaskInputSchema = z.object({
	sessionId: z.string().min(1),
	task: z.string().min(1),
	maxSteps: z.number().int().min(1).max(100).optional(),
	language: z.enum(['en-US', 'zh-CN']).optional(),
	experimentalScriptExecutionTool: z.boolean().optional(),
	llm: z
		.object({
			baseURL: z.string().optional(),
			apiKey: z.string().optional(),
			model: z.string().optional(),
			temperature: z.number().optional(),
			maxRetries: z.number().int().min(0).optional(),
		})
		.optional(),
})

interface ServerDependencies {
	bridge: HttpBrowserBridge
	config: PageAgentMcpServerConfig
	log: (message: string, details?: unknown) => void
}

export function createMcpServer({ bridge, config, log }: ServerDependencies): {
	server: McpServer
	transport: StdioServerTransport
} {
	const server = new McpServer(
		{ name: config.name, version: config.version },
		{
			instructions:
				'Use deterministic Page Agent browser tools first. Use page_agent_run_task only when a high-level browser workflow is needed.',
		}
	)
	const transport = new StdioServerTransport()

	server.registerTool(
		'page_agent_list_sessions',
		{
			title: 'List browser sessions',
			description:
				'List active browser tabs that the Page Agent extension can expose to the MCP server.',
			outputSchema: {
				sessions: browserSessionInfoSchema.array(),
			},
		},
		async () => {
			const sessions = await bridge.listSessions()
			return okResult(sessions, { sessions })
		}
	)

	server.registerTool(
		'page_agent_open_url',
		{
			title: 'Open a URL',
			description:
				'Open a URL in the browser extension runtime. Reuse the selected session tab unless newTab is true.',
			inputSchema: openUrlParamsSchema,
			outputSchema: {
				session: browserSessionInfoSchema,
			},
		},
		async (input: z.infer<typeof openUrlParamsSchema>) => {
			log('page_agent_open_url', input)
			const session = await bridge.openUrl(input)
			return okResult(session, { session })
		}
	)

	server.registerTool(
		'page_agent_switch_session',
		{
			title: 'Switch to a browser session',
			description: 'Activate a browser tab/session in the extension runtime.',
			inputSchema: switchToSessionParamsSchema,
			outputSchema: {
				session: browserSessionInfoSchema,
			},
		},
		async (input: z.infer<typeof switchToSessionParamsSchema>) => {
			log('page_agent_switch_session', input)
			const session = await bridge.switchToSession(input)
			return okResult(session, { session })
		}
	)

	server.registerTool(
		'page_agent_get_browser_state',
		{
			title: 'Get simplified browser state',
			description:
				'Return the current tab state using Page Agent’s token-efficient DOM summary format.',
			inputSchema: sessionTargetParamsSchema,
		},
		async (input: z.infer<typeof sessionTargetParamsSchema>) => {
			log('page_agent_get_browser_state', input)
			const state = await bridge.getBrowserState(input)
			return okResult(state, state)
		}
	)

	server.registerTool(
		'page_agent_update_tree',
		{
			title: 'Refresh DOM index',
			description:
				'Refresh the indexed DOM tree for a browser session and return the simplified HTML.',
			inputSchema: sessionTargetParamsSchema,
		},
		async (input: z.infer<typeof sessionTargetParamsSchema>) => {
			log('page_agent_update_tree', input)
			const content = await bridge.updateTree(input)
			return okResult(content, { content })
		}
	)

	server.registerTool(
		'page_agent_click_element',
		{
			title: 'Click an indexed element',
			description: 'Click an element in the current page by its Page Agent index.',
			inputSchema: clickElementParamsSchema,
		},
		async (input: z.infer<typeof clickElementParamsSchema>) => {
			log('page_agent_click_element', input)
			const result = await bridge.clickElement(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_input_text',
		{
			title: 'Type into an indexed element',
			description: 'Type text into an indexed interactive element.',
			inputSchema: inputTextParamsSchema,
		},
		async (input: z.infer<typeof inputTextParamsSchema>) => {
			log('page_agent_input_text', { ...input, text: `[${input.text.length} chars]` })
			const result = await bridge.inputText(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_select_option',
		{
			title: 'Select a dropdown option',
			description: 'Select an option by visible text in an indexed <select> element.',
			inputSchema: selectOptionParamsSchema,
		},
		async (input: z.infer<typeof selectOptionParamsSchema>) => {
			log('page_agent_select_option', input)
			const result = await bridge.selectOption(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_scroll',
		{
			title: 'Scroll vertically',
			description: 'Scroll the page or a scrollable indexed element vertically.',
			inputSchema: scrollParamsSchema,
		},
		async (input: z.infer<typeof scrollParamsSchema>) => {
			log('page_agent_scroll', input)
			const result = await bridge.scroll(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_scroll_horizontally',
		{
			title: 'Scroll horizontally',
			description: 'Scroll the page or an indexed element horizontally.',
			inputSchema: scrollHorizontallyParamsSchema,
		},
		async (input: z.infer<typeof scrollHorizontallyParamsSchema>) => {
			log('page_agent_scroll_horizontally', input)
			const result = await bridge.scrollHorizontally(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_execute_javascript',
		{
			title: 'Execute JavaScript',
			description:
				'Run custom JavaScript in the page context. Disabled by default and guarded by PAGE_AGENT_ALLOW_SCRIPT_EXECUTION.',
			inputSchema: executeJavascriptParamsSchema,
		},
		async (input: z.infer<typeof executeJavascriptParamsSchema>) => {
			log('page_agent_execute_javascript', { sessionId: input.sessionId, script: '[redacted]' })
			if (!config.allowScriptExecution) {
				throw new Error(
					'JavaScript execution is disabled. Set PAGE_AGENT_ALLOW_SCRIPT_EXECUTION=true to enable it.'
				)
			}
			const result = await bridge.executeJavascript(input)
			return okResult(result.message, result)
		}
	)

	server.registerTool(
		'page_agent_run_task',
		{
			title: 'Run a high-level Page Agent task',
			description:
				'Run the existing PageAgentCore loop against a browser session. This requires LLM configuration via environment variables or the llm input object.',
			inputSchema: runPageAgentTaskInputSchema,
		},
		async (input: z.infer<typeof runPageAgentTaskInputSchema>) => {
			log('page_agent_run_task', {
				sessionId: input.sessionId,
				task: input.task,
				maxSteps: input.maxSteps,
			})

			const llm = {
				...config.llmDefaults,
				...input.llm,
			}

			if (!llm.baseURL || !llm.apiKey || !llm.model) {
				throw new Error(
					'LLM configuration is incomplete. Set PAGE_AGENT_LLM_BASE_URL, PAGE_AGENT_LLM_API_KEY, and PAGE_AGENT_LLM_MODEL, or pass them in the llm argument.'
				)
			}

			const pageController = new BridgePageControllerAdapter(
				bridge,
				input.sessionId,
				config.allowScriptExecution && (input.experimentalScriptExecutionTool ?? false)
			)
			const agent = new PageAgentCore({
				baseURL: llm.baseURL,
				apiKey: llm.apiKey,
				model: llm.model,
				temperature: llm.temperature,
				maxRetries: llm.maxRetries,
				maxSteps: input.maxSteps ?? config.defaultMaxSteps,
				language: input.language,
				experimentalScriptExecutionTool:
					config.allowScriptExecution && (input.experimentalScriptExecutionTool ?? false),
				pageController: pageController as never,
			})

			try {
				const result = await agent.execute(input.task)
				return okResult(result.data, result as unknown as Record<string, unknown>)
			} finally {
				agent.dispose()
			}
		}
	)

	return { server, transport }
}

function okResult(text: string | object, structuredContent: Record<string, unknown>) {
	const renderedText = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
	return {
		content: [{ type: 'text' as const, text: renderedText }],
		structuredContent,
	}
}
