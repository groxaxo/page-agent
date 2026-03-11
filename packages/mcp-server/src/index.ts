#!/usr/bin/env node
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { LocalBridgeServer } from './LocalBridgeServer'
import { HttpBrowserBridge } from './PageAgentBridge'
import { readServerConfigFromEnv } from './config'
import { createMcpServer } from './createMcpServer'

export async function startPageAgentMcpServer(): Promise<void> {
	const config = readServerConfigFromEnv()
	const bridgeServer = new LocalBridgeServer(config)
	const bridge = new HttpBrowserBridge(bridgeServer)
	const log = (message: string, details?: unknown) => {
		const suffix = details == null ? '' : ` ${JSON.stringify(details)}`
		process.stderr.write(`[page-agent-mcp] ${message}${suffix}\n`)
	}

	await bridgeServer.start()
	log('local bridge server started', {
		host: config.bridgeHost,
		port: config.bridgePort,
		tokenProtected: Boolean(config.bridgeToken),
	})

	const { server, transport } = createMcpServer({ bridge, config, log })

	const shutdown = async (signal: string) => {
		log(`shutting down (${signal})`)
		await Promise.allSettled([server.close(), bridgeServer.stop()])
		process.exit(0)
	}

	process.once('SIGINT', () => void shutdown('SIGINT'))
	process.once('SIGTERM', () => void shutdown('SIGTERM'))

	await server.connect(transport)
	log('stdio MCP transport connected')
}

const isEntrypoint =
	process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url

if (isEntrypoint) {
	startPageAgentMcpServer().catch((error) => {
		process.stderr.write(
			`[page-agent-mcp] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`
		)
		process.exit(1)
	})
}
