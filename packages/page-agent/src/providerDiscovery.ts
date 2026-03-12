export interface KnownModelProvider {
	id: string
	name: string
	baseURL: string
	apiKey: string
	isLocal?: boolean
}

export interface DiscoveredModelProvider extends KnownModelProvider {
	models: string[]
	defaultModel: string
}

export interface DiscoverModelProvidersOptions {
	timeoutMs?: number
	fetch?: typeof globalThis.fetch
	candidates?: KnownModelProvider[]
}

export const KNOWN_MODEL_PROVIDERS: KnownModelProvider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		baseURL: 'https://api.openai.com/v1',
		apiKey: '',
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		baseURL: 'https://api.anthropic.com/v1',
		apiKey: '',
	},
	{
		id: 'google',
		name: 'Google Gemini',
		baseURL: 'https://generativelanguage.googleapis.com/v1beta',
		apiKey: '',
	},
	{
		id: 'openrouter',
		name: 'OpenRouter',
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: '',
	},
	{
		id: 'fireworks',
		name: 'Fireworks AI',
		baseURL: 'https://api.fireworks.ai/inference/v1',
		apiKey: '',
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		baseURL: 'https://api.deepseek.com/v1',
		apiKey: '',
	},
	{
		id: 'xai',
		name: 'xAI',
		baseURL: 'https://api.x.ai/v1',
		apiKey: '',
	},
	{
		id: 'groq',
		name: 'Groq',
		baseURL: 'https://api.groq.com/openai/v1',
		apiKey: '',
	},
	{
		id: 'together',
		name: 'Together AI',
		baseURL: 'https://api.together.xyz/v1',
		apiKey: '',
	},
	{
		id: 'mistral',
		name: 'Mistral',
		baseURL: 'https://api.mistral.ai/v1',
		apiKey: '',
	},
	{
		id: 'azure',
		name: 'Azure OpenAI',
		baseURL: 'https://{resource}.openai.azure.com',
		apiKey: '',
	},
	{
		id: 'cloudflare',
		name: 'Cloudflare Workers AI',
		baseURL: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai',
		apiKey: '',
	},
	{
		id: 'vercel',
		name: 'Vercel AI Gateway',
		baseURL: 'https://api.vercel.ai/v1',
		apiKey: '',
	},
	{
		id: 'alibaba',
		name: 'Alibaba DashScope',
		baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		apiKey: '',
	},
	{
		id: 'ollama',
		name: 'Ollama',
		baseURL: 'http://127.0.0.1:11434/v1',
		apiKey: 'NA',
		isLocal: true,
	},
	{
		id: 'lmstudio',
		name: 'LM Studio',
		baseURL: 'http://127.0.0.1:1234/v1',
		apiKey: 'NA',
		isLocal: true,
	},
	{
		id: 'vllm',
		name: 'vLLM',
		baseURL: 'http://127.0.0.1:8000/v1',
		apiKey: 'NA',
		isLocal: true,
	},
]

const LOCAL_MODEL_PROVIDERS = KNOWN_MODEL_PROVIDERS.filter((provider) => provider.isLocal)

const MODEL_HINT_PRIORITY = [
	'qwen',
	'gpt',
	'claude',
	'gemini',
	'deepseek',
	'grok',
	'kimi',
	'glm',
	'llama',
	'mistral',
	'command',
]

function getModelsURL(baseURL: string): string {
	return `${baseURL.replace(/\/+$/, '')}/models`
}

function rankModel(modelId: string): number {
	const value = modelId.toLowerCase()
	const hintIndex = MODEL_HINT_PRIORITY.findIndex((hint) => value.includes(hint))
	return hintIndex === -1 ? MODEL_HINT_PRIORITY.length : hintIndex
}

function sortModels(modelIds: string[]): string[] {
	return [...new Set(modelIds)].sort((left, right) => {
		const rankDiff = rankModel(left) - rankModel(right)
		if (rankDiff !== 0) return rankDiff
		return left.localeCompare(right)
	})
}

async function fetchModels(
	provider: KnownModelProvider,
	timeoutMs: number,
	fetchImpl: typeof globalThis.fetch
): Promise<string[]> {
	const controller = new AbortController()
	const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetchImpl(getModelsURL(provider.baseURL), {
			signal: controller.signal,
			headers:
				provider.apiKey && provider.apiKey !== 'NA'
					? { Authorization: `Bearer ${provider.apiKey}` }
					: undefined,
		})

		if (!response.ok) return []

		const body = (await response.json()) as { data?: { id?: string | null }[] }
		const modelIds = body.data?.map((item) => item.id?.trim()).filter(Boolean) as
			| string[]
			| undefined
		return sortModels(modelIds ?? [])
	} catch {
		return []
	} finally {
		globalThis.clearTimeout(timeoutId)
	}
}

export async function discoverAvailableModelProviders(
	options: DiscoverModelProvidersOptions = {}
): Promise<DiscoveredModelProvider[]> {
	const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
	const timeoutMs = options.timeoutMs ?? 1500
	const candidates = options.candidates ?? LOCAL_MODEL_PROVIDERS

	const discoveredProviders = await Promise.all(
		candidates.map(async (provider) => {
			const models = await fetchModels(provider, timeoutMs, fetchImpl)
			if (!models.length) return null
			return {
				...provider,
				models,
				defaultModel: models[0],
			} satisfies DiscoveredModelProvider
		})
	)

	return discoveredProviders.filter(
		(provider): provider is DiscoveredModelProvider => provider !== null
	)
}

export function pickBestDetectedProvider(
	providers: DiscoveredModelProvider[]
): DiscoveredModelProvider | null {
	return providers[0] ?? null
}

export function detectProviderFromUrl(baseURL: string): KnownModelProvider | null {
	const normalizedURL = baseURL.toLowerCase()

	if (normalizedURL.includes('api.openai.com')) return KNOWN_MODEL_PROVIDERS[0]
	if (normalizedURL.includes('api.anthropic.com')) return KNOWN_MODEL_PROVIDERS[1]
	if (normalizedURL.includes('generativelanguage.googleapis.com')) return KNOWN_MODEL_PROVIDERS[2]
	if (normalizedURL.includes('openrouter.ai')) return KNOWN_MODEL_PROVIDERS[3]
	if (normalizedURL.includes('api.fireworks.ai')) return KNOWN_MODEL_PROVIDERS[4]
	if (normalizedURL.includes('api.deepseek.com')) return KNOWN_MODEL_PROVIDERS[5]
	if (normalizedURL.includes('api.x.ai')) return KNOWN_MODEL_PROVIDERS[6]
	if (normalizedURL.includes('api.groq.com')) return KNOWN_MODEL_PROVIDERS[7]
	if (normalizedURL.includes('api.together.xyz')) return KNOWN_MODEL_PROVIDERS[8]
	if (normalizedURL.includes('api.mistral.ai')) return KNOWN_MODEL_PROVIDERS[9]
	if (normalizedURL.includes('openai.azure.com')) return KNOWN_MODEL_PROVIDERS[10]
	if (normalizedURL.includes('api.cloudflare.com')) return KNOWN_MODEL_PROVIDERS[11]
	if (normalizedURL.includes('api.vercel.ai')) return KNOWN_MODEL_PROVIDERS[12]
	if (normalizedURL.includes('dashscope')) return KNOWN_MODEL_PROVIDERS[13]
	if (normalizedURL.includes('127.0.0.1:11434') || normalizedURL.includes('localhost:11434'))
		return KNOWN_MODEL_PROVIDERS[14]
	if (normalizedURL.includes('127.0.0.1:1234') || normalizedURL.includes('localhost:1234'))
		return KNOWN_MODEL_PROVIDERS[15]
	if (normalizedURL.includes('127.0.0.1:8000') || normalizedURL.includes('localhost:8000'))
		return KNOWN_MODEL_PROVIDERS[16]

	return null
}
