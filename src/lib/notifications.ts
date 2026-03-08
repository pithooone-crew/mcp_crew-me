import type { Message, Notification, Role } from '../types'

const FLAG_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /\[ALERT\]/g, flag: 'ALERT' },
  { pattern: /\[OVERDUE\]/g, flag: 'OVERDUE' },
  { pattern: /\[OVER BUDGET\]/g, flag: 'OVER BUDGET' },
  { pattern: /\[NO COVERAGE\]/g, flag: 'NO COVERAGE' },
]

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function extractNotifications(
  message: Message,
  role: Role,
  projectId: string,
): Notification[] {
  const notifications: Notification[] = []
  const lines = message.content.split('\n')

  for (const line of lines) {
    for (const { pattern, flag } of FLAG_PATTERNS) {
      if (pattern.test(line)) {
        const excerpt = line.replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim().slice(0, 80)
        notifications.push({
          id: makeId(),
          messageId: message.id,
          flag,
          excerpt: excerpt || line.slice(0, 80),
          role,
          projectId,
          timestamp: new Date().toISOString(),
          read: false,
        })
        // Reset regex lastIndex
        pattern.lastIndex = 0
        break
      }
      pattern.lastIndex = 0
    }
  }

  return notifications
}
