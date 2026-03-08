import { useState, useRef, useEffect, useCallback } from 'react'
import type { Role, Message, Project, UploadedFile } from '../types'
import { ROLE_CONFIGS, COLORS } from '../constants'
import MessageRenderer from './MessageRenderer'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  role: Role
  messages: Message[]
  isLoading: boolean
  onSend: (msg: string, files?: UploadedFile[]) => void
  onClearChat: () => void
  accent: string
  project: Project
  onSaveQuery?: (text: string) => void
}

// ── Prompt Chips ────────────────────────────────────────────────────────────────

function PromptChips({ suggestions, onSelect, accent }: { suggestions: string[]; onSelect: (s: string) => void; accent: string }) {
  return (
    <div
      style={{
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

// ── Message action buttons ──────────────────────────────────────────────────────

function MessageActions({ message, accent, onSaveQuery }: { message: Message; accent: string; onSaveQuery?: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>AEC Hub Report</title>
      <style>
        body { font-family: 'DM Sans', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; }
        pre, code { font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 2px; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f0f0f0; font-weight: 600; }
        h1,h2,h3 { color: #1a1a2e; }
        .header { border-bottom: 2px solid #333; margin-bottom: 24px; padding-bottom: 12px; }
      </style></head><body>
      <div class="header"><h2>AEC Integration Hub — Report</h2><p style="color:#666;font-size:12px">${new Date().toLocaleString()}</p></div>
      <div>${message.content.replace(/```json([\s\S]*?)```/g, '<pre>$1</pre>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const handleSave = () => {
    if (onSaveQuery) {
      onSaveQuery(message.content.slice(0, 100))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4, opacity: 0.7 }}>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        style={{
          background: 'transparent',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          color: copied ? accent : COLORS.textMuted,
          cursor: 'pointer',
          fontSize: 10,
          padding: '2px 8px',
          fontFamily: "'IBM Plex Mono', monospace",
          transition: 'all 0.15s',
        }}
      >
        {copied ? '✓ Copied' : '⎘ Copy'}
      </button>
      <button
        onClick={handlePrint}
        title="Export as report (print)"
        style={{
          background: 'transparent',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          color: COLORS.textMuted,
          cursor: 'pointer',
          fontSize: 10,
          padding: '2px 8px',
          fontFamily: "'IBM Plex Mono', monospace",
          transition: 'all 0.15s',
        }}
      >
        ⎙ Report
      </button>
      {onSaveQuery && (
        <button
          onClick={handleSave}
          title="Save to playbook"
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 4,
            color: saved ? accent : COLORS.textMuted,
            cursor: 'pointer',
            fontSize: 10,
            padding: '2px 8px',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'all 0.15s',
          }}
        >
          {saved ? '✓ Saved' : '⊕ Save'}
        </button>
      )}
    </div>
  )
}

// ── Bubbles ─────────────────────────────────────────────────────────────────────

function UserBubble({ message, accent }: { message: Message; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{ maxWidth: '70%' }}>
        {message.toolCalls?.filter(t => t.status === 'pending').length ? null : null}
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

function AssistantBubble({ message, accent, onSaveQuery }: { message: Message; accent: string; onSaveQuery?: (text: string) => void }) {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
            AI · {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <span style={{ marginLeft: 8, color: accent }}>
                via {message.toolCalls.map(t => t.platform).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </span>
            )}
          </div>
          <MessageActions message={message} accent={accent} onSaveQuery={onSaveQuery} />
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

// ── File preview bar ────────────────────────────────────────────────────────────

function FilePreviewBar({ files, onRemove, accent }: { files: UploadedFile[]; onRemove: (i: number) => void; accent: string }) {
  if (files.length === 0) return null
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '6px 16px',
      flexWrap: 'wrap',
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      {files.map((f, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: `${accent}18`,
          border: `1px solid ${accent}44`,
          borderRadius: 4,
          padding: '3px 8px',
          fontSize: 11,
          color: accent,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <span>{f.type.startsWith('image') ? '🖼' : '📄'}</span>
          <span>{f.name.slice(0, 20)}{f.name.length > 20 ? '…' : ''}</span>
          <button
            onClick={() => onRemove(i)}
            style={{
              background: 'transparent',
              border: 'none',
              color: accent,
              cursor: 'pointer',
              fontSize: 12,
              padding: '0 2px',
              lineHeight: 1,
            }}
          >×</button>
        </div>
      ))}
    </div>
  )
}

// ── Main ChatArea ───────────────────────────────────────────────────────────────

export default function ChatArea({ role, messages, isLoading, onSend, onClearChat, accent, project, onSaveQuery }: Props) {
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const config = ROLE_CONFIGS[role]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    onSend(input, attachedFiles.length > 0 ? attachedFiles : undefined)
    setInput('')
    setAttachedFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, onSend, attachedFiles])

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

  // File upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const uploaded: UploadedFile[] = await Promise.all(
      files.map(async f => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(f)
        })
        const mediaType = f.type as UploadedFile['mediaType']
        return { name: f.name, type: f.type, base64, mediaType }
      })
    )
    setAttachedFiles(prev => [...prev, ...uploaded])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Voice input
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  const supportsVoice = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )

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
                : <AssistantBubble key={msg.id} message={msg} accent={accent} onSaveQuery={onSaveQuery} />
            )}
            {isLoading && <LoadingBubble accent={accent} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.bgPanel,
        flexShrink: 0,
      }}>
        {/* File preview */}
        <FilePreviewBar
          files={attachedFiles}
          onRemove={i => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
          accent={accent}
        />

        <div style={{ padding: '12px 16px' }}>
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
              Context: {project.name} #{project.id} · {config.platforms.length} platform{config.platforms.length !== 1 ? 's' : ''}
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach drawing, photo, or PDF"
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                color: attachedFiles.length > 0 ? accent : COLORS.textMuted,
                cursor: 'pointer',
                fontSize: 15,
                height: 40,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = attachedFiles.length > 0 ? accent : COLORS.textMuted }}
            >
              📎
              {attachedFiles.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: accent,
                  color: '#fff',
                  borderRadius: '50%',
                  width: 14,
                  height: 14,
                  fontSize: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>{attachedFiles.length}</span>
              )}
            </button>

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

            {/* Voice button */}
            {supportsVoice && (
              <button
                onClick={toggleVoice}
                title={isListening ? 'Stop listening' : 'Voice input'}
                style={{
                  background: isListening ? `${accent}22` : 'transparent',
                  border: `1px solid ${isListening ? accent : COLORS.border}`,
                  borderRadius: 6,
                  color: isListening ? accent : COLORS.textMuted,
                  cursor: 'pointer',
                  fontSize: 15,
                  height: 40,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                  animation: isListening ? 'pulse 1s ease-in-out infinite' : undefined,
                }}
              >
                🎤
              </button>
            )}

            {/* Send button */}
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
            ⌘K command palette · ⌘1-5 switch role · Enter to send{supportsVoice ? ' · 🎤 voice input' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
