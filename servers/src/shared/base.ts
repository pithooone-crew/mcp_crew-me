import express from 'express'
import cors from 'cors'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'

// ── SSE Server factory ──────────────────────────────────────────────────────

export function createSseServer(
  name: string,
  port: number,
  registerTools: (server: McpServer) => void,
  setupRoutes?: (app: express.Application) => void,
) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // Allow caller to register custom routes (e.g. OAuth) before SSE
  if (setupRoutes) setupRoutes(app)

  const transports = new Map<string, SSEServerTransport>()

  // Each SSE connection gets its own McpServer + transport
  app.get('/sse', async (_req, res) => {
    const transport = new SSEServerTransport('/messages', res)
    const server = new McpServer({ name, version: '1.0.0' })
    registerTools(server)

    transports.set(transport.sessionId, transport)
    res.on('close', () => transports.delete(transport.sessionId))

    await server.connect(transport)
  })

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string
    const transport = transports.get(sessionId)
    if (transport) {
      await transport.handlePostMessage(req, res)
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  })

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', server: name, port }),
  )

  app.listen(port, () => {
    console.log(`✅ [${name}] MCP server → http://localhost:${port}/sse`)
  })
}

// ── Response helpers ────────────────────────────────────────────────────────

export function ok(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

export function fail(message: string) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  }
}

// ── Generic authenticated fetch ─────────────────────────────────────────────

export async function apiFetch(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}
