import type {
  ConversationStore,
  PlaybookStore,
  AnalyticsStore,
  AnalyticsEvent,
  UserProfile,
  PlatformConfig,
  Notification,
} from '../types'

const NS = 'aec-hub'
const key = (k: string) => `${NS}:${k}`

function get<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(k))
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function set<T>(k: string, value: T): void {
  try {
    localStorage.setItem(key(k), JSON.stringify(value))
  } catch {
    // ignore (private browsing / storage full)
  }
}

// ── Conversations ──────────────────────────────────────────────────────────────

export function loadConversations(): ConversationStore {
  return get<ConversationStore>('conversations', {})
}

export function saveConversations(store: ConversationStore): void {
  // Trim each key to last 50 messages to cap storage size
  const trimmed: ConversationStore = {}
  for (const [k, msgs] of Object.entries(store)) {
    trimmed[k] = msgs.slice(-50)
  }
  set('conversations', trimmed)
}

// ── Playbooks ──────────────────────────────────────────────────────────────────

const DEFAULT_PLAYBOOKS: PlaybookStore = { playbooks: [], savedQueries: [] }

export function loadPlaybooks(): PlaybookStore {
  return get<PlaybookStore>('playbooks', DEFAULT_PLAYBOOKS)
}

export function savePlaybooks(store: PlaybookStore): void {
  set('playbooks', store)
}

// ── Analytics ─────────────────────────────────────────────────────────────────

const DEFAULT_ANALYTICS: AnalyticsStore = {
  events: [],
  lastReset: new Date().toISOString(),
}

export function loadAnalytics(): AnalyticsStore {
  return get<AnalyticsStore>('analytics', DEFAULT_ANALYTICS)
}

export function appendAnalyticsEvent(event: AnalyticsEvent): void {
  const store = loadAnalytics()
  const events = [...store.events, event]
  // Keep last 500 events
  set('analytics', { ...store, events: events.slice(-500) })
}

export function clearAnalytics(): void {
  set('analytics', { events: [], lastReset: new Date().toISOString() })
}

// ── Profile ───────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  initials: '',
  color: '#3b82f6',
}

export function loadProfile(): UserProfile {
  return get<UserProfile>('profile', DEFAULT_PROFILE)
}

export function saveProfile(profile: UserProfile): void {
  set('profile', profile)
}

// ── Platform Configs ──────────────────────────────────────────────────────────

export function loadPlatformConfigs(): Record<string, PlatformConfig> {
  return get<Record<string, PlatformConfig>>('platform-configs', {})
}

export function savePlatformConfigs(configs: Record<string, PlatformConfig>): void {
  set('platform-configs', configs)
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function loadNotifications(): Notification[] {
  return get<Notification[]>('notifications', [])
}

export function saveNotifications(notifications: Notification[]): void {
  // Keep last 100
  set('notifications', notifications.slice(-100))
}
