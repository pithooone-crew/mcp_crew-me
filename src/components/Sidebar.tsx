import type { Role, PlatformStatus, PlatformConfig } from '../types'
import { ROLE_CONFIGS, COLORS } from '../constants'

interface Props {
  role: Role
  platformStatus: Record<string, PlatformStatus>
  platformConfigs: Record<string, PlatformConfig>
  isDemo: boolean
  onConfigOpen: () => void
  accent: string
}

export default function Sidebar({ role, platformStatus, isDemo, onConfigOpen, accent }: Props) {
  const config = ROLE_CONFIGS[role]

  return (
    <div style={{
      width: 220,
      background: COLORS.bgPanel,
      borderRight: `1px solid ${COLORS.border}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Platform Status Header */}
      <div style={{
        padding: '14px 16px 8px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.textMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Platform Status
        </div>
      </div>

      {/* Platform Cards */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {config.platforms.map(platform => {
          const status = platformStatus[platform.id]
          const connected = !isDemo && status?.connected
          const offline = !connected

          return (
            <div
              key={platform.id}
              style={{
                background: COLORS.bgSecondary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '10px 12px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent + '66'}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{platform.icon}</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    letterSpacing: '0.03em',
                  }}>{platform.name}</span>
                </div>
                <div style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: connected ? '#10b981' : isDemo ? '#f59e0b' : '#ef4444',
                  boxShadow: connected ? '0 0 6px #10b981' : isDemo ? '0 0 6px #f59e0b' : 'none',
                  flexShrink: 0,
                }} />
              </div>

              <div style={{
                fontSize: 10,
                color: COLORS.textMuted,
                fontFamily: "'IBM Plex Mono', monospace",
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: connected ? '#10b981' : isDemo ? '#f59e0b' : '#ef4444' }}>
                  {connected ? 'Connected' : isDemo ? 'Demo' : 'Offline'}
                </span>
                <button
                  onClick={onConfigOpen}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: COLORS.textMuted,
                    cursor: 'pointer',
                    fontSize: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    padding: '1px 4px',
                    borderRadius: 3,
                    letterSpacing: '0.05em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = accent }}
                  onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted }}
                >
                  Config
                </button>
              </div>

              {isDemo && (
                <div style={{
                  marginTop: 3,
                  fontSize: 9,
                  color: COLORS.textMuted,
                  fontFamily: "'IBM Plex Mono', monospace",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {platform.url.replace('https://', '')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '8px 16px',
        borderTop: `1px solid ${COLORS.border}`,
        marginTop: 'auto',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.textMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Quick Actions
        </div>

        {[
          { icon: '⌘K', label: 'Command Palette' },
          { icon: '⌘1-4', label: 'Switch Role' },
          { icon: '⚙', label: 'Configure', onClick: onConfigOpen },
        ].map((action, i) => (
          <div
            key={i}
            onClick={action.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 0',
              cursor: action.onClick ? 'pointer' : 'default',
            }}
          >
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: accent,
              background: `${accent}15`,
              padding: '1px 5px',
              borderRadius: 3,
              minWidth: 32,
              textAlign: 'center',
            }}>{action.icon}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>{action.label}</span>
          </div>
        ))}
      </div>

      {/* Role Info */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${COLORS.border}`,
        background: `${accent}08`,
      }}>
        <div style={{
          fontSize: 11,
          color: accent,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          marginBottom: 4,
        }}>
          {ROLE_CONFIGS[role].icon} {ROLE_CONFIGS[role].label}
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.4 }}>
          {config.platforms.length} platforms · {config.promptSuggestions.length} quick queries
        </div>
      </div>
    </div>
  )
}
