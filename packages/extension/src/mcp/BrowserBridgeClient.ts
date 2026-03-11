import {
	type BrowserBridgeCommandResult,
	type BrowserBridgePollResponse,
	LOCAL_BRIDGE_DEFAULT_PORT,
	browserBridgePollResponseSchema,
	getLocalBridgeUrl,
} from '@page-agent/browser-bridge'

import { executeBridgeCommand } from './bridgeHandlers'

declare const __EXT_VERSION__: string

const PREFIX = '[PageAgentBridge.Client]'
const POLL_WAIT_MS = 25_000
const RETRY_DELAY_MS = 3_000

interface BridgeSettings {
	serverUrl: string
	token?: string
}

export class BrowserBridgeClient {
	private running = false
	private retryTimer: ReturnType<typeof setTimeout> | null = null

	start(): void {
		if (this.running) return
		this.running = true
		void this.loop()
	}

	stop(): void {
		this.running = false
		if (this.retryTimer != null) {
			clearTimeout(this.retryTimer)
			this.retryTimer = null
		}
	}

	private async loop(): Promise<void> {
		if (!this.running) {
			return
		}

		try {
			const settings = await readBridgeSettings()
			const response = await this.poll(settings)

			if (response.command) {
				await this.handleCommand(settings, response.command)
			}

			this.retryTimer = globalThis.setTimeout(() => {
				void this.loop()
			}, 0)
		} catch (error) {
			console.debug(PREFIX, error)
			this.retryTimer = globalThis.setTimeout(() => {
				void this.loop()
			}, RETRY_DELAY_MS)
		}
	}

	private async poll(settings: BridgeSettings): Promise<BrowserBridgePollResponse> {
		const response = await fetch(`${settings.serverUrl}/bridge/poll`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				runtimeId: chrome.runtime.id,
				token: settings.token,
				waitMs: POLL_WAIT_MS,
				extensionVersion: __EXT_VERSION__,
			}),
		})

		if (!response.ok) {
			throw new Error(`Bridge poll failed with status ${response.status}`)
		}

		return browserBridgePollResponseSchema.parse(await response.json())
	}

	private async handleCommand(
		settings: BridgeSettings,
		command: BrowserBridgePollResponse['command']
	): Promise<void> {
		if (!command) {
			return
		}

		let payload: BrowserBridgeCommandResult

		try {
			const result = await executeBridgeCommand(command)
			payload = {
				commandId: command.commandId,
				ok: true,
				result,
			}
		} catch (error) {
			payload = {
				commandId: command.commandId,
				ok: false,
				error: {
					code: 'BRIDGE_COMMAND_FAILED',
					message: error instanceof Error ? error.message : String(error),
				},
			}
		}

		const response = await fetch(`${settings.serverUrl}/bridge/respond`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				runtimeId: chrome.runtime.id,
				token: settings.token,
				response: payload,
			}),
		})

		if (!response.ok) {
			throw new Error(`Bridge respond failed with status ${response.status}`)
		}
	}
}

async function readBridgeSettings(): Promise<BridgeSettings> {
	const result = await chrome.storage.local.get([
		'pageAgentMcpBridgeUrl',
		'pageAgentMcpBridgeToken',
	])
	const serverUrl =
		typeof result.pageAgentMcpBridgeUrl === 'string' && result.pageAgentMcpBridgeUrl
			? result.pageAgentMcpBridgeUrl
			: getLocalBridgeUrl(LOCAL_BRIDGE_DEFAULT_PORT)

	return {
		serverUrl,
		token:
			typeof result.pageAgentMcpBridgeToken === 'string' && result.pageAgentMcpBridgeToken
				? result.pageAgentMcpBridgeToken
				: undefined,
	}
}
