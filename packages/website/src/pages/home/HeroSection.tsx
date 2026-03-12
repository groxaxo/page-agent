/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import type { DiscoveredModelProvider, PageAgent as PageAgentType } from 'page-agent'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'wouter'

import CodeEditor from '../../components/CodeEditor'
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text'
import { AuroraText } from '../../components/ui/aurora-text'
import { Highlighter } from '../../components/ui/highlighter'
import { NeonGradientCard } from '../../components/ui/neon-gradient-card'
import { Particles } from '../../components/ui/particles'
import { SparklesText } from '../../components/ui/sparkles-text'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL, DEMO_API_KEY, DEMO_BASE_URL } from '../../constants'
import { useLanguage } from '../../i18n/context'

const FORK_REPO_URL = 'https://github.com/groxaxo/page-agent'
const ORIGINAL_REPO_URL = 'https://github.com/alibaba/page-agent'
const TERMS_URL =
	'https://github.com/groxaxo/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use'

let pageAgentModule: Promise<typeof import('page-agent')> | null = null

function getDefaultDemoModel(params: URLSearchParams) {
	return (
		params.get('model') ||
		(import.meta.env.DEV && import.meta.env.LLM_MODEL_NAME ? import.meta.env.LLM_MODEL_NAME : '')
	)
}

function getInjection({
	model,
	useCN,
	baseURL,
	apiKey,
	autoDetect,
}: {
	model?: string
	useCN?: boolean
	baseURL?: string
	apiKey?: string
	autoDetect?: boolean
}) {
	const cdn = useCN ? CDN_DEMO_CN_URL : CDN_DEMO_URL
	const params = new URLSearchParams()

	if (apiKey) params.set('apiKey', apiKey)
	if (baseURL) params.set('baseURL', baseURL)
	if (model) params.set('model', model)
	if (autoDetect) params.set('autodetect', '1')

	const injection = encodeURI(
		`javascript:(function(){var s=document.createElement('script');s.src=\`${cdn}?${params.toString()}&t=\${Math.random()}\`;s.setAttribute('crossorigin', true);s.type="text/javascript";s.onload=()=>console.log('PageAgent script loaded!');document.body.appendChild(s);})();`
	)

	return `
<a
href=${injection}
class="inline-flex items-center text-xs px-3 py-2 bg-blue-500 text-white font-medium rounded-lg hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-move border-2 border-dashed border-green-300"
draggable="true"
onclick="return false;"
title="Drag me to your bookmarks bar!"
>
✨PageAgent
</a>
`
}

export default function HeroSection() {
	const { language, isZh } = useLanguage()

	const defaultTask = isZh
		? '从导航栏中进入文档页，打开"快速开始"相关的文档，帮我总结成 markdown'
		: 'Goto docs in navigation bar, find Quick-Start section, and summarize in markdown'

	const [params] = useSearchParams()
	const [task, setTask] = useState(() => defaultTask)
	const [demoModel, setDemoModel] = useState(() => getDefaultDemoModel(params))
	const [selectedProviderBaseURL, setSelectedProviderBaseURL] = useState('')
	const [detectedProviders, setDetectedProviders] = useState<DiscoveredModelProvider[]>([])
	const [discoveryState, setDiscoveryState] = useState<
		'idle' | 'scanning' | 'ready' | 'empty' | 'error'
	>('idle')
	const [discoveryError, setDiscoveryError] = useState('')

	useEffect(() => {
		setTask(defaultTask)
	}, [defaultTask])

	useEffect(() => {
		setDemoModel(getDefaultDemoModel(params))
	}, [params])

	const shouldOpenInstaller = params.has('try_other') || params.has('install')

	const [activeTab, setActiveTab] = useState<'try' | 'install'>(
		shouldOpenInstaller ? 'install' : 'try'
	)
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>('international')

	useEffect(() => {
		setActiveTab(shouldOpenInstaller ? 'install' : 'try')
	}, [shouldOpenInstaller])

	const [ready, setReady] = useState(false)

	const runProviderDiscovery = async () => {
		if (!pageAgentModule) return

		setDiscoveryState('scanning')
		setDiscoveryError('')

		try {
			const module = await pageAgentModule
			const providers = await module.discoverAvailableModelProviders({ timeoutMs: 1200 })
			setDetectedProviders(providers)

			const preferredProvider = module.pickBestDetectedProvider(providers)
			if (preferredProvider) {
				setSelectedProviderBaseURL((currentBaseURL) => currentBaseURL || preferredProvider.baseURL)
				setDemoModel(
					(currentModel: string) => currentModel.trim() || preferredProvider.defaultModel
				)
				setDiscoveryState('ready')
				return
			}

			setDiscoveryState('empty')
		} catch (error) {
			setDiscoveryState('error')
			setDiscoveryError(
				error instanceof Error ? error.message : 'Failed to scan local model providers.'
			)
		}
	}

	useEffect(() => {
		let cancelled = false

		pageAgentModule ??= import('page-agent')
		pageAgentModule
			.then(async () => {
				if (cancelled) return
				setReady(true)
				await runProviderDiscovery()
			})
			.catch((error) => {
				if (cancelled) return
				setDiscoveryState('error')
				setDiscoveryError(error instanceof Error ? error.message : 'Failed to load page-agent.')
			})

		return () => {
			cancelled = true
		}
	}, [])

	const selectedProvider = useMemo(
		() =>
			detectedProviders.find((provider) => provider.baseURL === selectedProviderBaseURL) ?? null,
		[detectedProviders, selectedProviderBaseURL]
	)

	useEffect(() => {
		if (!selectedProvider) return
		if (selectedProvider.models.includes(demoModel.trim())) return
		setDemoModel(selectedProvider.defaultModel)
	}, [demoModel, selectedProvider])

	const matchedProvider =
		selectedProvider ??
		detectedProviders.find((provider) => provider.models.includes(demoModel.trim())) ??
		null

	const installerSnippet = `npm install page-agent

import { PageAgent, discoverAvailableModelProviders, pickBestDetectedProvider } from 'page-agent'

const detected = pickBestDetectedProvider(await discoverAvailableModelProviders())
if (!detected) throw new Error('${isZh ? '请先启动 Ollama、LM Studio 或 vLLM。' : 'Start Ollama, LM Studio, or vLLM first.'}')

const agent = new PageAgent({
  model: detected.defaultModel,
  baseURL: detected.baseURL,
  apiKey: detected.apiKey,
  language: '${language}'
})

agent.panel.show()`

	const handleExecute = async () => {
		if (!task.trim() || !demoModel.trim() || !ready || !pageAgentModule) return

		const { PageAgent } = await pageAgentModule
		const win = window as any
		const selectedModel = demoModel.trim()
		const selectedBaseURL =
			matchedProvider?.baseURL ?? import.meta.env.LLM_BASE_URL ?? DEMO_BASE_URL
		const selectedApiKey = matchedProvider?.apiKey ?? import.meta.env.LLM_API_KEY ?? DEMO_API_KEY

		if (
			!win.pageAgent ||
			win.pageAgent.disposed ||
			win.pageAgent.config?.model !== selectedModel ||
			win.pageAgent.config?.baseURL !== selectedBaseURL ||
			win.pageAgent.config?.apiKey !== selectedApiKey ||
			win.pageAgent.config?.language !== language
		) {
			win.pageAgent?.dispose?.()
			win.pageAgent = new (PageAgent as typeof PageAgentType)({
				interactiveBlacklist: [document.getElementById('root')!],
				language: language,

				instructions: {
					system: 'You are a helpful assistant on PageAgent website.',
					getPageInstructions: (url: string) => {
						const hint = url.includes('page-agent') ? 'This is PageAgent demo page.' : undefined
						console.log('[instructions] getPageInstructions:', url, '->', hint)
						return hint
					},
				},

				model: selectedModel,
				baseURL: selectedBaseURL,
				apiKey: selectedApiKey,
			})
		}

		const result = await win.pageAgent.execute(task)
		console.log(result)
	}

	const installerBookmarklet = selectedProvider
		? getInjection({
				model: demoModel.trim() || selectedProvider.defaultModel,
				useCN: cdnSource === 'china',
				baseURL: selectedProvider.baseURL,
				apiKey: selectedProvider.apiKey,
			})
		: getInjection({
				model: demoModel.trim() || undefined,
				useCN: cdnSource === 'china',
				autoDetect: true,
			})

	return (
		<section
			className="relative px-6 pt-24 py-20 pb-18 lg:py-22 lg:pt-28 overflow-hidden"
			aria-labelledby="hero-heading"
		>
			<div className="max-w-7xl mx-auto text-center">
				<div className="absolute inset-0 opacity-30" aria-hidden="true">
					<div className="absolute inset-0 bg-linear-to-r from-blue-400/20 to-purple-400/20 rounded-3xl transform rotate-1"></div>
					<div className="absolute inset-0 bg-linear-to-l from-purple-400/20 to-blue-400/20 rounded-3xl transform -rotate-1"></div>
				</div>
				<Particles
					className="absolute inset-0"
					quantity={80}
					staticity={30}
					ease={80}
					color="#6366f1"
				/>

				<div className="relative z-10">
					<div className="inline-flex items-center px-4 py-2 mb-8 text-sm font-medium bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
						<span
							className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"
							aria-hidden="true"
						></span>
						<AnimatedGradientText colorFrom="#3b82f6" colorTo="#8b5cf6">
							AI Agent In Your Webpage
						</AnimatedGradientText>
					</div>

					<div className="max-w-5xl mx-auto mb-10 rounded-3xl border border-fuchsia-400/30 bg-black/55 p-1 shadow-[0_0_80px_rgba(168,85,247,0.25)] backdrop-blur-xl">
						<div className="rounded-[calc(1.5rem-1px)] bg-linear-to-r from-fuchsia-500/10 via-cyan-500/10 to-blue-500/10 px-6 py-5 text-left">
							<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<SparklesText className="text-lg sm:text-2xl" sparklesCount={8}>
										{isZh
											? 'Original Fork · 致敬原作者'
											: 'Original Fork · Thanks to the original creator'}
									</SparklesText>
									<p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-200">
										{isZh ? (
											<>
												这里展示的是{' '}
												<span className="font-semibold text-white">groxaxo/page-agent</span>
												的原创分叉版本，感谢 Simon 与原始{' '}
												<a
													href={ORIGINAL_REPO_URL}
													target="_blank"
													rel="noopener noreferrer"
													className="underline decoration-fuchsia-300 underline-offset-4"
												>
													Alibaba PageAgent 项目
												</a>
												的启发。本分叉继续沿着本地模型自动发现、安装体验和页面内 AI 代理方向演进。
											</>
										) : (
											<>
												This site documents{' '}
												<span className="font-semibold text-white">groxaxo/page-agent</span>, an
												original fork inspired by the work of Simon and the original{' '}
												<a
													href={ORIGINAL_REPO_URL}
													target="_blank"
													rel="noopener noreferrer"
													className="underline decoration-fuchsia-300 underline-offset-4"
												>
													Alibaba PageAgent project
												</a>
												. This fork keeps that lineage visible while adding its own installer,
												autodetection, and frontpage experience.
											</>
										)}
									</p>
								</div>
								<a
									href={FORK_REPO_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
								>
									{isZh ? '查看 Fork' : 'View the Fork'}
								</a>
							</div>
						</div>
					</div>

					<h1
						id="hero-heading"
						className="text-5xl lg:text-7xl font-bold mb-14 mt-8 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1"
					>
						{isZh ? (
							<>
								<span className="text-6xl lg:text-7xl">你网站里的 AI 操作员</span>
								<span className="block text-xl lg:text-2xl mt-5 font-medium bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
									The AI Operator Living in Your Web Page
								</span>
							</>
						) : (
							<>
								The AI Operator
								<br />
								Living in Your Web Page
							</>
						)}
					</h1>

					<p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
						<Highlighter action="underline" color="#8b5cf6" strokeWidth={2}>
							<span className="bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-bold">
								{isZh ? '🪄一行代码' : '🪄One line of code'}
							</span>
						</Highlighter>
						{isZh
							? '，让你的网站变身 AI 原生应用。'
							: ', turns your website into an AI-native app.'}
						<br />
						{isZh
							? '用户/答疑机器人给出文字指示，AI 帮你操作页面。现在还能自动扫描本机的 Ollama、LM Studio 与 vLLM 模型。'
							: 'Users give natural language commands, AI handles the rest. Now it can also scan your machine for Ollama, LM Studio, and vLLM models automatically.'}
					</p>

					<div className="mb-12">
						<div className="max-w-5xl mx-auto">
							<NeonGradientCard
								borderSize={2}
								borderRadius={20}
								neonColors={{ firstColor: '#ff00aa', secondColor: '#00FFF1' }}
							>
								<div className="flex border-b border-gray-200 dark:border-gray-700">
									<button
										onClick={() => setActiveTab('try')}
										className={`cursor-pointer flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tl-2xl ${
											activeTab === 'try'
												? 'bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
												: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
										}`}
									>
										{isZh ? '🚀 立即尝试' : '🚀 Try It Now'}
									</button>
									<button
										onClick={() => setActiveTab('install')}
										className={`cursor-pointer flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tr-2xl ${
											activeTab === 'install'
												? 'bg-linear-to-r from-fuchsia-50 to-cyan-50 dark:from-fuchsia-900/30 dark:to-cyan-900/30 text-fuchsia-700 dark:text-fuchsia-300 border-b-2 border-fuchsia-500'
												: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
										}`}
									>
										{isZh ? '🌈 Psychedelic Installer' : '🌈 Psychedelic Installer'}
									</button>
								</div>

								<div className="p-4">
									{activeTab === 'try' && (
										<div className="space-y-4">
											<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
												<div className="space-y-4">
													<div className="relative">
														<input
															value={demoModel}
															onChange={(e) => setDemoModel(e.target.value)}
															placeholder={
																isZh
																	? '输入任意兼容 OpenAI 的模型名称，例如 qwen3:14b'
																	: 'Enter any OpenAI-compatible model, e.g. qwen3:14b'
															}
															className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
															data-page-agent-not-interactive
														/>
													</div>
													<div className="relative">
														<input
															value={task}
															onChange={(e) => setTask(e.target.value)}
															placeholder={
																isZh
																	? '输入您想要 AI 执行的任务...'
																	: 'Describe what you want AI to do...'
															}
															className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
															data-page-agent-not-interactive
														/>
														<button
															onClick={handleExecute}
															disabled={!ready || !demoModel.trim()}
															className="absolute right-2 top-2 px-5 py-1.5 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
															data-page-agent-not-interactive
														>
															{ready ? (
																isZh ? (
																	'执行'
																) : (
																	'Run'
																)
															) : (
																<span className="animate-pulse">
																	{isZh ? '准备中...' : 'Preparing...'}
																</span>
															)}
														</button>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400 text-left">
														{matchedProvider
															? isZh
																? `已自动锁定本地提供方：${matchedProvider.name} · ${matchedProvider.baseURL}`
																: `Autodetected local provider: ${matchedProvider.name} · ${matchedProvider.baseURL}`
															: isZh
																? '未匹配到本地模型时，将回退到免费测试接口。'
																: 'If no local model matches, this falls back to the free testing endpoint.'}
													</p>
												</div>
												<div className="rounded-2xl border border-fuchsia-200/60 bg-linear-to-br from-fuchsia-500/10 via-blue-500/10 to-cyan-500/10 p-5 text-left">
													<AuroraText className="text-xl font-semibold">
														{isZh ? '本地模型雷达' : 'Local model radar'}
													</AuroraText>
													<p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
														{isZh
															? '首页会自动扫描你电脑上的 Ollama、LM Studio 与 vLLM，并优先用发现到的模型直接运行。'
															: 'The frontpage now scans your machine for Ollama, LM Studio, and vLLM, then prefers the first detected model automatically.'}
													</p>
													<div className="mt-4 flex flex-wrap gap-2">
														{detectedProviders.length ? (
															detectedProviders.map((provider) => (
																<span
																	key={provider.baseURL}
																	className="rounded-full border border-white/30 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
																>
																	{provider.name}: {provider.defaultModel}
																</span>
															))
														) : (
															<span className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
																{discoveryState === 'scanning'
																	? isZh
																		? '扫描中...'
																		: 'Scanning...'
																	: isZh
																		? '尚未发现本地提供方'
																		: 'No local providers found yet'}
															</span>
														)}
													</div>
												</div>
											</div>
											<p className="text-xs text-gray-500 dark:text-gray-400 text-left">
												{isZh ? (
													<>
														使用免费测试 LLM API，可填写任意模型名称。点击执行即表示您同意
														<a
															href={TERMS_URL}
															target="_blank"
															rel="noopener noreferrer"
															className="underline"
														>
															使用条款
														</a>
													</>
												) : (
													<>
														Powered by the free testing LLM API when no local model is selected. By
														clicking Run you agree to the{' '}
														<a
															href={TERMS_URL}
															target="_blank"
															rel="noopener noreferrer"
															className="underline"
														>
															Terms of Use
														</a>
													</>
												)}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 text-left">
												{isZh
													? '项目本身不包含遥测、分析或跟踪代码。'
													: 'The project itself contains no telemetry, analytics, or tracking code.'}
											</p>
										</div>
									)}

									{activeTab === 'install' && (
										<div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
											<div className="space-y-4 text-left">
												<div className="rounded-2xl border border-fuchsia-300/40 bg-linear-to-br from-fuchsia-500/10 via-slate-950/30 to-cyan-500/10 p-5 shadow-[0_0_60px_rgba(217,70,239,0.18)]">
													<AuroraText className="text-2xl font-semibold">
														{isZh ? 'Psychedelic Installer' : 'Psychedelic Installer'}
													</AuroraText>
													<p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
														{isZh
															? '受 groxaxo/opencode-local-setup 的提供方逻辑启发，这个安装器会先扫描你电脑上的本地推理端点，再生成对应的安装与书签脚本。'
															: 'Inspired by the provider logic from groxaxo/opencode-local-setup, this installer scans the local runtimes on your machine first, then generates install snippets and bookmarklets around what it finds.'}
													</p>
													<div className="mt-4 flex flex-wrap items-center gap-3">
														<button
															onClick={() => void runProviderDiscovery()}
															className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-fuchsia-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
														>
															{discoveryState === 'scanning'
																? isZh
																	? '扫描中...'
																	: 'Scanning...'
																: isZh
																	? '重新扫描本地模型'
																	: 'Rescan local models'}
														</button>
														<span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
															{discoveryState === 'ready'
																? isZh
																	? `已发现 ${detectedProviders.length} 个本地提供方`
																	: `${detectedProviders.length} local providers detected`
																: discoveryState === 'error'
																	? isZh
																		? '扫描失败'
																		: 'Scan failed'
																	: isZh
																		? '等待扫描结果'
																		: 'Waiting for scan results'}
														</span>
													</div>
													{discoveryError && (
														<p className="mt-3 text-xs text-rose-500 dark:text-rose-300">
															{discoveryError}
														</p>
													)}
												</div>

												<div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-4">
													<p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
														{isZh
															? '1. 选择一个自动发现的提供方'
															: '1. Pick an autodetected provider'}
													</p>
													<div className="grid gap-3 md:grid-cols-2">
														{detectedProviders.length ? (
															detectedProviders.map((provider) => (
																<button
																	key={provider.baseURL}
																	type="button"
																	onClick={() => setSelectedProviderBaseURL(provider.baseURL)}
																	className={`rounded-2xl border p-4 text-left transition ${
																		selectedProviderBaseURL === provider.baseURL
																			? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/20 shadow-lg'
																			: 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 hover:border-fuchsia-300'
																	}`}
																>
																	<div className="flex items-center justify-between gap-3">
																		<span className="font-medium text-gray-900 dark:text-white">
																			{provider.name}
																		</span>
																		<span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] text-gray-500 dark:text-gray-300">
																			{provider.models.length} {isZh ? '个模型' : 'models'}
																		</span>
																	</div>
																	<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
																		{provider.baseURL}
																	</p>
																	<div className="mt-3 flex flex-wrap gap-2">
																		{provider.models.slice(0, 4).map((model: string) => (
																			<span
																				key={model}
																				className="rounded-full border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-mono text-gray-600 dark:text-gray-300"
																			>
																				{model}
																			</span>
																		))}
																	</div>
																</button>
															))
														) : (
															<div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-sm text-gray-500 dark:text-gray-400 md:col-span-2">
																{isZh
																	? '尚未发现可访问的本地推理服务。先启动 Ollama、LM Studio 或 vLLM，再点击重新扫描。'
																	: 'No reachable local runtime yet. Start Ollama, LM Studio, or vLLM, then hit rescan.'}
															</div>
														)}
													</div>
												</div>

												<div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-4">
													<p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
														{isZh
															? '2. 生成安装代码和书签注入器'
															: '2. Generate install code and bookmarklet'}
													</p>
													<CodeEditor code={installerSnippet} language="typescript" />
												</div>
											</div>

											<div className="space-y-4 text-left">
												<div className="rounded-2xl border border-cyan-300/40 bg-linear-to-br from-cyan-500/10 via-blue-500/10 to-fuchsia-500/10 p-5">
													<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
														{isZh ? '书签安装器' : 'Bookmarklet installer'}
													</h4>
													<p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
														{isZh
															? '拖拽下面的按钮到收藏夹栏即可。若没有选中提供方，脚本会在运行时自动探测本机模型。'
															: 'Drag the button below to your bookmarks bar. If no provider is selected, the script will scan your machine for local models at launch.'}
													</p>
													<div className="mt-4 flex flex-wrap items-center gap-3">
														<select
															value={cdnSource}
															onChange={(e) =>
																setCdnSource(e.target.value as 'international' | 'china')
															}
															className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200"
														>
															<option value="international">jsdelivr CDN</option>
															<option value="china">npmmirror CDN</option>
														</select>
														<div dangerouslySetInnerHTML={{ __html: installerBookmarklet }}></div>
													</div>
													<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
														{selectedProvider
															? isZh
																? `当前会固定使用 ${selectedProvider.name} / ${demoModel.trim() || selectedProvider.defaultModel}`
																: `This bookmarklet is locked to ${selectedProvider.name} / ${demoModel.trim() || selectedProvider.defaultModel}`
															: isZh
																? '未选择提供方时，bookmarklet 将在启动时自动扫描本地模型。'
																: 'Without a selected provider, the bookmarklet will scan local models on launch.'}
													</p>
												</div>

												<div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 p-5">
													<h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-3">
														{isZh ? '安装提示' : 'Install notes'}
													</h4>
													<ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
														<li className="flex items-start text-left">
															<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
															{isZh
																? '本地扫描依赖各提供方暴露标准 /v1/models 端点，并允许浏览器跨域访问。'
																: 'Local scanning relies on providers exposing a standard /v1/models endpoint with browser-accessible CORS.'}
														</li>
														<li className="flex items-start text-left">
															<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
															{isZh
																? '若浏览器无法访问本地端点，安装器依然可以回退到免费测试接口或显式配置远端模型。'
																: 'If the browser cannot reach local endpoints, the installer still lets you fall back to the free demo API or explicit remote configuration.'}
														</li>
														<li className="flex items-start text-left">
															<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
															{isZh
																? '项目本身不包含遥测、分析或跟踪代码。'
																: 'The project itself contains no telemetry, analytics, or tracking code.'}
														</li>
														<li className="flex items-start text-left">
															<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
															{isZh ? (
																<>
																	免费测试接口的使用规则见
																	<a
																		href={TERMS_URL}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="underline"
																	>
																		使用条款
																	</a>
																</>
															) : (
																<>
																	Free demo API usage is covered by the{' '}
																	<a
																		href={TERMS_URL}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="underline"
																	>
																		Terms of Use
																	</a>
																</>
															)}
														</li>
													</ul>
												</div>
											</div>
										</div>
									)}
								</div>
							</NeonGradientCard>
						</div>
					</div>

					<ul
						className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400"
						role="list"
					>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '纯前端方案' : 'Pure Front-end Solution'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '支持私有模型' : 'Your Own Models'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '无痛脱敏' : 'Built-in Privacy'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? 'MIT 开源' : 'MIT Open Source'}
						</li>
					</ul>
				</div>
			</div>
		</section>
	)
}
