import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Role, Message, ToolCall, PlatformStatus, PlatformConfig, Project, Notification } from './types'
import { ROLE_CONFIGS, ROLE_ACCENT, COLORS, PROJECTS } from './constants'
import { queryDemo, queryAEC } from './api'
import type { ApiMessage } from './api'
import { loadConversations, saveConversations, loadPlatformConfigs, savePlatformConfigs, loadNotifications, saveNotifications, appendAnalyticsEvent } from './lib/storage'
import { extractNotifications } from './lib/notifications'
import { recordQuery } from './lib/analytics'
import { useHealthPolling, getHealthUrl } from './hooks/useHealthPolling'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import DataPanel from './components/DataPanel'
import ConfigDrawer from './components/ConfigDrawer'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

type Conversations = Record<Role, Message[]>

const ALL_ROLES: Role[] = ['general_contractor', 'architect_engineer', 'owner_developer', 'preconstruction', 'safety']

function initConversations(): Conversations {
  const stored = loadConversations()
  const base: Conversations = {
    general_contractor: [],
    architect_engineer: [],
    owner_developer: [],
    preconstruction: [],
    safety: [],
  }
  for (const r of ALL_ROLES) {
    const msgs = stored[r] ?? []
    base[r] = msgs.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
  }
  return base
}

export default function App() {
  const [role, setRole] = useState<Role>('general_contractor')
  const [project, setProject] = useState<Project>(PROJECTS[0])
  const [conversations, setConversations] = useState<Conversations>(initConversations)
  const [isDemo, setIsDemo] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [useProxy, setUseProxy] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [configOpen, setConfigOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [playbooksOpen, setPlaybooksOpen] = useState(false)
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfig>>(loadPlatformConfigs)
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdInputRef = useRef<HTMLInputElement>(null)

  // Check if proxy server is reachable
  useEffect(() => {
    fetch('/api/proxy/messages', { method: 'HEAD' })
      .then(() => setUseProxy(true))
      .catch(() => setUseProxy(false))
  }, [])

  // Build health polling endpoints from current role's platforms
  const healthEndpoints = useMemo(() => {
    const roleConfig = ROLE_CONFIGS[role]
    return roleConfig.platforms.map(p => {
      const cfgUrl = platformConfigs[p.id]?.url?.trim() || p.url
      return { id: p.id, healthUrl: getHealthUrl(cfgUrl) }
    })
  }, [role, platformConfigs])

  const platformStatus: Record<string, PlatformStatus> = useHealthPolling(healthEndpoints, 30_000)

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    const serialized: Record<string, unknown[]> = {}
    for (const r of ALL_ROLES) {
      serialized[r] = conversations[r].map(m => ({ ...m, timestamp: m.timestamp.toISOString() }))
    }
    saveConversations(serialized as Parameters<typeof saveConversations>[0])
  }, [conversations])

  // Persist platformConfigs whenever they change
  useEffect(() => {
    savePlatformConfigs(platformConfigs)
  }, [platformConfigs])

  // Persist notifications whenever they change
  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(p => !p)
        return
      }
      if (mod && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault()
        setRole(ALL_ROLES[parseInt(e.key) - 1])
        return
      }
      if (e.key === 'Escape') {
        if (cmdPaletteOpen) setCmdPaletteOpen(false)
        if (notificationsOpen) setNotificationsOpen(false)
        if (analyticsOpen) setAnalyticsOpen(false)
        if (playbooksOpen) setPlaybooksOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [cmdPaletteOpen, notificationsOpen, analyticsOpen, playbooksOpen])

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
        if (!apiKey && !useProxy) throw new Error('API key required. Open ⚙ Config to add your key.')
        result = await queryAEC(message, role, history, apiKey, project.id, platformConfigs, useProxy)
      }

      setToolCalls(result.toolCalls)

      // Record analytics
      recordQuery(role, project.id, result.toolCalls, isDemo, message.length)

      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
        toolCalls: result.toolCalls,
        isMultiSource: result.isMultiSource,
      }

      // Extract notifications
      const newNotifs = extractNotifications(assistantMsg, role, project.id)
      if (newNotifs.length > 0) {
        setNotifications(prev => [...prev, ...newNotifs])
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
  }, [isLoading, role, conversations, isDemo, apiKey, project.id, platformConfigs, useProxy])

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

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length
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
        onNotificationsOpen={() => setNotificationsOpen(true)}
        onAnalyticsOpen={() => setAnalyticsOpen(true)}
        onPlaybooksOpen={() => setPlaybooksOpen(true)}
        notificationCount={unreadCount}
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

      {/* Notifications Panel */}
      {notificationsOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: 420,
              background: '#111827',
              borderLeft: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>🔔 Notifications</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 4,
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: '3px 8px',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: COLORS.textMuted,
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                >×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                  No notifications yet. Alerts like [ALERT], [OVERDUE], and [OVER BUDGET] will appear here.
                </div>
              ) : [...notifications].reverse().map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: n.read ? 'transparent' : 'rgba(239,68,68,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'IBM Plex Mono', monospace",
                      background: n.flag === 'ALERT' ? '#ef4444' : n.flag === 'OVERDUE' ? '#f59e0b' : n.flag === 'OVER BUDGET' ? '#ef4444' : '#6366f1',
                      color: '#fff',
                      borderRadius: 3,
                      padding: '1px 6px',
                    }}>
                      {n.flag}
                    </span>
                    <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {new Date(n.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                    {n.excerpt || '(no excerpt)'}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {n.role.replace(/_/g, ' ')} · {n.projectId}
                  </div>
                </div>
              ))}
            </div>
            {notifications.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${COLORS.border}` }}>
                <button
                  onClick={() => setNotifications([])}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4,
                    color: COLORS.textMuted,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '6px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {analyticsOpen && (
        <AnalyticsPanel onClose={() => setAnalyticsOpen(false)} accent={accent} />
      )}

      {/* Playbooks Panel */}
      {playbooksOpen && (
        <PlaybooksPanel
          onClose={() => setPlaybooksOpen(false)}
          onSend={(q) => { setPlaybooksOpen(false); handleSend(q) }}
          role={role}
          project={project}
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

// ── Inline Analytics Panel ──────────────────────────────────────────────────────

import { loadAnalytics } from './lib/storage'
import { getAnalyticsSummary } from './lib/analytics'

function AnalyticsPanel({ onClose, accent }: { onClose: () => void; accent: string }) {
  const store = loadAnalytics()
  const summary = getAnalyticsSummary(store)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 480,
          background: '#111827',
          borderLeft: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>📊 Usage Analytics</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {summary.totalQueries === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
              No queries recorded yet. Start chatting to see analytics.
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Queries', value: summary.totalQueries },
                  { label: 'Avg Tools/Query', value: summary.avgToolCount },
                  { label: 'Live Queries', value: summary.demoVsLive.live },
                ].map(card => (
                  <div key={card.label} style={{
                    background: '#1a2332',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "'IBM Plex Mono', monospace" }}>{card.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* By role */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Queries by Role</div>
                {Object.entries(summary.byRole).map(([r, count]) => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 160, fontSize: 12, color: COLORS.textPrimary }}>{r.replace(/_/g, ' ')}</div>
                    <div style={{ flex: 1, background: '#1a2332', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(count / summary.totalQueries) * 100}%`,
                        height: '100%',
                        background: accent,
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", width: 24, textAlign: 'right' }}>{count}</div>
                  </div>
                ))}
              </div>

              {/* By platform */}
              {Object.keys(summary.byPlatform).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Platforms Used</div>
                  {Object.entries(summary.byPlatform).sort(([,a],[,b]) => b - a).map(([p, count]) => (
                    <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                      <span style={{ color: COLORS.textPrimary, fontFamily: "'IBM Plex Mono', monospace" }}>{p}</span>
                      <span style={{ color: accent, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Daily activity (last 14 days) */}
              {summary.dailyCounts.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Activity (last 14 days)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                    {summary.dailyCounts.map(({ date, count }) => {
                      const max = Math.max(...summary.dailyCounts.map(d => d.count))
                      return (
                        <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${date}: ${count}`}>
                          <div style={{
                            width: '100%',
                            height: `${Math.max(4, (count / max) * 48)}px`,
                            background: accent,
                            borderRadius: 2,
                            opacity: 0.8,
                          }} />
                          <div style={{ fontSize: 8, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {date.slice(5)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inline Playbooks Panel ──────────────────────────────────────────────────────

import { loadPlaybooks, savePlaybooks } from './lib/storage'
import type { PlaybookStore, SavedQuery, Playbook } from './types'

function PlaybooksPanel({ onClose, onSend, role, project, accent }: {
  onClose: () => void
  onSend: (q: string) => void
  role: Role
  project: Project
  accent: string
}) {
  const [store, setStore] = useState<PlaybookStore>(() => loadPlaybooks())
  const [tab, setTab] = useState<'saved' | 'playbooks'>('saved')
  const [newQuery, setNewQuery] = useState('')
  const [newPlaybookName, setNewPlaybookName] = useState('')

  const save = (updated: PlaybookStore) => {
    setStore(updated)
    savePlaybooks(updated)
  }

  const saveQuery = () => {
    if (!newQuery.trim()) return
    const q: SavedQuery = {
      id: makeId(),
      text: newQuery.trim(),
      role,
      projectId: project.id,
      createdAt: new Date().toISOString(),
    }
    save({ ...store, savedQueries: [...store.savedQueries, q] })
    setNewQuery('')
  }

  const deleteQuery = (id: string) => {
    save({ ...store, savedQueries: store.savedQueries.filter(q => q.id !== id) })
  }

  const createPlaybook = () => {
    if (!newPlaybookName.trim()) return
    const p: Playbook = {
      id: makeId(),
      name: newPlaybookName.trim(),
      description: '',
      queries: [],
      role,
      createdAt: new Date().toISOString(),
    }
    save({ ...store, playbooks: [...store.playbooks, p] })
    setNewPlaybookName('')
  }

  const addQueryToPlaybook = (playbookId: string, queryText: string) => {
    save({
      ...store,
      playbooks: store.playbooks.map(p =>
        p.id === playbookId ? { ...p, queries: [...p.queries, queryText] } : p
      ),
    })
  }

  const myQueries = store.savedQueries.filter(q => q.role === role)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 440,
          background: '#111827',
          borderLeft: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>📋 Saved Queries & Playbooks</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}` }}>
          {(['saved', 'playbooks'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent',
                color: tab === t ? accent : COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'saved' ? 'Saved Queries' : 'Playbooks'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'saved' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveQuery() }}
                  placeholder="Save current query..."
                  style={{
                    flex: 1,
                    background: '#1a2332',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4,
                    color: COLORS.textPrimary,
                    padding: '7px 10px',
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                  }}
                />
                <button
                  onClick={saveQuery}
                  style={{
                    background: accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >Save</button>
              </div>
              {myQueries.length === 0 ? (
                <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', paddingTop: 20 }}>
                  No saved queries for this role yet.
                </div>
              ) : myQueries.map(q => (
                <div key={q.id} style={{
                  background: '#1a2332',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div
                    onClick={() => onSend(q.text)}
                    style={{ flex: 1, fontSize: 12, color: COLORS.textPrimary, cursor: 'pointer', lineHeight: 1.4 }}
                  >
                    {q.text}
                  </div>
                  <button
                    onClick={() => deleteQuery(q.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '2px 4px',
                    }}
                  >×</button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newPlaybookName}
                  onChange={e => setNewPlaybookName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createPlaybook() }}
                  placeholder="New playbook name..."
                  style={{
                    flex: 1,
                    background: '#1a2332',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4,
                    color: COLORS.textPrimary,
                    padding: '7px 10px',
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                  }}
                />
                <button
                  onClick={createPlaybook}
                  style={{
                    background: accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >Create</button>
              </div>
              {store.playbooks.length === 0 ? (
                <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', paddingTop: 20 }}>
                  No playbooks yet. Create one to group related queries.
                </div>
              ) : store.playbooks.map(pb => (
                <div key={pb.id} style={{
                  background: '#1a2332',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: accent, marginBottom: 6 }}>{pb.name}</div>
                  {pb.queries.length === 0 ? (
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>No queries yet.</div>
                  ) : pb.queries.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => onSend(q)}
                      style={{
                        fontSize: 12,
                        color: COLORS.textPrimary,
                        padding: '4px 0',
                        cursor: 'pointer',
                        borderBottom: i < pb.queries.length - 1 ? `1px solid ${COLORS.border}` : undefined,
                      }}
                    >
                      {i + 1}. {q}
                    </div>
                  ))}
                  {/* Add saved query to this playbook */}
                  {myQueries.length > 0 && (
                    <select
                      onChange={e => { if (e.target.value) { addQueryToPlaybook(pb.id, e.target.value); e.target.value = '' } }}
                      defaultValue=""
                      style={{
                        marginTop: 8,
                        width: '100%',
                        background: '#0a0f1a',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        color: COLORS.textMuted,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer',
                      }}
                    >
                      <option value="" disabled>+ Add saved query...</option>
                      {myQueries.map(q => (
                        <option key={q.id} value={q.text}>{q.text.slice(0, 50)}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
