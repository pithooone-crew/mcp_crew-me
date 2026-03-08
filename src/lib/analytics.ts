import type { AnalyticsStore, AnalyticsEvent, Role, ToolCall } from '../types'
import { appendAnalyticsEvent } from './storage'

export function recordQuery(
  role: Role,
  projectId: string,
  toolCalls: ToolCall[],
  isDemo: boolean,
  queryLength: number,
): void {
  const event: AnalyticsEvent = {
    timestamp: new Date().toISOString(),
    role,
    projectId,
    queryLength,
    platformsInvoked: [...new Set(toolCalls.map(t => t.platform))],
    toolCount: toolCalls.length,
    isDemo,
  }
  appendAnalyticsEvent(event)
}

export interface AnalyticsSummary {
  totalQueries: number
  byRole: Record<string, number>
  byPlatform: Record<string, number>
  avgToolCount: number
  dailyCounts: Array<{ date: string; count: number }>
  demoVsLive: { demo: number; live: number }
}

export function getAnalyticsSummary(store: AnalyticsStore): AnalyticsSummary {
  const { events } = store
  if (events.length === 0) {
    return {
      totalQueries: 0,
      byRole: {},
      byPlatform: {},
      avgToolCount: 0,
      dailyCounts: [],
      demoVsLive: { demo: 0, live: 0 },
    }
  }

  const byRole: Record<string, number> = {}
  const byPlatform: Record<string, number> = {}
  const dailyMap: Record<string, number> = {}
  let totalTools = 0
  let demoCount = 0

  for (const e of events) {
    byRole[e.role] = (byRole[e.role] ?? 0) + 1
    for (const p of e.platformsInvoked) {
      byPlatform[p] = (byPlatform[p] ?? 0) + 1
    }
    totalTools += e.toolCount
    if (e.isDemo) demoCount++
    const date = e.timestamp.slice(0, 10) // YYYY-MM-DD
    dailyMap[date] = (dailyMap[date] ?? 0) + 1
  }

  const dailyCounts = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // last 14 days
    .map(([date, count]) => ({ date, count }))

  return {
    totalQueries: events.length,
    byRole,
    byPlatform,
    avgToolCount: Math.round((totalTools / events.length) * 10) / 10,
    dailyCounts,
    demoVsLive: { demo: demoCount, live: events.length - demoCount },
  }
}
