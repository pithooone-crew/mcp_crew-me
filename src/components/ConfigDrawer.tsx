import { useState } from 'react'
import type { Role, PlatformConfig } from '../types'
import { ROLE_CONFIGS, COLORS } from '../constants'

interface Props {
  apiKey: string
  onApiKeyChange: (k: string) => void
  isDemo: boolean
  onDemoToggle: (v: boolean) => void
  platformConfigs: Record<string, PlatformConfig>
  onPlatformConfigChange: (c: Record<string, PlatformConfig>) => void
  role: Role
  onClose: () => void
  accent: string
}

function TestResult({ status }: { status: 'idle' | 'testing' | 'ok' | 'fail' }) {
  if (status === 'idle') return null
  if (status === 'testing') return <span style={{ color: '#f59e0b', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>Testing…</span>
  if (status === 'ok') return <span style={{ color: '#10b981', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>✓ Connected</span>
  return <span style={{ color: '#ef4444', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>✗ Failed</span>
}

function PlatformSection({
  platformId,
  platformName,
  config,
  onChange,
  accent,
}: {
  platformId: string
  platformName: string
  config: PlatformConfig
  onChange: (c: Partial<PlatformConfig>) => void
  accent: string
}) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [showToken, setShowToken] = useState(false)

  const handleTest = async () => {
    if (!config.url) { setTestStatus('fail'); return }
    setTestStatus('testing')
    try {
      const healthUrl = config.url.replace(/\/sse$/, '') + '/health'
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(4000) })
      setTestStatus(res.ok ? 'ok' : 'fail')
    } catch {
      setTestStatus('fail')
    }
  }

  const inputStyle = {
    width: '100%',
    background: COLORS.bgPrimary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '7px 10px',
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{
      background: COLORS.bgSecondary,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      padding: 14,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textPrimary }}>{platformName}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>Enabled</span>
          <div
            onClick={() => onChange({ enabled: !config.enabled })}
            style={{
              width: 32,
              height: 18,
              borderRadius: 9,
              background: config.enabled ? accent : COLORS.border,
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 2,
              left: config.enabled ? 16 : 2,
              transition: 'left 0.2s',
            }} />
          </div>
        </label>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label style={labelStyle}>MCP Server URL</label>
          <input
            style={inputStyle}
            value={config.url}
            onChange={e => onChange({ url: e.target.value })}
            placeholder="https://example.mcp.example.com/sse"
          />
        </div>
        <div>
          <label style={labelStyle}>Project ID</label>
          <input
            style={inputStyle}
            value={config.projectId}
            onChange={e => onChange({ projectId: e.target.value })}
            placeholder="Your project identifier"
          />
        </div>
        <div>
          <label style={labelStyle}>Auth Token</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 60 }}
              type={showToken ? 'text' : 'password'}
              value={config.token}
              onChange={e => onChange({ token: e.target.value })}
              placeholder="Bearer token or API key"
            />
            <button
              onClick={() => setShowToken(p => !p)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {showToken ? 'hide' : 'show'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          onClick={handleTest}
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}66`,
            borderRadius: 4,
            padding: '5px 12px',
            color: accent,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
          onMouseEnter={e => e.currentTarget.style.background = `${accent}35`}
          onMouseLeave={e => e.currentTarget.style.background = `${accent}22`}
        >
          Test Connection
        </button>
        <TestResult status={testStatus} />
      </div>
    </div>
  )
}

export default function ConfigDrawer({
  apiKey,
  onApiKeyChange,
  isDemo,
  onDemoToggle,
  platformConfigs,
  onPlatformConfigChange,
  role,
  onClose,
  accent,
}: Props) {
  const config = ROLE_CONFIGS[role]
  const [activeTab, setActiveTab] = useState<'general' | 'platforms'>('general')

  const updatePlatform = (platformId: string, updates: Partial<PlatformConfig>) => {
    const current = platformConfigs[platformId] ?? {
      url: config.platforms.find(p => p.id === platformId)?.url ?? '',
      projectId: '',
      token: '',
      enabled: true,
    }
    onPlatformConfigChange({ ...platformConfigs, [platformId]: { ...current, ...updates } })
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
    color: active ? accent : COLORS.textMuted,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: active ? 600 : 400,
  })

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 150,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: COLORS.bgPanel,
        borderLeft: `1px solid ${COLORS.border}`,
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
              ⚙ Integration Settings
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              {config.label} · {config.platforms.length} platforms
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.textMuted,
              cursor: 'pointer',
              fontSize: 16,
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}` }}>
          <button style={tabStyle(activeTab === 'general')} onClick={() => setActiveTab('general')}>General</button>
          <button style={tabStyle(activeTab === 'platforms')} onClick={() => setActiveTab('platforms')}>Platforms</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Demo Mode Toggle */}
              <div style={{
                background: COLORS.bgSecondary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Demo Mode</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>
                      Use simulated data with no live MCP connections
                    </div>
                  </div>
                  <div
                    onClick={() => onDemoToggle(!isDemo)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: isDemo ? '#f59e0b' : COLORS.border,
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 2,
                      left: isDemo ? 20 : 2,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              </div>

              {/* API Key */}
              {!isDemo && (
                <div style={{
                  background: COLORS.bgSecondary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: 16,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Anthropic API Key</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, lineHeight: 1.4 }}>
                    Required for live Claude AI queries with MCP server integration
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => onApiKeyChange(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    style={{
                      width: '100%',
                      background: COLORS.bgPrimary,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 4,
                      padding: '8px 12px',
                      color: COLORS.textPrimary,
                      fontSize: 12,
                      fontFamily: "'IBM Plex Mono', monospace",
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = accent}
                    onBlur={e => e.target.style.borderColor = COLORS.border}
                  />
                  {apiKey && (
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                      ✓ API key configured
                    </div>
                  )}
                </div>
              )}

              {/* Model Info */}
              <div style={{
                background: `${accent}08`,
                border: `1px solid ${accent}33`,
                borderRadius: 6,
                padding: 14,
              }}>
                <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: accent, fontWeight: 600, marginBottom: 6 }}>
                  AI Model Configuration
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6 }}>
                  <div>Model: claude-opus-4-6</div>
                  <div>Thinking: adaptive</div>
                  <div>Max tokens: 4,096</div>
                  <div>MCP beta: mcp-client-2025-04-04</div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div style={{
                background: COLORS.bgSecondary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 14,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Keyboard Shortcuts</div>
                {[
                  ['⌘K', 'Open command palette'],
                  ['⌘1', 'General Contractor'],
                  ['⌘2', 'Architect / Engineer'],
                  ['⌘3', 'Owner / Developer'],
                  ['⌘4', 'Preconstruction'],
                  ['Enter', 'Send message'],
                  ['Shift+Enter', 'New line'],
                  ['Esc', 'Close palette'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
                    <span style={{ color: COLORS.textMuted }}>{desc}</span>
                    <kbd style={{
                      background: COLORS.bgPrimary,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 3,
                      padding: '1px 6px',
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: accent,
                    }}>{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
                Configure MCP server endpoints for {config.label}. Each platform requires a server URL and authentication token.
              </div>
              {config.platforms.map(platform => {
                const pConfig = platformConfigs[platform.id] ?? {
                  url: platform.url,
                  projectId: '',
                  token: '',
                  enabled: true,
                }
                return (
                  <PlatformSection
                    key={platform.id}
                    platformId={platform.id}
                    platformName={platform.name}
                    config={pConfig}
                    onChange={updates => updatePlatform(platform.id, updates)}
                    accent={platform.color}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              background: COLORS.bgSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: '8px 16px',
              color: COLORS.textPrimary,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            style={{
              background: accent,
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              color: '#0a0f1a',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Save & Close
          </button>
        </div>
      </div>
    </>
  )
}
