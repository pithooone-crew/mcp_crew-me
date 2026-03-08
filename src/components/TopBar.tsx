import { useState } from 'react'
import type { Role, Project } from '../types'
import { ROLE_CONFIGS, ROLE_ACCENT, COLORS, PROJECTS } from '../constants'

interface Props {
  role: Role
  onRoleChange: (r: Role) => void
  project: Project
  onProjectChange: (p: Project) => void
  onConfigOpen: () => void
  onNotificationsOpen?: () => void
  onAnalyticsOpen?: () => void
  onPlaybooksOpen?: () => void
  onProfileOpen?: () => void
  notificationCount?: number
  accent: string
  isDemo: boolean
}

const ROLES = Object.values(ROLE_CONFIGS)

export default function TopBar({ role, onRoleChange, project, onProjectChange, onConfigOpen, onNotificationsOpen, onAnalyticsOpen, onPlaybooksOpen, onProfileOpen, notificationCount = 0, accent }: Props) {
  const [projectOpen, setProjectOpen] = useState(false)

  return (
    <div style={{
      background: COLORS.bgPanel,
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      height: 52,
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 20px',
        borderRight: `1px solid ${COLORS.border}`,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>🏗</span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: accent,
          letterSpacing: '0.05em',
        }}>AEC HUB</span>
      </div>

      {/* Role Tabs */}
      <div style={{ display: 'flex', height: '100%' }}>
        {ROLES.map(r => {
          const isActive = r.id === role
          const a = ROLE_ACCENT[r.id]
          return (
            <button
              key={r.id}
              onClick={() => onRoleChange(r.id)}
              title={`⌘${ROLES.indexOf(r) + 1}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${a}` : '2px solid transparent',
                color: isActive ? a : COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
                height: '100%',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Project Pill */}
      <div style={{ position: 'relative', marginRight: 12 }}>
        <button
          onClick={() => setProjectOpen(p => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: '4px 12px 4px 10px',
            color: COLORS.textPrimary,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <span style={{ color: accent, fontSize: 10 }}>◈</span>
          <span>{project.name}</span>
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>#{project.id}</span>
          <span style={{ color: COLORS.textMuted, fontSize: 10 }}>▾</span>
        </button>

        {projectOpen && (
          <div style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: '#111827',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            width: 220,
            zIndex: 100,
            overflow: 'hidden',
          }}>
            {PROJECTS.map(p => (
              <div
                key={p.id}
                onClick={() => { onProjectChange(p); setProjectOpen(false) }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: p.id === project.id ? accent : COLORS.textPrimary,
                  background: p.id === project.id ? `${accent}15` : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: p.isPortfolio ? `1px solid ${COLORS.border}` : undefined,
                }}
                onMouseEnter={e => { if (p.id !== project.id) e.currentTarget.style.background = '#1e2d40' }}
                onMouseLeave={e => { if (p.id !== project.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{p.isPortfolio ? '🗂 ' : ''}{p.name}</span>
                <span style={{ color: COLORS.textMuted }}>#{p.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kbd hint */}
      <div style={{
        color: COLORS.textMuted,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        marginRight: 12,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}>
        <kbd style={{ background: '#1e2d40', borderRadius: 3, padding: '2px 5px', fontSize: 10 }}>⌘K</kbd>
        <span>palette</span>
      </div>

      {/* Playbooks button */}
      {onPlaybooksOpen && (
        <button
          onClick={onPlaybooksOpen}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textMuted,
            cursor: 'pointer',
            padding: '6px 10px',
            marginRight: 6,
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent }}
          onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border }}
          title="Saved Queries & Playbooks"
        >
          📋
        </button>
      )}

      {/* Analytics button */}
      {onAnalyticsOpen && (
        <button
          onClick={onAnalyticsOpen}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textMuted,
            cursor: 'pointer',
            padding: '6px 10px',
            marginRight: 6,
            fontSize: 13,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent }}
          onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border }}
          title="Usage Analytics"
        >
          📊
        </button>
      )}

      {/* Notification Bell */}
      {onNotificationsOpen && (
        <button
          onClick={onNotificationsOpen}
          style={{
            background: 'transparent',
            border: `1px solid ${notificationCount > 0 ? accent : COLORS.border}`,
            borderRadius: 6,
            color: notificationCount > 0 ? accent : COLORS.textMuted,
            cursor: 'pointer',
            padding: '6px 10px',
            marginRight: 6,
            fontSize: 13,
            position: 'relative',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          title={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
        >
          🔔
          {notificationCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -5,
              right: -5,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 16,
              height: 16,
              fontSize: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      )}

      {/* Profile button */}
      {onProfileOpen && (
        <button
          onClick={onProfileOpen}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textMuted,
            cursor: 'pointer',
            padding: '6px 10px',
            marginRight: 6,
            fontSize: 13,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent }}
          onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border }}
          title="Profile"
        >
          👤
        </button>
      )}

      {/* Config button */}
      <button
        onClick={onConfigOpen}
        style={{
          background: 'transparent',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          color: COLORS.textMuted,
          cursor: 'pointer',
          padding: '6px 10px',
          marginRight: 16,
          fontSize: 14,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent }}
        onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border }}
        title="Configure Integrations"
      >
        ⚙
      </button>
    </div>
  )
}
