import { siGithub } from 'simple-icons'

import { useLanguage } from '@/i18n/context'

export default function Footer() {
	const { isZh } = useLanguage()

	return (
		<footer
			className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
			role="contentinfo"
		>
			<div className="max-w-7xl mx-auto px-6 py-6">
				<div className="flex flex-col md:flex-row justify-between items-center gap-4">
					<div className="text-gray-600 dark:text-gray-300 text-sm space-y-1 text-center md:text-left">
						<p>© 2026 page-agent. All rights reserved.</p>
						<p>
							{isZh ? '感谢' : 'Thanks to'}{' '}
							<a
								href="https://github.com/gaomeng1900"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-gray-900 dark:hover:text-white"
							>
								Simon
							</a>{' '}
							{isZh
								? '提供最初的 PageAgent 思路，也感谢其他开源资料的启发。'
								: 'for the original PageAgent ideas, with appreciation for other open-source references too.'}
						</p>
						<p>
							{isZh ? '也感谢' : 'And thanks to'}{' '}
							<a
								href="https://github.com/groxaxo"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-gray-900 dark:hover:text-white"
							>
								groxaxo
							</a>{' '}
							{isZh
								? '带来的优秀 mindset 与持续改进。'
								: 'for the amazing mindset and improvements.'}
						</p>
						<p>
							{isZh
								? '项目本身不包含遥测、分析或跟踪代码。'
								: 'No telemetry, analytics, or tracking code.'}
						</p>
					</div>
					<div className="flex items-center space-x-6">
						<a
							href="https://github.com/groxaxo/page-agent/blob/main/docs/terms-and-privacy.md"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 text-sm"
						>
							{isZh ? '使用条款与隐私' : 'Terms & Privacy'}
						</a>
						<a
							href="https://github.com/groxaxo/page-agent"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
							aria-label={isZh ? '访问 GitHub 仓库' : 'Visit GitHub repository'}
						>
							<svg
								role="img"
								viewBox="0 0 24 24"
								className="w-5 h-5 fill-current"
								aria-hidden="true"
							>
								<path d={siGithub.path} />
							</svg>
						</a>
					</div>
				</div>
			</div>
		</footer>
	)
}
