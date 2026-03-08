import type { Role, ToolCall, PlatformConfig, UploadedFile } from './types'
import { ROLE_CONFIGS } from './constants'
import { getDemoResponse, getDemoToolCalls } from './demoData'

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

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

/** Build a user message content block array when files are attached */
function buildUserContent(text: string, files?: UploadedFile[]): string | ContentBlock[] {
  if (!files || files.length === 0) return text

  const blocks: ContentBlock[] = []

  // Add files first (images + documents)
  for (const f of files) {
    if (f.mediaType === 'application/pdf') {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.base64 },
      })
    } else {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: f.mediaType, data: f.base64 },
      })
    }
  }

  // Text goes last
  blocks.push({ type: 'text', text })
  return blocks
}

export async function queryAEC(
  userMessage: string,
  role: Role,
  conversationHistory: ApiMessage[],
  apiKey: string,
  projectId: string,
  platformConfigs?: Record<string, PlatformConfig>,
  useProxy = false,
  files?: UploadedFile[],
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
    { role: 'user' as const, content: buildUserContent(userMessage, files) },
  ]

  const body = {
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages,
    mcp_servers: mcpServers,
  }

  // Use server-side proxy if available (keeps API key server-side)
  const endpoint = useProxy ? '/api/proxy/messages' : 'https://api.anthropic.com/v1/messages'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'mcp-client-2025-04-04',
  }
  if (!useProxy) headers['x-api-key'] = apiKey

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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
  files?: UploadedFile[],
): Promise<QueryResult> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

  let text = getDemoResponse(role, userMessage)

  // If files attached, acknowledge them in demo mode
  if (files && files.length > 0) {
    const imgCount = files.filter(f => f.mediaType !== 'application/pdf').length
    const pdfCount = files.filter(f => f.mediaType === 'application/pdf').length
    const attachNote = []
    if (imgCount > 0) attachNote.push(`${imgCount} image${imgCount > 1 ? 's' : ''}`)
    if (pdfCount > 0) attachNote.push(`${pdfCount} PDF${pdfCount > 1 ? 's' : ''}`)
    text = `*[Attached: ${attachNote.join(', ')} — live mode required for document analysis]*\n\n` + text
  }

  const toolCalls = getDemoToolCalls(role, userMessage)
  const isMultiSource = toolCalls.length > 1 || detectMultiSource(userMessage, role)

  return {
    text: text + (projectId ? '' : ''),
    toolCalls,
    isMultiSource,
  }
}
