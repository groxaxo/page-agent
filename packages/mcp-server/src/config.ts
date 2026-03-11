import {
	LOCAL_BRIDGE_DEFAULT_HOST,
	LOCAL_BRIDGE_DEFAULT_PORT,
	getLocalBridgeUrl,
} from '@page-agent/browser-bridge'

export interface PageAgentMcpServerConfig {
	name: string
	version: string
	bridgeHost: string
	bridgePort: number
	bridgeUrl: string
	bridgeToken?: string
	commandTimeoutMs: number
	defaultMaxSteps: number
	allowScriptExecution: boolean
	llmDefaults: {
		baseURL?: string
		apiKey?: string
		model?: string
		temperature?: number
		maxRetries?: number
	}
}

export function readServerConfigFromEnv(): PageAgentMcpServerConfig {
	const bridgeHost = process.env.PAGE_AGENT_BRIDGE_HOST || LOCAL_BRIDGE_DEFAULT_HOST
	const bridgePort = integerFromEnv('PAGE_AGENT_BRIDGE_PORT', LOCAL_BRIDGE_DEFAULT_PORT)
	const bridgeUrl =
		process.env.PAGE_AGENT_BRIDGE_URL ||
		getLocalBridgeUrl(bridgePort).replace(LOCAL_BRIDGE_DEFAULT_HOST, bridgeHost)

	return {
		name: process.env.PAGE_AGENT_MCP_SERVER_NAME || 'page-agent',
		version: process.env.npm_package_version || '1.5.5',
		bridgeHost,
		bridgePort: integerFromEnv('PAGE_AGENT_BRIDGE_PORT', LOCAL_BRIDGE_DEFAULT_PORT),
		bridgeUrl,
		bridgeToken: process.env.PAGE_AGENT_BRIDGE_TOKEN || undefined,
		commandTimeoutMs: integerFromEnv('PAGE_AGENT_BRIDGE_TIMEOUT_MS', 20_000),
		defaultMaxSteps: integerFromEnv('PAGE_AGENT_DEFAULT_MAX_STEPS', 20),
		allowScriptExecution: process.env.PAGE_AGENT_ALLOW_SCRIPT_EXECUTION === 'true',
		llmDefaults: {
			baseURL: process.env.PAGE_AGENT_LLM_BASE_URL || process.env.OPENAI_BASE_URL || undefined,
			apiKey: process.env.PAGE_AGENT_LLM_API_KEY || process.env.OPENAI_API_KEY || undefined,
			model: process.env.PAGE_AGENT_LLM_MODEL || process.env.OPENAI_MODEL || undefined,
			temperature: numberFromEnv('PAGE_AGENT_LLM_TEMPERATURE'),
			maxRetries: optionalIntegerFromEnv('PAGE_AGENT_LLM_MAX_RETRIES'),
		},
	}
}

function integerFromEnv(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw == null || raw === '') {
		return fallback
	}

	const parsed = Number.parseInt(raw, 10)
	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid integer environment variable ${name}: ${raw}`)
	}

	return parsed
}

function optionalIntegerFromEnv(name: string): number | undefined {
	const raw = process.env[name]
	if (raw == null || raw === '') {
		return undefined
	}

	const parsed = Number.parseInt(raw, 10)
	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid integer environment variable ${name}: ${raw}`)
	}

	return parsed
}

function numberFromEnv(name: string): number | undefined {
	const raw = process.env[name]
	if (raw == null || raw === '') {
		return undefined
	}

	const parsed = Number.parseFloat(raw)
	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid number environment variable ${name}: ${raw}`)
	}

	return parsed
}
