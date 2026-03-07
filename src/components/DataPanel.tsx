import type { Role, ToolCall } from '../types'
import { ROLE_CONFIGS, COLORS } from '../constants'

interface Props {
  toolCalls: ToolCall[]
  role: Role
  accent: string
  isLoading: boolean
}

function ToolCallCard({ call, accent }: { call: ToolCall; accent: string }) {
  const platformColor: Record<string, string> = {
    procore: '#f59e0b',
    'autodesk-acc': '#3b82f6',
    'primavera-p6': '#8b5cf6',
    'autodesk-aps': '#60a5fa',
    bluebeam: '#0ea5e9',
    'oracle-aconex': '#8b5cf6',
    'cmic-erp': '#a78bfa',
    'stack-ct': '#10b981',
    'building-connected': '#34d399',
    'sage-estimating': '#6ee7b7',
  }

  const color = platformColor[call.platform] ?? accent
  const statusIcon = call.status === 'success' ? '✓' : call.status === 'error' ? '✗' : '⟳'
  const statusColor = call.status === 'success' ? '#10b981' : call.status === 'error' ? '#ef4444' : '#f59e0b'

  const params = Object.entries(call.params).slice(0, 3)

  return (
    <div style={{
      background: COLORS.bgSecondary,
      border: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: 12,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🔧</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color,
            }}>
              {call.platform}
            </span>
            <span style={{ color: COLORS.textMuted, fontSize: 11 }}>→</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: COLORS.textPrimary,
              fontWeight: 500,
            }}>
              {call.tool}
            </span>
          </div>
        </div>
        <span style={{
          color: statusColor,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {statusIcon}
        </span>
      </div>

      {/* Params */}
      <div style={{
        background: COLORS.bgPanel,
        borderRadius: 4,
        padding: '6px 8px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        color: COLORS.textMuted,
        marginBottom: 6,
        lineHeight: 1.6,
      }}>
        {params.map(([k, v]) => (
          <div key={k}>
            <span style={{ color: color + 'cc' }}>{k}</span>
            <span style={{ color: COLORS.textMuted }}>: </span>
            <span style={{ color: COLORS.textPrimary }}>{JSON.stringify(v)}</span>
          </div>
        ))}
      </div>

      {/* Result */}
      {call.result && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#10b981', fontFamily: "'IBM Plex Mono', monospace" }}>
            {statusIcon} {call.result}
          </span>
          {call.durationMs && (
            <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
              {call.durationMs}ms
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingToolCard({ accent }: { accent: string }) {
  return (
    <div style={{
      background: COLORS.bgSecondary,
      border: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 6,
      padding: 12,
      marginBottom: 8,
      opacity: 0.6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, animation: 'pulse 1s ease infinite' }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>
          Calling MCP server…
        </span>
      </div>
    </div>
  )
}

export default function DataPanel({ toolCalls, role, accent, isLoading }: Props) {
  const config = ROLE_CONFIGS[role]

  return (
    <div style={{
      width: 260,
      background: COLORS.bgPanel,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.textMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Tool Call Visualizer
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted }}>
          {toolCalls.length > 0
            ? `${toolCalls.length} MCP call${toolCalls.length > 1 ? 's' : ''} made`
            : 'MCP calls will appear here'}
        </div>
      </div>

      {/* Tool Calls */}
      <div style={{ padding: '12px 12px', flex: 1 }}>
        {isLoading && <LoadingToolCard accent={accent} />}
        {toolCalls.length === 0 && !isLoading && (
          <div style={{
            textAlign: 'center',
            color: COLORS.textMuted,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '32px 16px',
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🔌</div>
            <div>Send a query to see MCP tool invocations</div>
            <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6 }}>
              Tool calls show platform, method, params, and response times
            </div>
          </div>
        )}
        {toolCalls.map(call => (
          <ToolCallCard key={call.id} call={call} accent={accent} />
        ))}
      </div>

      {/* Platform legend */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 14px',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: COLORS.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Active Platforms
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {config.platforms.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: COLORS.textMuted }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {toolCalls.length > 0 && (
        <div style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: '10px 14px',
          background: `${accent}08`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {[
              { label: 'Calls', value: toolCalls.length },
              { label: 'Success', value: toolCalls.filter(t => t.status === 'success').length },
              { label: 'Avg ms', value: Math.round(toolCalls.reduce((s, t) => s + (t.durationMs ?? 0), 0) / toolCalls.length) },
              { label: 'Sources', value: new Set(toolCalls.map(t => t.platform)).size },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 16, fontWeight: 700, color: accent, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
