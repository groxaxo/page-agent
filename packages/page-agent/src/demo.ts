/**
 * IIFE demo entry - auto-initializes with built-in demo API for testing
 */
import { PageAgent, type PageAgentConfig } from './PageAgent'
import { discoverAvailableModelProviders, pickBestDetectedProvider } from './providerDiscovery'

// Clean up existing instances to prevent multiple injections from bookmarklet
if (window.pageAgent) {
	window.pageAgent.dispose()
}

// Mount to global window object
window.PageAgent = PageAgent

console.log('🚀 page-agent.js loaded!')

const DEMO_BASE_URL = 'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run'
const DEMO_API_KEY = 'NA'

async function applyAutoDetectedProvider(config: PageAgentConfig): Promise<void> {
	if (config.model && config.baseURL) return

	const detectedProvider = pickBestDetectedProvider(await discoverAvailableModelProviders())
	if (!detectedProvider) return

	config.model ||= detectedProvider.defaultModel
	config.baseURL ||= detectedProvider.baseURL
	config.apiKey ||= detectedProvider.apiKey

	console.log('🚀 page-agent.js autodetected local provider:', detectedProvider)
}

// in case document.x is not ready yet
setTimeout(async () => {
	const currentScript = document.currentScript as HTMLScriptElement | null
	let config: PageAgentConfig

	if (currentScript) {
		console.log('🚀 page-agent.js detected current script:', currentScript.src)
		const url = new URL(currentScript.src)
		const shouldAutoDetect = url.searchParams.get('autodetect') === '1'
		const model = url.searchParams.get('model') ?? import.meta.env.LLM_MODEL_NAME ?? ''
		const baseURL = url.searchParams.get('baseURL') ?? import.meta.env.LLM_BASE_URL ?? ''
		const apiKey = url.searchParams.get('apiKey') ?? import.meta.env.LLM_API_KEY ?? ''
		const language = (url.searchParams.get('lang') as 'zh-CN' | 'en-US') || 'zh-CN'
		config = { model, baseURL, apiKey, language }

		if (shouldAutoDetect && (!config.model || !config.baseURL)) {
			await applyAutoDetectedProvider(config)
		}
	} else {
		console.log('🚀 page-agent.js no current script detected, using default demo config')
		config = {
			model: import.meta.env.LLM_MODEL_NAME ?? '',
			baseURL: import.meta.env.LLM_BASE_URL ?? '',
			apiKey: import.meta.env.LLM_API_KEY ?? '',
		}

		if (!config.model || !config.baseURL) {
			await applyAutoDetectedProvider(config)
		}
	}

	config.baseURL ||= DEMO_BASE_URL
	config.apiKey ||= DEMO_API_KEY

	if (!config.model) {
		console.error(
			'🚀 page-agent.js could not find a model. Start Ollama, LM Studio, or vLLM locally, or pass ?model=your-model-id on the script URL.'
		)
		return
	}

	// Create agent
	window.pageAgent = new PageAgent(config)
	window.pageAgent.panel.show()

	console.log('🚀 page-agent.js initialized with config:', window.pageAgent.config)
})
