export type Role = 'general_contractor' | 'architect_engineer' | 'owner_developer' | 'preconstruction'

export interface Platform {
  id: string
  name: string
  icon: string
  color: string
  url: string
}

export interface RoleConfig {
  id: Role
  label: string
  icon: string
  accent: string
  platforms: Platform[]
  systemPrompt: string
  promptSuggestions: string[]
  mcpServers: MCPServer[]
}

export interface MCPServer {
  type: 'url'
  url: string
  name: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isMultiSource?: boolean
  rawBlocks?: ContentBlock[]
}

export interface ToolCall {
  id: string
  platform: string
  tool: string
  params: Record<string, unknown>
  result?: string
  resultCount?: number
  durationMs?: number
  status: 'pending' | 'success' | 'error'
}

export interface ContentBlock {
  type: 'text' | 'mcp_tool_use' | 'mcp_tool_result'
  text?: string
  name?: string
  input?: Record<string, unknown>
  content?: Array<{ type: string; text: string }>
}

export interface PlatformStatus {
  id: string
  connected: boolean
  lastSync?: string
}

export interface PlatformConfig {
  url: string
  projectId: string
  token: string
  enabled: boolean
}

export interface Project {
  name: string
  id: string
}

export interface TableRow {
  [key: string]: string | number | boolean
}

export interface BudgetItem {
  division: string
  budget: number
  actual: number
  variance: number
}
