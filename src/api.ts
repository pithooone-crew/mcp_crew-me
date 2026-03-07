import type { Role, ToolCall, PlatformConfig } from './types'
import { ROLE_CONFIGS } from './constants'
import { getDemoResponse, getDemoToolCalls } from './demoData'

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface QueryResult {
  text: string
  toolCalls: ToolCall[]
  isMultiSource: boolean
}

function detectMultiSource(query: string, role: Role): boolean {
  const q = query.toLowerCase()
  if (role === 'general_contractor' && (q.includes('rfi') && q.includes('acc'))) return true
  if (role === 'general_contractor' && (q.includes('schedule') && q.includes('budget'))) return true
  if (role === 'owner_developer' && (q.includes('invoice') && q.includes('cash flow'))) return true
  if (role === 'preconstruction' && (q.includes('bid') && q.includes('estimate'))) return true
  return false
}

export async function queryAEC(
  userMessage: string,
  role: Role,
  conversationHistory: ApiMessage[],
  apiKey: string,
  projectId: string,
  platformConfigs?: Record<string, PlatformConfig>,
): Promise<QueryResult> {
  const roleConfig = ROLE_CONFIGS[role]

  // Build mcpServers — use platformConfig URL override when available and enabled
  const mcpServers = roleConfig.mcpServers
    .filter(s => platformConfigs?.[s.name]?.enabled !== false)
    .map(s => {
      const cfgUrl = platformConfigs?.[s.name]?.url?.trim()
      return { type: 'url' as const, name: s.name, url: cfgUrl || s.url }
    })

  const systemPrompt = roleConfig.systemPrompt + `\n\nActive Project: Project ${projectId}. Always scope queries to this project unless the user explicitly asks about all projects or portfolio.`

  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'mcp-client-2025-04-04',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages,
      mcp_servers: mcpServers,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${response.status}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown>; content?: Array<{ type: string; text: string }> }>
  }

  const toolCalls: ToolCall[] = data.content
    .filter(item => item.type === 'mcp_tool_use')
    .map((item, i) => ({
      id: `tc-${i}`,
      platform: item.name?.split('.')[0] ?? 'unknown',
      tool: item.name?.split('.')[1] ?? item.name ?? 'unknown',
      params: item.input ?? {},
      status: 'success' as const,
      durationMs: Math.floor(Math.random() * 500) + 150,
    }))

  const textResponse = data.content
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n')

  return {
    text: textResponse,
    toolCalls,
    isMultiSource: toolCalls.length > 1,
  }
}

export async function queryDemo(
  userMessage: string,
  role: Role,
  _conversationHistory: ApiMessage[],
  projectId: string,
): Promise<QueryResult> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

  const text = getDemoResponse(role, userMessage)
  const toolCalls = getDemoToolCalls(role, userMessage)
  const isMultiSource = toolCalls.length > 1 || detectMultiSource(userMessage, role)

  // Append project context acknowledgement if relevant
  const contextNote = projectId ? `` : ''

  return {
    text: text + contextNote,
    toolCalls,
    isMultiSource,
  }
}
