import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { createSseServer, ok, fail } from './shared/base.js'

const PORT        = 3001
const BASE        = process.env.PROCORE_BASE_URL    ?? 'https://sandbox.procore.com'
const CLIENT_ID   = process.env.PROCORE_CLIENT_ID   ?? ''
const CLIENT_SECRET = process.env.PROCORE_CLIENT_SECRET ?? ''
const COMPANY_ID  = process.env.PROCORE_COMPANY_ID  ?? ''
const REDIRECT_URI = `http://localhost:${PORT}/auth/callback`
const TOKEN_FILE  = path.resolve(process.cwd(), '.procore-token.json')

// ── Token store ───────────────────────────────────────────────────────────────

interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: number   // Unix ms
}

let tokenData: TokenData | null = null

function loadToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')) as TokenData
      console.log('🔑 [procore] Loaded saved token (expires', new Date(tokenData.expires_at).toLocaleTimeString(), ')')
    }
  } catch { /* ignore */ }
}

function saveToken(data: TokenData) {
  tokenData = data
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2)) } catch { /* ignore */ }
}

function clearToken() {
  tokenData = null
  try { fs.unlinkSync(TOKEN_FILE) } catch { /* ignore */ }
}

function isExpired() {
  return !tokenData || Date.now() > tokenData.expires_at - 30_000
}

loadToken()

// ── OAuth helpers ─────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  if (!tokenData?.refresh_token) return false
  try {
    const res = await fetch(`${BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        refresh_token: tokenData.refresh_token,
      }),
    })
    if (!res.ok) { clearToken(); return false }
    const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    saveToken({
      access_token:  json.access_token,
      refresh_token: json.refresh_token,
      expires_at:    Date.now() + json.expires_in * 1000,
    })
    console.log('🔄 [procore] Token refreshed')
    return true
  } catch { return false }
}

async function getToken(): Promise<string | null> {
  if (!tokenData) return null
  if (isExpired()) {
    const ok = await refreshAccessToken()
    if (!ok) return null
  }
  return tokenData!.access_token
}

async function procore(path: string, companyId?: string) {
  const token = await getToken()
  if (!token) return null
  const cid = companyId ?? COMPANY_ID
  const separator = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${cid ? `${separator}company_id=${cid}` : ''}`
  const res = await fetch(url, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'Procore-Company-Id': cid,
    },
  })
  if (!res.ok) throw new Error(`Procore API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<unknown>
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RFIS = [
  { rfi_number: 'RFI-0187', subject: 'Concrete mix design approval - Podium Level', subcontractor: 'Allied Concrete Co.', due_date: '03/09/2026', days_open: 18, status: '[OVERDUE]' },
  { rfi_number: 'RFI-0183', subject: 'MEP coordination conflict — Level 12 ceiling plenum', subcontractor: 'Apex MEP Group', due_date: '03/04/2026', days_open: 22, status: '[OVERDUE]' },
  { rfi_number: 'RFI-0179', subject: 'Waterproofing membrane substitution request', subcontractor: 'Watertight Systems', due_date: '03/14/2026', days_open: 7, status: 'Open' },
  { rfi_number: 'RFI-0176', subject: 'Structural steel connection detail — Grid J/14', subcontractor: 'SteelCraft Inc.', due_date: '03/20/2026', days_open: 4, status: 'Open' },
  { rfi_number: 'RFI-0172', subject: 'Elevator pit waterproofing specification conflict', subcontractor: 'Otis Elevator', due_date: '02/28/2026', days_open: 31, status: '[OVERDUE]' },
  { rfi_number: 'RFI-0168', subject: 'Facade panel anchorage detail clarification', subcontractor: 'Permasteelisa Group', due_date: '03/11/2026', days_open: 12, status: 'Open' },
]

const MOCK_BUDGET = [
  { division: 'Div 03 - Concrete', budget: 4200000, actual: 5047230, variance: -847230, pct: -20.2 },
  { division: 'Div 05 - Structural Steel', budget: 3100000, actual: 3087400, variance: 12600, pct: 0.4 },
  { division: 'Div 08 - Openings', budget: 1850000, actual: 1921000, variance: -71000, pct: -3.8 },
  { division: 'Div 09 - Finishes', budget: 980000, actual: 956600, variance: 23400, pct: 2.4 },
  { division: 'Div 15 - Plumbing', budget: 2400000, actual: 2380000, variance: 20000, pct: 0.8 },
  { division: 'Div 16 - Electrical', budget: 3200000, actual: 3341000, variance: -141000, pct: -4.4 },
]

const MOCK_SUBMITTALS = [
  { submittal_number: 'SUB-0412', description: 'Structural Steel Shop Drawings — Levels 8–14', spec_section: '05 12 00', contractor: 'SteelCraft Inc.', submitted: '02/06/2026', days_pending: 29, status: '[OVERDUE]' },
  { submittal_number: 'SUB-0408', description: 'Curtain Wall System — Type CW-2 Mock-up', spec_section: '08 44 13', contractor: 'Permasteelisa Group', submitted: '02/10/2026', days_pending: 25, status: '[OVERDUE]' },
  { submittal_number: 'SUB-0401', description: 'MEP Coordination Drawings — Level 12', spec_section: '23 00 00', contractor: 'Apex MEP Group', submitted: '02/17/2026', days_pending: 18, status: 'Under Review' },
  { submittal_number: 'SUB-0398', description: 'Elevator Equipment Data — 4 Cars', spec_section: '14 21 23', contractor: 'Otis Elevator', submitted: '02/20/2026', days_pending: 15, status: 'Under Review' },
]

const MOCK_PUNCH_LIST = [
  { item_id: 'PL-1042', description: 'Touch-up paint – Corridor 12E', trade: 'Painting', responsible: 'Pacific Interiors', location: 'Level 12', priority: 'Low', status: 'Open' },
  { item_id: 'PL-1038', description: 'Missing grout joint – Lobby tile', trade: 'Tile', responsible: 'Artisan Tile Co.', location: 'Lobby', priority: 'High', status: 'Open' },
  { item_id: 'PL-1031', description: 'HVAC diffuser misaligned – Suite 1104', trade: 'Mechanical', responsible: 'Apex MEP Group', location: 'Level 11', priority: 'Medium', status: 'In Progress' },
  { item_id: 'PL-1028', description: 'Door hardware incomplete – Units 9A & 9B', trade: 'Doors', responsible: 'Allied Hardware', location: 'Level 9', priority: 'High', status: 'Open' },
]

const MOCK_DAILY_LOGS = [
  { date: '03/07/2026', superintendent: 'J. Rivera', manpower: 87, weather: 'Clear 58°F', work_completed: 'Poured Levels 18–19 columns; installed Level 14 MEP rough-in; placed Level 12 concrete deck', safety_incidents: 0, delays: 'None' },
  { date: '03/06/2026', superintendent: 'J. Rivera', manpower: 92, weather: 'Partly Cloudy 61°F', work_completed: 'Completed Level 17 formwork; continued curtain wall Level 8–10', safety_incidents: 0, delays: '1hr crane delay – scheduled maintenance' },
]

// ── OAuth routes + MCP tools ──────────────────────────────────────────────────

createSseServer('procore', PORT, (server) => {

  server.tool(
    'list_rfis',
    'List RFIs for a Procore project. Returns RFI number, subject, subcontractor, due date, days open, status. Items with [OVERDUE] status need immediate attention.',
    {
      project_id: z.string().describe('Procore project ID'),
      status: z.enum(['open', 'closed', 'draft', 'all']).optional().default('open'),
      subcontractor: z.string().optional().describe('Filter by subcontractor name'),
    },
    async ({ project_id, status, subcontractor }) => {
      try {
        const live = await procore(`/rest/v1.0/projects/${project_id}/rfis?filters[status]=${status}`)
        const data = live ?? MOCK_RFIS
        const filtered = subcontractor
          ? (data as typeof MOCK_RFIS).filter(r => r.subcontractor?.toLowerCase().includes(subcontractor.toLowerCase()))
          : data
        return ok({ rfis: filtered, total: (filtered as unknown[]).length, source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_budget_summary',
    'Get budget vs actual cost summary grouped by CSI division. Returns budget, actual, variance ($), and variance (%). Items with negative variance are over budget.',
    {
      project_id: z.string().describe('Procore project ID'),
      group_by: z.enum(['csi_division', 'cost_code', 'subcontractor']).optional().default('csi_division'),
    },
    async ({ project_id, group_by }) => {
      try {
        const live = await procore(`/rest/v1.0/projects/${project_id}/budget/views/summary?group_by=${group_by}`)
        return ok({ divisions: live ?? MOCK_BUDGET, source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_submittals',
    'List submittals for a project. Returns submittal number, description, spec section, contractor, submission date, days pending, and status.',
    {
      project_id: z.string().describe('Procore project ID'),
      status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'all']).optional().default('pending'),
      min_days_pending: z.number().optional().describe('Only show submittals pending more than N days'),
    },
    async ({ project_id, status, min_days_pending }) => {
      try {
        const live = await procore(`/rest/v1.0/projects/${project_id}/submittals?filters[status]=${status}`)
        let data = (live ?? MOCK_SUBMITTALS) as typeof MOCK_SUBMITTALS
        if (min_days_pending) data = data.filter(s => s.days_pending >= min_days_pending)
        return ok({ submittals: data, total: data.length, source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_daily_logs',
    'Retrieve daily construction logs including manpower, weather, work completed, safety incidents, and delays.',
    {
      project_id: z.string().describe('Procore project ID'),
      date: z.string().optional().describe('Specific date MM/DD/YYYY, or omit for last 7 days'),
    },
    async ({ project_id, date }) => {
      try {
        const path = date
          ? `/rest/v1.0/projects/${project_id}/daily_logs?filters[date]=${date}`
          : `/rest/v1.0/projects/${project_id}/daily_logs?per_page=7`
        const live = await procore(path)
        return ok({ logs: live ?? MOCK_DAILY_LOGS, source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_punch_items',
    'List punch list items by trade and responsible party. Returns item ID, description, trade, responsible party, location, priority, and status.',
    {
      project_id: z.string().describe('Procore project ID'),
      status: z.enum(['open', 'in_progress', 'completed', 'all']).optional().default('open'),
      trade: z.string().optional().describe('Filter by trade'),
    },
    async ({ project_id, status, trade }) => {
      try {
        const live = await procore(`/rest/v1.0/projects/${project_id}/checklist/list_items?filters[status]=${status}`)
        let data = (live ?? MOCK_PUNCH_LIST) as typeof MOCK_PUNCH_LIST
        if (trade) data = data.filter(p => p.trade?.toLowerCase().includes(trade.toLowerCase()))
        return ok({ punch_items: data, total: data.length, source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_projects',
    'List all projects in the Procore company account. Returns project ID, name, status, start/end dates, and contract value.',
    {
      company_id: z.string().optional().describe('Procore company ID (uses env default if omitted)'),
      status: z.enum(['Active', 'Inactive', 'all']).optional().default('Active'),
    },
    async ({ company_id, status }) => {
      try {
        const cid = company_id ?? COMPANY_ID
        const live = await procore(`/rest/v1.0/projects?filters[status]=${status}`, cid)
        return ok({ projects: live ?? [{ id: '2240', name: 'Riverside Tower', status: 'Active' }], source: live ? 'procore-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

}, (app) => {

  // ── /auth — start OAuth flow ─────────────────────────────────────────────
  app.get('/auth', (_req, res) => {
    if (!CLIENT_ID) {
      res.status(400).send('PROCORE_CLIENT_ID not set in servers/.env')
      return
    }
    const url = new URL(`${BASE}/oauth/authorize`)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    console.log('🌐 [procore] Starting OAuth flow →', url.toString())
    res.redirect(url.toString())
  })

  // ── /auth/callback — exchange code for token ─────────────────────────────
  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string | undefined
    if (!code) {
      res.status(400).send('Missing code parameter')
      return
    }
    try {
      const response = await fetch(`${BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri:  REDIRECT_URI,
          code,
        }),
      })
      if (!response.ok) {
        const err = await response.text()
        res.status(400).send(`Token exchange failed: ${err}`)
        return
      }
      const json = await response.json() as { access_token: string; refresh_token: string; expires_in: number }
      saveToken({
        access_token:  json.access_token,
        refresh_token: json.refresh_token,
        expires_at:    Date.now() + json.expires_in * 1000,
      })
      console.log('✅ [procore] OAuth success — token stored')
      res.send(`
        <html><body style="font-family:monospace;background:#0a0f1a;color:#f1f5f9;padding:40px">
          <h2 style="color:#f59e0b">✅ Procore Connected!</h2>
          <p>Access token stored. The MCP server is now using live Procore data.</p>
          <p style="color:#64748b">Token expires: ${new Date(tokenData!.expires_at).toLocaleString()}</p>
          <p>You can close this tab.</p>
        </body></html>
      `)
    } catch (e) {
      res.status(500).send(`Error: ${e}`)
    }
  })

  // ── /auth/status — check current auth state ──────────────────────────────
  app.get('/auth/status', async (_req, res) => {
    if (!tokenData) {
      res.json({ authenticated: false, message: 'Not authenticated. Visit /auth to connect.' })
      return
    }
    if (isExpired()) {
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        res.json({ authenticated: false, message: 'Token expired and refresh failed. Visit /auth to reconnect.' })
        return
      }
    }
    res.json({
      authenticated: true,
      expires_at: new Date(tokenData!.expires_at).toISOString(),
      expires_in_minutes: Math.round((tokenData!.expires_at - Date.now()) / 60000),
      base_url: BASE,
      company_id: COMPANY_ID,
    })
  })

  // ── /auth/logout — clear token ───────────────────────────────────────────
  app.get('/auth/logout', (_req, res) => {
    clearToken()
    res.json({ message: 'Token cleared. Visit /auth to reconnect.' })
  })

})
