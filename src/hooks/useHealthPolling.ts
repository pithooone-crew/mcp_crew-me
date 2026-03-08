import { useState, useEffect, useRef, useCallback } from 'react'
import type { PlatformStatus } from '../types'

interface PlatformEndpoint {
  id: string
  healthUrl: string // e.g. http://localhost:3001/health
}

function getHealthUrl(mcpUrl: string): string {
  // MCP URL is like http://localhost:3001/sse — convert to /health
  return mcpUrl.replace(/\/sse$/, '/health').replace(/\/mcp$/, '/health')
}

export function useHealthPolling(
  platforms: PlatformEndpoint[],
  intervalMs = 30_000,
): Record<string, PlatformStatus> {
  const [statuses, setStatuses] = useState<Record<string, PlatformStatus>>({})
  const activeRef = useRef(true)

  const checkAll = useCallback(async () => {
    if (!activeRef.current) return
    const results: Record<string, PlatformStatus> = {}
    await Promise.all(
      platforms.map(async ({ id, healthUrl }) => {
        const start = Date.now()
        try {
          const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
          const latencyMs = Date.now() - start
          results[id] = {
            id,
            connected: res.ok,
            latencyMs,
            lastChecked: new Date().toISOString(),
            lastSync: new Date().toISOString(),
          }
        } catch {
          results[id] = {
            id,
            connected: false,
            latencyMs: undefined,
            lastChecked: new Date().toISOString(),
          }
        }
      })
    )
    if (activeRef.current) setStatuses(results)
  }, [platforms])

  useEffect(() => {
    activeRef.current = true
    checkAll()
    const timer = setInterval(checkAll, intervalMs)
    return () => {
      activeRef.current = false
      clearInterval(timer)
    }
  }, [checkAll, intervalMs])

  return statuses
}

export { getHealthUrl }
