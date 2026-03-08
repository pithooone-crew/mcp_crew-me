import { useState } from 'react'
import type { UserProfile } from '../types'
import { COLORS } from '../constants'
import { loadProfile, saveProfile } from '../lib/storage'

interface Props {
  onClose: () => void
  accent: string
}

const ACCENT_OPTIONS = [
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Green', value: '#10b981' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Pink', value: '#ec4899' },
]

export default function ProfilePanel({ onClose, accent }: Props) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveProfile(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const initials = profile.initials || profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 380,
          background: '#111827',
          borderLeft: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>👤 Profile</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Avatar preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: profile.color || accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace",
              border: `3px solid ${profile.color || accent}66`,
            }}>
              {initials}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 6 }}>
                DISPLAY NAME
              </label>
              <input
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
                style={{
                  width: '100%',
                  background: '#1a2332',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  color: COLORS.textPrimary,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 6 }}>
                INITIALS (shown in avatar)
              </label>
              <input
                value={profile.initials}
                onChange={e => setProfile(p => ({ ...p, initials: e.target.value.slice(0, 2).toUpperCase() }))}
                placeholder="AB"
                maxLength={2}
                style={{
                  width: '100%',
                  background: '#1a2332',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  color: COLORS.textPrimary,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace",
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '0.1em',
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 6 }}>
                EMAIL (optional)
              </label>
              <input
                value={profile.email ?? ''}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                type="email"
                style={{
                  width: '100%',
                  background: '#1a2332',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  color: COLORS.textPrimary,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 8 }}>
                AVATAR COLOR
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ACCENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setProfile(p => ({ ...p, color: opt.value }))}
                    title={opt.label}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: opt.value,
                      border: profile.color === opt.value ? `3px solid #fff` : '3px solid transparent',
                      cursor: 'pointer',
                      boxShadow: profile.color === opt.value ? `0 0 0 2px ${opt.value}` : 'none',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Storage info */}
          <div style={{
            marginTop: 32,
            padding: 14,
            background: '#1a2332',
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Local Storage
            </div>
            <div style={{ fontSize: 12, color: COLORS.textPrimary, lineHeight: 1.6 }}>
              All data is stored locally in your browser — conversations, settings, playbooks, and notifications. Nothing is sent to any server except your AI queries.
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}` }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%',
              background: saved ? '#10b981' : accent,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
            }}
          >
            {saved ? '✓ Profile Saved' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
