// @ts-check
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { builtinModules } from 'module'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))

console.log(chalk.cyan(`📦 Building @page-agent/mcp-server`))

const external = [
	...builtinModules,
	...builtinModules.map((name) => `node:${name}`),
	'@modelcontextprotocol/sdk',
	/^@modelcontextprotocol\/sdk\//,
	'zod',
	'zod/v4',
	/^@page-agent\//,
]

export default defineConfig({
	clearScreen: false,
	plugins: [dts({ tsconfigPath: './tsconfig.dts.json', bundleTypes: true })],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	build: {
		target: 'node20',
		ssr: true,
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'PageAgentMcpServer',
			fileName: 'index',
			formats: ['es'],
		},
		outDir: resolve(__dirname, 'dist'),
		rollupOptions: {
			external,
		},
		minify: false,
		sourcemap: true,
	},
	define: {
		__PAGE_AGENT_MCP_SERVER_VERSION__: JSON.stringify(pkg.version),
		'process.env.NODE_ENV': '"production"',
	},
})
