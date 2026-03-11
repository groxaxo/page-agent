import {
	type BrowserBridgeCommand,
	type BrowserBridgeCommandResult,
	type BrowserBridgeRequest,
	LOCAL_BRIDGE_DEFAULT_HOST,
	browserBridgePollRequestSchema,
	browserBridgeRespondRequestSchema,
} from '@page-agent/browser-bridge'
import { randomUUID } from 'node:crypto'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'

import type { PageAgentMcpServerConfig } from './config'

interface RuntimeState {
	runtimeId: string
	lastSeenAt: number
	extensionVersion?: string
}

interface PendingCommand {
	command: BrowserBridgeCommand
	resolve: (value: unknown) => void
	reject: (reason?: unknown) => void
	timeoutId: NodeJS.Timeout
	runtimeId?: string
	sessionId?: string
}

interface PollWaiter {
	resolve: (value: BrowserBridgeCommand | null) => void
	timeoutId: NodeJS.Timeout
}

export class LocalBridgeServer {
	private readonly server = createServer(this.handleRequest.bind(this))
	private readonly runtimes = new Map<string, RuntimeState>()
	private readonly sessionRuntimeIds = new Map<string, string>()
	private readonly pendingCommands = new Map<string, PendingCommand>()
	private readonly runtimeQueues = new Map<string, BrowserBridgeCommand[]>()
	private readonly pollWaiters = new Map<string, PollWaiter>()
	private readonly globalQueue: BrowserBridgeCommand[] = []

	private readonly config: Pick<
		PageAgentMcpServerConfig,
		'bridgeHost' | 'bridgePort' | 'bridgeToken' | 'commandTimeoutMs' | 'bridgeUrl'
	>

	constructor(
		config: Pick<
			PageAgentMcpServerConfig,
			'bridgeHost' | 'bridgePort' | 'bridgeToken' | 'commandTimeoutMs' | 'bridgeUrl'
		>
	) {
		this.config = config
	}

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.once('error', reject)
			this.server.listen(this.config.bridgePort, this.config.bridgeHost, () => {
				this.server.off('error', reject)
				resolve()
			})
		})
	}

	async stop(): Promise<void> {
		for (const pending of this.pendingCommands.values()) {
			clearTimeout(pending.timeoutId)
			pending.reject(new Error('Bridge server stopped'))
		}
		this.pendingCommands.clear()

		for (const waiter of this.pollWaiters.values()) {
			clearTimeout(waiter.timeoutId)
			waiter.resolve(null)
		}
		this.pollWaiters.clear()

		await new Promise<void>((resolve, reject) => {
			this.server.close((error) => {
				if (error) {
					reject(error)
					return
				}
				resolve()
			})
		})
	}

	async dispatch(request: BrowserBridgeRequest, sessionId?: string): Promise<unknown> {
		const commandId = randomUUID()
		const runtimeId = sessionId ? this.sessionRuntimeIds.get(sessionId) : undefined
		const command: BrowserBridgeCommand = {
			commandId,
			request,
		}

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.pendingCommands.delete(commandId)
				this.removeQueuedCommand(commandId, runtimeId)
				reject(
					new Error(
						`Timed out waiting for the browser bridge to handle ${request.method}. ` +
							`Make sure the Page Agent extension is installed and able to reach ` +
							`${this.config.bridgeUrl}.`
					)
				)
			}, this.config.commandTimeoutMs)

			this.pendingCommands.set(commandId, {
				command,
				resolve,
				reject,
				timeoutId,
				runtimeId,
				sessionId,
			})

			if (runtimeId) {
				this.getRuntimeQueue(runtimeId).push(command)
				this.flushWaiter(runtimeId)
				return
			}

			if (sessionId) {
				clearTimeout(timeoutId)
				this.pendingCommands.delete(commandId)
				reject(
					new Error(
						`Session ${sessionId} is not known to the local bridge. Call page_agent_list_sessions first.`
					)
				)
				return
			}

			this.globalQueue.push(command)
			this.flushAnyWaiter()
		})
	}

	getConnectedRuntimeCount(): number {
		return this.runtimes.size
	}

	private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
		try {
			if (request.method === 'GET' && request.url === '/health') {
				this.sendJson(response, 200, {
					ok: true,
					host: this.config.bridgeHost || LOCAL_BRIDGE_DEFAULT_HOST,
					port: this.config.bridgePort,
					runtimes: this.getConnectedRuntimeCount(),
				})
				return
			}

			if (request.method === 'POST' && request.url === '/bridge/poll') {
				const body = browserBridgePollRequestSchema.parse(await this.readJson(request))
				this.assertToken(body.token)
				const command = await this.waitForCommand(
					body.runtimeId,
					body.waitMs,
					body.extensionVersion
				)
				this.sendJson(response, 200, { command })
				return
			}

			if (request.method === 'POST' && request.url === '/bridge/respond') {
				const body = browserBridgeRespondRequestSchema.parse(await this.readJson(request))
				this.assertToken(body.token)
				this.markRuntimeSeen(body.runtimeId)
				this.resolveCommand(body.runtimeId, body.response)
				this.sendJson(response, 200, { ok: true })
				return
			}

			this.sendJson(response, 404, { error: 'Not found' })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.sendJson(response, 400, { error: message })
		}
	}

	private async readJson(request: IncomingMessage): Promise<unknown> {
		const chunks: Buffer[] = []
		for await (const chunk of request) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}

		const raw = Buffer.concat(chunks).toString('utf8')
		return raw ? JSON.parse(raw) : {}
	}

	private sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
		response.writeHead(statusCode, {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		})
		response.end(JSON.stringify(payload))
	}

	private assertToken(token: string | undefined): void {
		if (!this.config.bridgeToken) {
			return
		}

		if (token !== this.config.bridgeToken) {
			throw new Error('Invalid bridge token')
		}
	}

	private markRuntimeSeen(runtimeId: string, extensionVersion?: string): void {
		this.runtimes.set(runtimeId, {
			runtimeId,
			lastSeenAt: Date.now(),
			extensionVersion,
		})
	}

	private waitForCommand(
		runtimeId: string,
		waitMs: number,
		extensionVersion?: string
	): Promise<BrowserBridgeCommand | null> {
		this.markRuntimeSeen(runtimeId, extensionVersion)

		const queued = this.dequeueCommand(runtimeId)
		if (queued) {
			return Promise.resolve(queued)
		}

		return new Promise((resolve) => {
			const timeoutId = setTimeout(() => {
				this.pollWaiters.delete(runtimeId)
				resolve(null)
			}, waitMs)

			this.pollWaiters.set(runtimeId, { resolve, timeoutId })
		})
	}

	private dequeueCommand(runtimeId: string): BrowserBridgeCommand | null {
		const runtimeQueue = this.runtimeQueues.get(runtimeId)
		if (runtimeQueue && runtimeQueue.length > 0) {
			return runtimeQueue.shift() || null
		}

		if (this.globalQueue.length > 0) {
			const command = this.globalQueue.shift() || null
			if (command) {
				const pending = this.pendingCommands.get(command.commandId)
				if (pending) {
					pending.runtimeId = runtimeId
				}
			}
			return command
		}

		return null
	}

	private resolveCommand(runtimeId: string, result: BrowserBridgeCommandResult): void {
		const pending = this.pendingCommands.get(result.commandId)
		if (!pending) {
			return
		}

		clearTimeout(pending.timeoutId)
		this.pendingCommands.delete(result.commandId)
		this.markRuntimeSeen(runtimeId)

		if (result.ok) {
			this.updateSessionRuntimeIndex(runtimeId, result.result)
			pending.resolve(result.result)
			return
		}

		pending.reject(new Error(result.error?.message || 'Unknown bridge error'))
	}

	private updateSessionRuntimeIndex(runtimeId: string, result: unknown): void {
		if (Array.isArray(result)) {
			for (const item of result) {
				if (
					item &&
					typeof item === 'object' &&
					typeof (item as { sessionId?: unknown }).sessionId === 'string'
				) {
					this.sessionRuntimeIds.set((item as { sessionId: string }).sessionId, runtimeId)
				}
			}
			return
		}

		if (
			result &&
			typeof result === 'object' &&
			typeof (result as { sessionId?: unknown }).sessionId === 'string'
		) {
			this.sessionRuntimeIds.set((result as { sessionId: string }).sessionId, runtimeId)
		}
	}

	private flushWaiter(runtimeId: string): void {
		const waiter = this.pollWaiters.get(runtimeId)
		if (!waiter) {
			return
		}

		const command = this.dequeueCommand(runtimeId)
		if (!command) {
			return
		}

		clearTimeout(waiter.timeoutId)
		this.pollWaiters.delete(runtimeId)
		waiter.resolve(command)
	}

	private flushAnyWaiter(): void {
		if (this.globalQueue.length === 0) {
			return
		}

		const nextRuntimeId = this.pollWaiters.keys().next().value
		if (!nextRuntimeId) {
			return
		}

		this.flushWaiter(nextRuntimeId)
	}

	private getRuntimeQueue(runtimeId: string): BrowserBridgeCommand[] {
		let queue = this.runtimeQueues.get(runtimeId)
		if (!queue) {
			queue = []
			this.runtimeQueues.set(runtimeId, queue)
		}
		return queue
	}

	private removeQueuedCommand(commandId: string, runtimeId?: string): void {
		if (runtimeId) {
			const queue = this.runtimeQueues.get(runtimeId)
			if (queue) {
				this.runtimeQueues.set(
					runtimeId,
					queue.filter((item) => item.commandId !== commandId)
				)
			}
			return
		}

		const index = this.globalQueue.findIndex((item) => item.commandId === commandId)
		if (index >= 0) {
			this.globalQueue.splice(index, 1)
		}
	}
}
