import { useState, useEffect, useCallback, useRef } from 'react'
import type { Role, Message, ToolCall, PlatformStatus, PlatformConfig, Project } from './types'
import { ROLE_CONFIGS, ROLE_ACCENT, COLORS } from './constants'
import { queryDemo, queryAEC } from './api'
import type { ApiMessage } from './api'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import DataPanel from './components/DataPanel'
import ConfigDrawer from './components/ConfigDrawer'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

type Conversations = Record<Role, Message[]>

const ROLES: Role[] = ['general_contractor', 'architect_engineer', 'owner_developer', 'preconstruction']

export default function App() {
  const [role, setRole] = useState<Role>('general_contractor')
  const [project, setProject] = useState<Project>({ name: 'Riverside Tower', id: '2240' })
  const [conversations, setConversations] = useState<Conversations>({
    general_contractor: [],
    architect_engineer: [],
    owner_developer: [],
    preconstruction: [],
  })
  const [isDemo, setIsDemo] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [platformStatus] = useState<Record<string, PlatformStatus>>({})
  const [configOpen, setConfigOpen] = useState(false)
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfig>>({})
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(p => !p)
        return
      }
      if (mod && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        setRole(ROLES[parseInt(e.key) - 1])
        return
      }
      if (e.key === 'Escape' && cmdPaletteOpen) {
        setCmdPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [cmdPaletteOpen])

  useEffect(() => {
    if (cmdPaletteOpen && cmdInputRef.current) {
      cmdInputRef.current.focus()
    }
  }, [cmdPaletteOpen])

  const handleRoleSwitch = useCallback((newRole: Role) => {
    setRole(newRole)
    setToolCalls([])
  }, [])

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMsg: Message = {
      id: makeId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    setConversations(prev => ({
      ...prev,
      [role]: [...prev[role], userMsg],
    }))
    setIsLoading(true)
    setToolCalls([])

    // Build conversation history for API
    const history: ApiMessage[] = conversations[role].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      let result
      if (isDemo) {
        result = await queryDemo(message, role, history, project.id)
      } else {
        if (!apiKey) throw new Error('API key required. Open ⚙ Config to add your key.')
        result = await queryAEC(message, role, history, apiKey, project.id, platformConfigs)
      }

      setToolCalls(result.toolCalls)

      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
        toolCalls: result.toolCalls,
        isMultiSource: result.isMultiSource,
      }

      setConversations(prev => ({
        ...prev,
        [role]: [...prev[role], assistantMsg],
      }))
    } catch (err) {
      const errMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: `**Error:** ${err instanceof Error ? err.message : 'Unknown error occurred.'}`,
        timestamp: new Date(),
      }
      setConversations(prev => ({
        ...prev,
        [role]: [...prev[role], errMsg],
      }))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, role, conversations, isDemo, apiKey, project.id])

  const handleClearChat = useCallback(() => {
    setConversations(prev => ({ ...prev, [role]: [] }))
    setToolCalls([])
  }, [role])

  const handleConnectLive = useCallback(() => {
    setConfigOpen(true)
  }, [])

  const handleCmdSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (cmdQuery.trim()) {
      setCmdPaletteOpen(false)
      handleSend(cmdQuery)
      setCmdQuery('')
    }
  }, [cmdQuery, handleSend])

  const accent = ROLE_ACCENT[role]
  const messages = conversations[role]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: COLORS.bgPrimary,
      color: COLORS.textPrimary,
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Demo mode banner */}
      {isDemo && (
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '6px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: '#f59e0b', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
            ⚠ DEMO MODE — Simulated data. Not connected to live MCP servers.
          </span>
          <button
            onClick={handleConnectLive}
            style={{
              background: '#f59e0b',
              color: '#0a0f1a',
              border: 'none',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Connect Live Data →
          </button>
        </div>
      )}

      <TopBar
        role={role}
        onRoleChange={handleRoleSwitch}
        project={project}
        onProjectChange={setProject}
        onConfigOpen={() => setConfigOpen(true)}
        accent={accent}
        isDemo={isDemo}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          role={role}
          platformStatus={platformStatus}
          platformConfigs={platformConfigs}
          isDemo={isDemo}
          onConfigOpen={() => setConfigOpen(true)}
          accent={accent}
        />

        <ChatArea
          role={role}
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
          onClearChat={handleClearChat}
          accent={accent}
          project={project}
        />

        <DataPanel
          toolCalls={toolCalls}
          role={role}
          accent={accent}
          isLoading={isLoading}
        />
      </div>

      {configOpen && (
        <ConfigDrawer
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          isDemo={isDemo}
          onDemoToggle={setIsDemo}
          platformConfigs={platformConfigs}
          onPlatformConfigChange={setPlatformConfigs}
          role={role}
          onClose={() => setConfigOpen(false)}
          accent={accent}
        />
      )}

      {/* Command Palette */}
      {cmdPaletteOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 120,
          }}
          onClick={() => setCmdPaletteOpen(false)}
        >
          <div
            style={{
              background: '#111827',
              border: `1px solid ${accent}`,
              borderRadius: 8,
              width: 560,
              overflow: 'hidden',
              boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 0 1px ${accent}33`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleCmdSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                <span style={{ color: accent, fontSize: 16 }}>⌘</span>
                <input
                  ref={cmdInputRef}
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                  placeholder="Ask anything about your project..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: COLORS.textPrimary,
                    fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <kbd style={{
                  background: '#1e2d40', color: COLORS.textMuted, borderRadius: 3,
                  padding: '2px 6px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace"
                }}>ESC</kbd>
              </div>
              <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '6px 8px' }}>
                {ROLE_CONFIGS[role].promptSuggestions.slice(0, 4).map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setCmdPaletteOpen(false); handleSend(s); setCmdQuery('') }}
                    style={{
                      padding: '7px 10px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 13, color: COLORS.textMuted,
                      fontFamily: "'IBM Plex Mono', monospace",
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e2d40')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
