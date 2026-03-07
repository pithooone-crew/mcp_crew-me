import { useState, useRef, useEffect } from 'react'
import type { Role, Message, Project } from '../types'
import { ROLE_CONFIGS, COLORS } from '../constants'
import MessageRenderer from './MessageRenderer'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  role: Role
  messages: Message[]
  isLoading: boolean
  onSend: (msg: string) => void
  onClearChat: () => void
  accent: string
  project: Project
}

function PromptChips({ suggestions, onSelect, accent }: { suggestions: string[]; onSelect: (s: string) => void; accent: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      padding: '10px 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      flexShrink: 0,
    }}
    className="no-scrollbar"
    >
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          title={s}
          style={{
            background: 'transparent',
            border: `1px solid ${accent}44`,
            borderRadius: 20,
            padding: '4px 12px',
            color: accent,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${accent}18`; e.currentTarget.style.borderColor = accent }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${accent}44` }}
        >
          {s.length > 40 ? s.slice(0, 40) + '…' : s}
        </button>
      ))}
    </div>
  )
}

function UserBubble({ message, accent }: { message: Message; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          background: `${accent}18`,
          border: `1px solid ${accent}44`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: '8px 8px 2px 8px',
          padding: '10px 14px',
          fontSize: 13,
          color: COLORS.textPrimary,
          lineHeight: 1.5,
        }}>
          {message.content}
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}

function AssistantBubble({ message, accent }: { message: Message; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
      <div style={{ maxWidth: '90%', width: '100%' }}>
        <div style={{
          background: COLORS.bgSecondary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '2px 8px 8px 8px',
          padding: '14px 16px',
          fontSize: 13,
          color: COLORS.textPrimary,
          lineHeight: 1.6,
          position: 'relative',
        }}>
          {message.isMultiSource && (
            <span style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: `${accent}22`,
              border: `1px solid ${accent}66`,
              borderRadius: 3,
              padding: '1px 6px',
              fontSize: 9,
              color: accent,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}>
              MULTI-SOURCE
            </span>
          )}
          <MessageRenderer content={message.content} accent={accent} />
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
          AI · {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <span style={{ marginLeft: 8, color: accent }}>
              via {message.toolCalls.map(t => t.platform).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingBubble({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
      <div style={{
        background: COLORS.bgSecondary,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '2px 8px 8px 8px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: accent,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          Querying MCP servers…
        </span>
      </div>
    </div>
  )
}

function WelcomeScreen({ role, accent }: { role: Role; accent: string }) {
  const config = ROLE_CONFIGS[role]
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>{config.icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: accent, marginBottom: 8 }}>
          {config.label} AI
        </div>
        <div style={{ fontSize: 14, color: COLORS.textMuted, maxWidth: 400, lineHeight: 1.6 }}>
          Connected to {config.platforms.map(p => p.name).join(', ')}. Ask anything about your projects, or select a quick query above.
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 500,
      }}>
        {config.platforms.map(p => (
          <span
            key={p.id}
            style={{
              background: `${p.color}15`,
              border: `1px solid ${p.color}44`,
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 11,
              color: p.color,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {p.icon} {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ChatArea({ role, messages, isLoading, onSend, onClearChat, accent, project }: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const config = ROLE_CONFIGS[role]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChipSelect = (suggestion: string) => {
    onSend(suggestion)
  }

  const handleTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: `1px solid ${COLORS.border}`,
    }}>
      {/* Prompt Chips */}
      <PromptChips suggestions={config.promptSuggestions} onSelect={handleChipSelect} accent={accent} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {messages.length === 0 ? (
          <WelcomeScreen role={role} accent={accent} />
        ) : (
          <>
            {messages.map(msg =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} message={msg} accent={accent} />
                : <AssistantBubble key={msg.id} message={msg} accent={accent} />
            )}
            {isLoading && <LoadingBubble accent={accent} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: '12px 16px',
        background: COLORS.bgPanel,
        flexShrink: 0,
      }}>
        {/* Project context indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11,
            color: COLORS.textMuted,
            fontFamily: "'IBM Plex Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ color: accent }}>◈</span>
            Context: {project.name} #{project.id} · {config.platforms.length} platforms
          </span>
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
            >
              Clear Chat ✕
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            placeholder={`Ask ${config.label} AI anything… (Enter to send, Shift+Enter for newline)`}
            rows={1}
            style={{
              flex: 1,
              background: COLORS.bgSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: '10px 14px',
              color: COLORS.textPrimary,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.15s',
              lineHeight: 1.5,
              minHeight: 40,
            }}
            onFocus={e => e.target.style.borderColor = accent}
            onBlur={e => e.target.style.borderColor = COLORS.border}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              background: accent,
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              color: '#0a0f1a',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !isLoading ? 1 : 0.5,
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
              transition: 'opacity 0.15s',
              height: 40,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isLoading ? '⏳' : '↑'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>
          ⌘K command palette · ⌘1-4 switch role · Enter to send
        </div>
      </div>
    </div>
  )
}
