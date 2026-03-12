import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '@/constants'
import { useLanguage } from '@/i18n/context'

const TERMS_URL =
	'https://github.com/groxaxo/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use'

export default function QuickStart() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">Quick Start</h1>

			<p className=" mb-6 leading-relaxed">
				{isZh ? '几分钟内完成 page-agent 的集成。' : 'Integrate page-agent in minutes.'}
			</p>

			<div className="mb-6 rounded-xl border border-fuchsia-200/70 bg-linear-to-r from-fuchsia-50 to-cyan-50 p-4 text-sm text-gray-700 dark:border-fuchsia-900/60 dark:from-fuchsia-950/20 dark:to-cyan-950/20 dark:text-gray-200">
				{isZh ? (
					<>
						本文档覆盖的是 <strong>groxaxo/page-agent</strong> 这个原创分叉版本；感谢 Simon 与原始
						Alibaba PageAgent 项目的启发，同时这里展示的是带有前台安装器与本地模型自动发现能力的
						fork。
					</>
				) : (
					<>
						This documentation covers <strong>groxaxo/page-agent</strong>, an original fork inspired
						by Simon and the original Alibaba PageAgent project, while clearly documenting the
						fork-specific installer and local model autodetection flow.
					</>
				)}
			</div>

			<Heading id="installation-steps" className="text-2xl font-bold mb-3">
				{isZh ? '安装步骤' : 'Installation Steps'}
			</Heading>

			<div className="space-y-4 mb-6">
				{/* Demo CDN - One Line */}
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						{isZh ? '🚀 快速体验（Demo CDN）' : '🚀 Quick Try (Demo CDN)'}
					</h3>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mb-3 text-sm">
						<span className="text-yellow-800 dark:text-yellow-200">
							⚠️{' '}
							{isZh ? (
								<>
									该 Demo CDN 使用了免费的测试 LLM API，使用即表示您同意其
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
									This demo CDN uses our free testing LLM API. By using it you agree to the{' '}
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
						</span>
					</div>
					<CodeEditor
						code={`<script src="DEMO_CDN_URL" crossorigin="true"></script>`}
						language="html"
					/>
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="text-left py-2 px-3 font-semibold w-28">
									{isZh ? '镜像' : 'Mirrors'}
								</th>
								<th className="text-left py-2 px-3 font-semibold">URL</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-2 px-3">{isZh ? '全球' : 'Global'}</td>
								<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_URL}</td>
							</tr>
							<tr>
								<td className="py-2 px-3">{isZh ? '中国' : 'China'}</td>
								<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_CN_URL}</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* NPM - Recommended */}
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						{isZh ? '📦 NPM 安装（推荐）' : '📦 NPM Install (Recommended)'}
					</h3>
					<CodeEditor
						code={`// npm install page-agent

import { PageAgent } from 'page-agent'`}
						language="bash"
					/>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						{isZh ? '2. 初始化配置' : '2. Initialize Configuration'}
					</h3>
					<CodeEditor
						code={`const agent = new PageAgent({
  model: 'qwen3.5-plus',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'YOUR_API_KEY',
  language: '${isZh ? 'zh-CN' : 'en-US'}'
})`}
						language="javascript"
					/>
				</div>

				<div className="p-4 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-fuchsia-900 dark:text-fuchsia-300">
						{isZh ? '🤖 自动发现本地模型（新）' : '🤖 Autodetect Local Models (New)'}
					</h3>
					<p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
						{isZh
							? '如果你的电脑上已经运行了 Ollama、LM Studio 或 vLLM，可以让 page-agent 自动扫描 /v1/models 并直接使用发现到的模型。'
							: 'If Ollama, LM Studio, or vLLM is already running on your machine, page-agent can scan /v1/models automatically and use the first detected model directly.'}
					</p>
					<CodeEditor
						code={`import { PageAgent, discoverAvailableModelProviders, pickBestDetectedProvider } from 'page-agent'

const detected = pickBestDetectedProvider(await discoverAvailableModelProviders())
if (!detected) throw new Error('${isZh ? '请先启动本地模型服务。' : 'Start a local model runtime first.'}')

const agent = new PageAgent({
  model: detected.defaultModel,
  baseURL: detected.baseURL,
  apiKey: detected.apiKey,
  language: '${isZh ? 'zh-CN' : 'en-US'}'
})`}
						language="javascript"
					/>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						{isZh ? '3. 开始使用' : '3. Start Using'}
					</h3>
					<CodeEditor
						code={`// ${isZh ? '程序化执行自然语言指令' : 'Execute natural language instructions programmatically'}
await agent.execute('${isZh ? '点击提交按钮，然后填写用户名为张三' : 'Click submit button, then fill username as John'}');

// ${isZh ? '或者' : 'Or:'}
// ${isZh ? '显示对话框让用户输入指令' : 'Show panel for user to input instructions'}
agent.panel.show()
`}
						language="javascript"
					/>
				</div>
			</div>
		</div>
	)
}
