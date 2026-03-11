import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage, setupTabChangeEvents } from '@/agent/TabsController.background'
import { BrowserBridgeClient } from '@/mcp/BrowserBridgeClient'

type BackgroundWithBridge = typeof globalThis & {
	__PAGE_AGENT_MCP_BRIDGE__?: BrowserBridgeClient
}

function getBridgeClient(): BrowserBridgeClient {
	const background = globalThis as BackgroundWithBridge

	if (!background.__PAGE_AGENT_MCP_BRIDGE__) {
		background.__PAGE_AGENT_MCP_BRIDGE__ = new BrowserBridgeClient()
	}

	return background.__PAGE_AGENT_MCP_BRIDGE__
}

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	getBridgeClient().start()

	// tab change events

	setupTabChangeEvents()

	// generate user auth token

	chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
		if (result.PageAgentExtUserAuthToken) return

		const userAuthToken = crypto.randomUUID()
		chrome.storage.local.set({ PageAgentExtUserAuthToken: userAuthToken })
	})

	// message proxy

	chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
		if (message.type === 'TAB_CONTROL') {
			return handleTabControlMessage(message, sender, sendResponse)
		} else if (message.type === 'PAGE_CONTROL') {
			return handlePageControlMessage(message, sender, sendResponse)
		} else {
			sendResponse({ error: 'Unknown message type' })
			return
		}
	})

	// setup

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})
