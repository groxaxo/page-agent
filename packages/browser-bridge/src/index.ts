import * as z from 'zod/v4'

export const LOCAL_BRIDGE_DEFAULT_HOST = '127.0.0.1'
export const LOCAL_BRIDGE_DEFAULT_PORT = 37173
export const LOCAL_BRIDGE_DEFAULT_URL = `http://${LOCAL_BRIDGE_DEFAULT_HOST}:${LOCAL_BRIDGE_DEFAULT_PORT}`

export const browserSessionCapabilitiesSchema = z.object({
	canOpenUrl: z.boolean(),
	canSwitchTabs: z.boolean(),
	canUseExtension: z.boolean(),
	canUseCustomTools: z.boolean(),
})

export const browserSessionInfoSchema = z.object({
	sessionId: z.string().min(1),
	tabId: z.number().int().optional(),
	url: z.string(),
	title: z.string(),
	origin: z.string(),
	lastSeenAt: z.number().int(),
	capabilities: browserSessionCapabilitiesSchema,
})

export type BrowserSessionInfo = z.infer<typeof browserSessionInfoSchema>

export const browserActionResultSchema = z.object({
	success: z.boolean(),
	message: z.string(),
})

export type BrowserActionResult = z.infer<typeof browserActionResultSchema>

export const browserStateSchema = z.object({
	url: z.string(),
	title: z.string(),
	header: z.string(),
	content: z.string(),
	footer: z.string(),
})

export type BrowserState = z.infer<typeof browserStateSchema>

export const browserBridgeMethodSchema = z.enum([
	'list_sessions',
	'open_url',
	'switch_to_session',
	'get_last_update_time',
	'get_browser_state',
	'update_tree',
	'clean_up_highlights',
	'click_element',
	'input_text',
	'select_option',
	'scroll',
	'scroll_horizontally',
	'execute_javascript',
])

export type BrowserBridgeMethod = z.infer<typeof browserBridgeMethodSchema>

export const listSessionsParamsSchema = z.object({})

export const openUrlParamsSchema = z.object({
	sessionId: z.string().optional(),
	url: z.url(),
	newTab: z.boolean().default(false),
})

export const switchToSessionParamsSchema = z.object({
	sessionId: z.string().min(1),
})

export const getLastUpdateTimeParamsSchema = z.object({
	sessionId: z.string().min(1),
})

export const sessionTargetParamsSchema = z.object({
	sessionId: z.string().min(1),
})

export const clickElementParamsSchema = z.object({
	sessionId: z.string().min(1),
	index: z.number().int().min(0),
})

export const inputTextParamsSchema = z.object({
	sessionId: z.string().min(1),
	index: z.number().int().min(0),
	text: z.string(),
})

export const selectOptionParamsSchema = z.object({
	sessionId: z.string().min(1),
	index: z.number().int().min(0),
	text: z.string(),
})

export const scrollParamsSchema = z.object({
	sessionId: z.string().min(1),
	down: z.boolean().default(true),
	numPages: z.number().min(0).max(10),
	pixels: z.number().int().min(0).optional(),
	index: z.number().int().min(0).optional(),
})

export const scrollHorizontallyParamsSchema = z.object({
	sessionId: z.string().min(1),
	right: z.boolean().default(true),
	pixels: z.number().int().min(0),
	index: z.number().int().min(0).optional(),
})

export const executeJavascriptParamsSchema = z.object({
	sessionId: z.string().min(1),
	script: z.string().min(1),
})

export const browserBridgeRequestSchema = z.discriminatedUnion('method', [
	z.object({
		method: z.literal('list_sessions'),
		params: listSessionsParamsSchema.default({}),
	}),
	z.object({
		method: z.literal('open_url'),
		params: openUrlParamsSchema,
	}),
	z.object({
		method: z.literal('switch_to_session'),
		params: switchToSessionParamsSchema,
	}),
	z.object({
		method: z.literal('get_last_update_time'),
		params: getLastUpdateTimeParamsSchema,
	}),
	z.object({
		method: z.literal('get_browser_state'),
		params: sessionTargetParamsSchema,
	}),
	z.object({
		method: z.literal('update_tree'),
		params: sessionTargetParamsSchema,
	}),
	z.object({
		method: z.literal('clean_up_highlights'),
		params: sessionTargetParamsSchema,
	}),
	z.object({
		method: z.literal('click_element'),
		params: clickElementParamsSchema,
	}),
	z.object({
		method: z.literal('input_text'),
		params: inputTextParamsSchema,
	}),
	z.object({
		method: z.literal('select_option'),
		params: selectOptionParamsSchema,
	}),
	z.object({
		method: z.literal('scroll'),
		params: scrollParamsSchema,
	}),
	z.object({
		method: z.literal('scroll_horizontally'),
		params: scrollHorizontallyParamsSchema,
	}),
	z.object({
		method: z.literal('execute_javascript'),
		params: executeJavascriptParamsSchema,
	}),
])

export type BrowserBridgeRequest = z.infer<typeof browserBridgeRequestSchema>

export const browserBridgeCommandSchema = z.object({
	commandId: z.string().min(1),
	request: browserBridgeRequestSchema,
})

export type BrowserBridgeCommand = z.infer<typeof browserBridgeCommandSchema>

export const browserBridgePollRequestSchema = z.object({
	runtimeId: z.string().min(1),
	token: z.string().optional(),
	waitMs: z.number().int().min(0).max(30_000).default(25_000),
	extensionVersion: z.string().optional(),
})

export type BrowserBridgePollRequest = z.infer<typeof browserBridgePollRequestSchema>

export const browserBridgePollResponseSchema = z.object({
	command: browserBridgeCommandSchema.nullable(),
})

export type BrowserBridgePollResponse = z.infer<typeof browserBridgePollResponseSchema>

export const browserBridgeCommandResultSchema = z.object({
	commandId: z.string().min(1),
	ok: z.boolean(),
	result: z.unknown().optional(),
	error: z
		.object({
			code: z.string().default('BRIDGE_ERROR'),
			message: z.string(),
			details: z.unknown().optional(),
		})
		.optional(),
})

export type BrowserBridgeCommandResult = z.infer<typeof browserBridgeCommandResultSchema>

export const browserBridgeRespondRequestSchema = z.object({
	runtimeId: z.string().min(1),
	token: z.string().optional(),
	response: browserBridgeCommandResultSchema,
})

export type BrowserBridgeRespondRequest = z.infer<typeof browserBridgeRespondRequestSchema>

export interface BrowserBridge {
	listSessions(): Promise<BrowserSessionInfo[]>
	openUrl(params: z.infer<typeof openUrlParamsSchema>): Promise<BrowserSessionInfo>
	switchToSession(params: z.infer<typeof switchToSessionParamsSchema>): Promise<BrowserSessionInfo>
	getLastUpdateTime(params: z.infer<typeof getLastUpdateTimeParamsSchema>): Promise<number>
	getBrowserState(params: z.infer<typeof sessionTargetParamsSchema>): Promise<BrowserState>
	updateTree(params: z.infer<typeof sessionTargetParamsSchema>): Promise<string>
	cleanUpHighlights(params: z.infer<typeof sessionTargetParamsSchema>): Promise<void>
	clickElement(params: z.infer<typeof clickElementParamsSchema>): Promise<BrowserActionResult>
	inputText(params: z.infer<typeof inputTextParamsSchema>): Promise<BrowserActionResult>
	selectOption(params: z.infer<typeof selectOptionParamsSchema>): Promise<BrowserActionResult>
	scroll(params: z.infer<typeof scrollParamsSchema>): Promise<BrowserActionResult>
	scrollHorizontally(
		params: z.infer<typeof scrollHorizontallyParamsSchema>
	): Promise<BrowserActionResult>
	executeJavascript(
		params: z.infer<typeof executeJavascriptParamsSchema>
	): Promise<BrowserActionResult>
}

export function getOriginFromUrl(url: string): string {
	try {
		return new URL(url).origin
	} catch {
		return ''
	}
}

export function createSessionId(tabId: number): string {
	return `tab:${tabId}`
}

export function getTabIdFromSessionId(sessionId: string): number {
	if (!sessionId.startsWith('tab:')) {
		throw new Error(`Unsupported session ID: ${sessionId}`)
	}

	const tabId = Number(sessionId.slice(4))
	if (!Number.isInteger(tabId)) {
		throw new Error(`Invalid session ID: ${sessionId}`)
	}

	return tabId
}

export function getLocalBridgeUrl(port: number = LOCAL_BRIDGE_DEFAULT_PORT): string {
	return `http://${LOCAL_BRIDGE_DEFAULT_HOST}:${port}`
}
