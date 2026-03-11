// @ts-check
import chalk from 'chalk'
import { builtinModules } from 'module'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
		'process.env.NODE_ENV': '"production"',
	},
})
