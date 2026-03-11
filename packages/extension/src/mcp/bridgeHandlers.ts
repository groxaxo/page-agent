import type { BrowserBridgeCommand, BrowserBridgeRequest } from '@page-agent/browser-bridge'
import {
	type BrowserSessionInfo,
	createSessionId,
	getOriginFromUrl,
	getTabIdFromSessionId,
} from '@page-agent/browser-bridge'

import { isContentScriptAllowed } from '@/agent/contentScriptGuards'

const PREFIX = '[PageAgentBridge]'

function debug(...messages: unknown[]) {
	console.debug(`\x1b[90m${PREFIX}\x1b[0m`, ...messages)
}

export async function executeBridgeCommand(command: BrowserBridgeCommand): Promise<unknown> {
	debug('executeBridgeCommand', command.request.method)

	switch (command.request.method) {
		case 'list_sessions':
			return listSessions()
		case 'open_url':
			return openUrl(command.request)
		case 'switch_to_session':
			return switchToSession(command.request)
		case 'get_last_update_time':
			return sendPageControlMessage(command.request, 'get_last_update_time')
		case 'get_browser_state':
			return getBrowserState(command.request)
		case 'update_tree':
			return sendPageControlMessage(command.request, 'update_tree')
		case 'clean_up_highlights':
			return sendPageControlMessage(command.request, 'clean_up_highlights')
		case 'click_element':
			return sendPageControlMessage(command.request, 'click_element', [
				command.request.params.index,
			])
		case 'input_text':
			return sendPageControlMessage(command.request, 'input_text', [
				command.request.params.index,
				command.request.params.text,
			])
		case 'select_option':
			return sendPageControlMessage(command.request, 'select_option', [
				command.request.params.index,
				command.request.params.text,
			])
		case 'scroll':
			return sendPageControlMessage(command.request, 'scroll', [
				{
					down: command.request.params.down,
					numPages: command.request.params.numPages,
					pixels: command.request.params.pixels,
					index: command.request.params.index,
				},
			])
		case 'scroll_horizontally':
			return sendPageControlMessage(command.request, 'scroll_horizontally', [
				{
					right: command.request.params.right,
					pixels: command.request.params.pixels,
					index: command.request.params.index,
				},
			])
		case 'execute_javascript':
			return sendPageControlMessage(command.request, 'execute_javascript', [
				command.request.params.script,
			])
		default:
			throw new Error(`Unsupported bridge method: ${command.request.method}`)
	}
}

async function listSessions(): Promise<BrowserSessionInfo[]> {
	const tabs = await chrome.tabs.query({})
	return tabs
		.filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === 'number')
		.map((tab) => mapTabToSession(tab))
}

async function openUrl(
	request: Extract<BrowserBridgeRequest, { method: 'open_url' }>
): Promise<BrowserSessionInfo> {
	const { sessionId, url, newTab } = request.params
	let tab: chrome.tabs.Tab

	if (newTab || !sessionId) {
		tab = await chrome.tabs.create({ url, active: true })
	} else {
		const tabId = getTabIdFromSessionId(sessionId)
		tab = await chrome.tabs.update(tabId, { url, active: true })
	}

	if (tab.windowId != null) {
		await chrome.windows.update(tab.windowId, { focused: true })
	}

	return mapTabToSession(await ensureTab(tab.id))
}

async function switchToSession(
	request: Extract<BrowserBridgeRequest, { method: 'switch_to_session' }>
): Promise<BrowserSessionInfo> {
	const tabId = getTabIdFromSessionId(request.params.sessionId)
	const tab = await chrome.tabs.update(tabId, { active: true })

	if (tab.windowId != null) {
		await chrome.windows.update(tab.windowId, { focused: true })
	}

	return mapTabToSession(await ensureTab(tabId))
}

async function getBrowserState(
	request: Extract<BrowserBridgeRequest, { method: 'get_browser_state' }>
): Promise<unknown> {
	const tab = await ensureTab(getTabIdFromSessionId(request.params.sessionId))
	const url = tab.url || ''

	if (!isContentScriptAllowed(url)) {
		return {
			url,
			title: tab.title || '',
			header: '',
			content: '(empty page. either current page is not readable or not loaded yet.)',
			footer: '',
		}
	}

	return sendPageControlMessage(request, 'get_browser_state')
}

async function sendPageControlMessage(
	request: Exclude<
		BrowserBridgeRequest,
		{ method: 'list_sessions' | 'open_url' | 'switch_to_session' }
	>,
	action: string,
	payload?: unknown[]
): Promise<unknown> {
	const tabId = getTabIdFromSessionId(request.params.sessionId)
	const tab = await ensureTab(tabId)
	const url = tab.url || ''

	if (!isContentScriptAllowed(url)) {
		throw new Error(
			'Operation not allowed on this page. Open a standard web page session before using DOM tools.'
		)
	}

	return chrome.tabs.sendMessage(tabId, {
		type: 'PAGE_CONTROL',
		action,
		payload,
	})
}

async function ensureTab(tabId: number | undefined): Promise<chrome.tabs.Tab & { id: number }> {
	if (tabId == null) {
		throw new Error('Tab ID is required')
	}

	const tab = await chrome.tabs.get(tabId)
	if (tab.id == null) {
		throw new Error(`Tab ${tabId} is no longer available`)
	}

	return tab as chrome.tabs.Tab & { id: number }
}

function mapTabToSession(tab: chrome.tabs.Tab & { id: number }): BrowserSessionInfo {
	const url = tab.url || ''

	return {
		sessionId: createSessionId(tab.id),
		tabId: tab.id,
		url,
		title: tab.title || '',
		origin: getOriginFromUrl(url),
		lastSeenAt: Date.now(),
		capabilities: {
			canOpenUrl: true,
			canSwitchTabs: true,
			canUseExtension: isContentScriptAllowed(url),
			canUseCustomTools: false,
		},
	}
}
