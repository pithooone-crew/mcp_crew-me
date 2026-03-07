import { useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { COLORS } from '../constants'

interface Props {
  content: string
  accent: string
}

// Parse flags like [ALERT], [OVERDUE], [OVER BUDGET], [NO COVERAGE]
function parseFlags(text: string): { text: string; flags: string[] } {
  const flags: string[] = []
  const flagRe = /\[(ALERT|OVERDUE|OVER BUDGET|NO COVERAGE)\]/g
  let match
  while ((match = flagRe.exec(text)) !== null) flags.push(match[1])
  const clean = text.replace(flagRe, '').trim()
  return { text: clean, flags }
}

function FlagBadge({ flag }: { flag: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      background: '#ef444422',
      border: '1px solid #ef4444',
      color: '#ef4444',
      borderRadius: 3,
      padding: '0 5px',
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "'IBM Plex Mono', monospace",
      letterSpacing: '0.05em',
      marginRight: 4,
      whiteSpace: 'nowrap',
    }}>
      ⚑ {flag}
    </span>
  )
}

type ParsedRow = Record<string, string | number | boolean>

function DataTable({ rows, accent }: { rows: ParsedRow[]; accent: string }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  if (!rows.length) return null
  const keys = Object.keys(rows[0]).filter(k => k !== 'alert')

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
        return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      })
    : rows

  const handleSort = (k: string) => {
    if (sortKey === k) setSortAsc(p => !p)
    else { setSortKey(k); setSortAsc(true) }
  }

  const formatCell = (val: string | number | boolean) => {
    if (typeof val === 'number') {
      if (Math.abs(val) > 1000) return `$${val.toLocaleString()}`
      if (Math.abs(val) < 1 && val !== 0) return `${(val * 100).toFixed(1)}%`
      return String(val)
    }
    return String(val)
  }

  const isCurrency = (k: string) => ['budget', 'actual', 'variance', 'amount', 'estimate', 'market_low', 'market_high', 'committed', 'projected_final'].includes(k)
  const isAlert = (row: ParsedRow) => row.alert === true || row.overdue === true || String(row.status ?? '').toLowerCase().includes('overdue')

  const exportCsv = useCallback(() => {
    const header = keys.join(',')
    const rowsCsv = sorted.map(r => keys.map(k => {
      const v = r[k]; return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v ?? '')
    }).join(',')).join('\n')
    const blob = new Blob([header + '\n' + rowsCsv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'export.csv'
    a.click()
  }, [sorted, keys])

  return (
    <div style={{ marginTop: 12, overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <button
          onClick={exportCsv}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted }}
        >
          Export CSV ↓
        </button>
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${accent}44` }}>
            {keys.map(k => (
              <th
                key={k}
                onClick={() => handleSort(k)}
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  color: accent,
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {k.replace(/_/g, ' ')} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => {
            const alertRow = isAlert(row)
            return (
              <tr
                key={ri}
                style={{
                  borderBottom: `1px solid ${COLORS.border}`,
                  background: alertRow ? 'rgba(239,68,68,0.06)' : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                {keys.map(k => {
                  const val = row[k]
                  const isNeg = typeof val === 'number' && val < 0
                  const isPos = typeof val === 'number' && val > 0 && isCurrency(k)
                  const colKey = k.toLowerCase()
                  let color = COLORS.textPrimary
                  if (colKey === 'status' && String(val).toLowerCase().includes('overdue')) color = '#ef4444'
                  else if (colKey === 'status' && String(val).toLowerCase().includes('on track')) color = '#10b981'
                  else if (isNeg && isCurrency(k)) color = '#ef4444'
                  else if (isPos && k === 'variance') color = '#10b981'

                  return (
                    <td key={k} style={{
                      padding: '6px 8px',
                      color,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}>
                      {alertRow && k === keys[0] && <span style={{ color: '#ef4444', marginRight: 4 }}>⚑</span>}
                      {isCurrency(k) && typeof val === 'number'
                        ? `$${Math.abs(val).toLocaleString()}${isNeg ? ' ▼' : ''}`
                        : formatCell(val)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BudgetChart({ rows, accent }: { rows: ParsedRow[]; accent: string }) {
  if (!rows.length || !('budget' in rows[0] || 'estimate' in rows[0])) return null
  const budgetKey = 'budget' in rows[0] ? 'budget' : 'estimate'
  const actualKey = 'actual' in rows[0] ? 'actual' : 'estimate'
  const labelKey = Object.keys(rows[0]).find(k => typeof rows[0][k] === 'string' && !['status', 'health', 'confidence'].includes(k)) ?? 'name'

  const data = rows.map(r => ({
    name: String(r[labelKey] ?? '').split(' - ').pop()?.slice(0, 12) ?? '',
    budget: (r[budgetKey] as number) / 1_000_000,
    actual: (r[actualKey] as number) / 1_000_000,
    over: (r[actualKey] as number) > (r[budgetKey] as number),
  }))

  return (
    <div style={{ marginTop: 16, height: 140 }}>
      <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>
        Budget vs Actual ($M)
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barGap={2} barCategoryGap="35%">
          <XAxis dataKey="name" tick={{ fill: COLORS.textMuted, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: COLORS.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `$${v}M`} />
          <Tooltip
            contentStyle={{ background: '#111827', border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            labelStyle={{ color: accent }}
            formatter={(value: number) => [`$${value.toFixed(2)}M`]}
          />
          <Bar dataKey="budget" name="Budget" fill={`${accent}55`} radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="Actual" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.over ? '#ef4444' : '#10b981'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function renderInline(text: string, accent: string) {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: accent }}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function renderMarkdown(content: string, accent: string): React.ReactNode[] {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let jsonBlock: string[] = []
  let inJson = false

  const flushJson = (key: number) => {
    if (!jsonBlock.length) return
    try {
      const parsed = JSON.parse(jsonBlock.join('\n'))
      if (Array.isArray(parsed) && parsed.length > 0) {
        elements.push(<DataTable key={`table-${key}`} rows={parsed as ParsedRow[]} accent={accent} />)
        elements.push(<BudgetChart key={`chart-${key}`} rows={parsed as ParsedRow[]} accent={accent} />)
      }
    } catch {
      elements.push(<pre key={`pre-${key}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted, overflowX: 'auto' }}>{jsonBlock.join('\n')}</pre>)
    }
    jsonBlock = []
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '```json') { inJson = true; jsonBlock = []; i++; continue }
    if (line.trim() === '```' && inJson) { inJson = false; flushJson(i); i++; continue }
    if (inJson) { jsonBlock.push(line); i++; continue }

    // Code block (non-json)
    if (line.trim().startsWith('```')) { i++; continue }

    // H2
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ color: accent, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", marginTop: 14, marginBottom: 4, letterSpacing: '0.05em' }}>{line.slice(3)}</h2>)
      i++; continue
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ color: accent, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", marginTop: 10, marginBottom: 3 }}>{line.slice(4)}</h3>)
      i++; continue
    }

    // Bullet
    if (line.match(/^[-*] /)) {
      const bulletContent = line.slice(2)
      const { flags } = parseFlags(bulletContent)
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
          <span style={{ color: accent, flexShrink: 0, marginTop: 2 }}>•</span>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            {flags.map(f => <FlagBadge key={f} flag={f} />)}
            {renderInline(bulletContent.replace(/\[(ALERT|OVERDUE|OVER BUDGET|NO COVERAGE)\]/g, '').trim(), accent)}
          </div>
        </div>
      )
      i++; continue
    }

    // Empty line
    if (!line.trim()) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue }

    // Normal paragraph
    const { text: cleanText, flags } = parseFlags(line)
    elements.push(
      <div key={i} style={{ fontSize: 13, lineHeight: 1.6, marginTop: 2 }}>
        {flags.map(f => <FlagBadge key={f} flag={f} />)}
        {renderInline(cleanText, accent)}
      </div>
    )
    i++
  }

  if (inJson) flushJson(lines.length)
  return elements
}

export default function MessageRenderer({ content, accent }: Props) {
  return <div>{renderMarkdown(content, accent)}</div>
}
