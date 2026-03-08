export type Role = 'general_contractor' | 'architect_engineer' | 'owner_developer' | 'preconstruction' | 'safety'

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

export interface SerializedMessage extends Omit<Message, 'timestamp'> {
  timestamp: string // ISO string for JSON serialization
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
  latencyMs?: number
  lastChecked?: string
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
  isPortfolio?: boolean
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

// Saved queries & playbooks
export interface SavedQuery {
  id: string
  text: string
  role: Role
  projectId: string
  createdAt: string
}

export interface Playbook {
  id: string
  name: string
  description: string
  queries: string[]
  role: Role
  createdAt: string
}

export interface PlaybookStore {
  playbooks: Playbook[]
  savedQueries: SavedQuery[]
}

// Notifications
export interface Notification {
  id: string
  messageId: string
  flag: string
  excerpt: string
  role: Role
  projectId: string
  timestamp: string
  read: boolean
}

// File uploads
export interface UploadedFile {
  name: string
  type: string
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
}

// Analytics
export interface AnalyticsEvent {
  timestamp: string
  role: Role
  projectId: string
  queryLength: number
  platformsInvoked: string[]
  toolCount: number
  isDemo: boolean
}

export interface AnalyticsStore {
  events: AnalyticsEvent[]
  lastReset: string
}

// User profile
export interface UserProfile {
  name: string
  initials: string
  email?: string
  color: string
}

// Write-back actions
export interface WriteAction {
  id: string
  label: string
  tool: string
  platform: string
  prefillParams?: Record<string, unknown>
}

// Conversation persistence
export interface ConversationStore {
  [key: string]: SerializedMessage[]
}
