import type {
	BrowserActionResult,
	BrowserBridge,
	BrowserBridgeRequest,
	BrowserSessionInfo,
	BrowserState,
} from '@page-agent/browser-bridge'
import {
	browserActionResultSchema,
	browserSessionInfoSchema,
	browserStateSchema,
} from '@page-agent/browser-bridge'

import { LocalBridgeServer } from './LocalBridgeServer'

export class HttpBrowserBridge implements BrowserBridge {
	private readonly bridgeServer: LocalBridgeServer

	constructor(bridgeServer: LocalBridgeServer) {
		this.bridgeServer = bridgeServer
	}

	async listSessions(): Promise<BrowserSessionInfo[]> {
		const result = await this.bridgeServer.dispatch({ method: 'list_sessions', params: {} })
		return browserSessionInfoSchema.array().parse(result)
	}

	async openUrl(
		params: Extract<BrowserBridgeRequest, { method: 'open_url' }>['params']
	): Promise<BrowserSessionInfo> {
		const result = await this.bridgeServer.dispatch(
			{ method: 'open_url', params },
			params.sessionId
		)
		return browserSessionInfoSchema.parse(result)
	}

	async switchToSession(
		params: Extract<BrowserBridgeRequest, { method: 'switch_to_session' }>['params']
	): Promise<BrowserSessionInfo> {
		const result = await this.bridgeServer.dispatch(
			{ method: 'switch_to_session', params },
			params.sessionId
		)
		return browserSessionInfoSchema.parse(result)
	}

	async getLastUpdateTime(
		params: Extract<BrowserBridgeRequest, { method: 'get_last_update_time' }>['params']
	): Promise<number> {
		const result = await this.bridgeServer.dispatch(
			{ method: 'get_last_update_time', params },
			params.sessionId
		)
		if (typeof result !== 'number') {
			throw new Error('Invalid bridge response for get_last_update_time')
		}
		return result
	}

	async getBrowserState(
		params: Extract<BrowserBridgeRequest, { method: 'get_browser_state' }>['params']
	): Promise<BrowserState> {
		const result = await this.bridgeServer.dispatch(
			{ method: 'get_browser_state', params },
			params.sessionId
		)
		return browserStateSchema.parse(result)
	}

	async updateTree(
		params: Extract<BrowserBridgeRequest, { method: 'update_tree' }>['params']
	): Promise<string> {
		const result = await this.bridgeServer.dispatch(
			{ method: 'update_tree', params },
			params.sessionId
		)
		if (typeof result !== 'string') {
			throw new Error('Invalid bridge response for update_tree')
		}
		return result
	}

	async cleanUpHighlights(
		params: Extract<BrowserBridgeRequest, { method: 'clean_up_highlights' }>['params']
	): Promise<void> {
		await this.bridgeServer.dispatch({ method: 'clean_up_highlights', params }, params.sessionId)
	}

	async clickElement(
		params: Extract<BrowserBridgeRequest, { method: 'click_element' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'click_element', params }, params.sessionId)
	}

	async inputText(
		params: Extract<BrowserBridgeRequest, { method: 'input_text' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'input_text', params }, params.sessionId)
	}

	async selectOption(
		params: Extract<BrowserBridgeRequest, { method: 'select_option' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'select_option', params }, params.sessionId)
	}

	async scroll(
		params: Extract<BrowserBridgeRequest, { method: 'scroll' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'scroll', params }, params.sessionId)
	}

	async scrollHorizontally(
		params: Extract<BrowserBridgeRequest, { method: 'scroll_horizontally' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'scroll_horizontally', params }, params.sessionId)
	}

	async executeJavascript(
		params: Extract<BrowserBridgeRequest, { method: 'execute_javascript' }>['params']
	): Promise<BrowserActionResult> {
		return this.parseActionResult({ method: 'execute_javascript', params }, params.sessionId)
	}

	private async parseActionResult(
		request: BrowserBridgeRequest,
		sessionId?: string
	): Promise<BrowserActionResult> {
		const result = await this.bridgeServer.dispatch(request, sessionId)
		return browserActionResultSchema.parse(result)
	}
}

export class BridgePageControllerAdapter {
	private readonly bridge: BrowserBridge
	private readonly sessionId: string
	private readonly allowScriptExecution: boolean

	constructor(bridge: BrowserBridge, sessionId: string, allowScriptExecution: boolean) {
		this.bridge = bridge
		this.sessionId = sessionId
		this.allowScriptExecution = allowScriptExecution
	}

	async getLastUpdateTime(): Promise<number> {
		return this.bridge.getLastUpdateTime({ sessionId: this.sessionId })
	}

	async getBrowserState(): Promise<BrowserState> {
		return this.bridge.getBrowserState({ sessionId: this.sessionId })
	}

	async updateTree(): Promise<string> {
		return this.bridge.updateTree({ sessionId: this.sessionId })
	}

	async cleanUpHighlights(): Promise<void> {
		return this.bridge.cleanUpHighlights({ sessionId: this.sessionId })
	}

	async clickElement(index: number): Promise<BrowserActionResult> {
		return this.bridge.clickElement({ sessionId: this.sessionId, index })
	}

	async inputText(index: number, text: string): Promise<BrowserActionResult> {
		return this.bridge.inputText({ sessionId: this.sessionId, index, text })
	}

	async selectOption(index: number, text: string): Promise<BrowserActionResult> {
		return this.bridge.selectOption({ sessionId: this.sessionId, index, text })
	}

	async scroll(options: {
		down: boolean
		numPages: number
		pixels?: number
		index?: number
	}): Promise<BrowserActionResult> {
		return this.bridge.scroll({ sessionId: this.sessionId, ...options })
	}

	async scrollHorizontally(options: {
		right: boolean
		pixels: number
		index?: number
	}): Promise<BrowserActionResult> {
		return this.bridge.scrollHorizontally({ sessionId: this.sessionId, ...options })
	}

	async executeJavascript(script: string): Promise<BrowserActionResult> {
		if (!this.allowScriptExecution) {
			return {
				success: false,
				message:
					'❌ JavaScript execution is disabled. Set PAGE_AGENT_ALLOW_SCRIPT_EXECUTION=true to enable it.',
			}
		}

		return this.bridge.executeJavascript({ sessionId: this.sessionId, script })
	}

	async showMask(): Promise<void> {}
	async hideMask(): Promise<void> {}
	dispose(): void {}
}
