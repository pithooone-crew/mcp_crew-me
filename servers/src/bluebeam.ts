import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3005
const BASE = process.env.BLUEBEAM_BASE_URL ?? 'https://studioapi.bluebeam.com'
const CLIENT_ID = process.env.BLUEBEAM_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.BLUEBEAM_CLIENT_SECRET ?? ''

async function bbFetch(path: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  return apiFetch(`${BASE}${path}`, token)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  {
    session_id: 'BB-2240-47',
    name: 'Level 12 MEP Coordination Plan — Review',
    document: 'M-420 Rev 2 — Level 12 HVAC Coordination.pdf',
    created: '03/01/2026',
    days_open: 6,
    owner: 'A. Patel (Architect)',
    participants: ['Apex MEP Group', 'GC PM', 'Structural EOR'],
    total_markups: 34,
    unresolved_markups: 12,
    status: 'Awaiting GC Sign-off',
    deadline: '03/10/2026',
  },
  {
    session_id: 'BB-2240-52',
    name: 'Exterior Facade Details Rev 5 — Sign-off',
    document: 'A-850 Rev 5 — Exterior Facade Details.pdf',
    created: '03/04/2026',
    days_open: 3,
    owner: 'Design Team',
    participants: ['Architect', 'Permasteelisa Group', 'Owner Rep'],
    total_markups: 12,
    unresolved_markups: 4,
    status: 'Awaiting Facade Sub Sign-off',
    deadline: '03/14/2026',
  },
  {
    session_id: 'BB-2240-44',
    name: 'Structural Shop Drawings — Levels 8-14',
    document: 'SUB-0412 Shop Drawings.pdf',
    created: '02/20/2026',
    days_open: 15,
    owner: 'Structural EOR',
    participants: ['SteelCraft Inc.', 'Structural EOR', 'GC PM'],
    total_markups: 67,
    unresolved_markups: 0,
    status: '[OVERDUE] Pending Final Approval',
    deadline: '02/28/2026',
  },
]

const MOCK_MARKUPS = [
  { markup_id: 'MK-0441', session: 'BB-2240-47', type: 'Cloud+', page: 3, description: 'Duct size conflict — increase to 54" per MEP coordination', author: 'Structural EOR', created: '03/01/2026', status: 'Unresolved', assigned_to: 'Apex MEP Group' },
  { markup_id: 'MK-0442', session: 'BB-2240-47', type: 'Callout', page: 3, description: 'Beam depth confirmed as W18x97 — no change to duct route', author: 'GC PM', created: '03/02/2026', status: 'Unresolved', assigned_to: 'Apex MEP Group' },
  { markup_id: 'MK-0443', session: 'BB-2240-47', type: 'Checkmark', page: 5, description: 'Sprinkler stub-up location confirmed OK', author: 'Apex MEP Group', created: '03/03/2026', status: 'Resolved', assigned_to: null },
  { markup_id: 'MK-0444', session: 'BB-2240-52', type: 'Cloud', page: 2, description: 'Anchor bolt spacing needs revision per structural comment', author: 'Architect', created: '03/04/2026', status: 'Unresolved', assigned_to: 'Permasteelisa Group' },
]

const MOCK_REPORTS = [
  { report_id: 'RPT-2240-014', session: 'BB-2240-44', type: 'Markup Summary', generated: '03/05/2026', pages: 4, total_markups: 67, resolved: 67, unresolved: 0, status: 'Complete — Sent to GC' },
  { report_id: 'RPT-2240-013', session: 'BB-2240-41', type: 'Markup Summary', generated: '02/28/2026', pages: 3, total_markups: 28, resolved: 28, unresolved: 0, status: 'Complete' },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('bluebeam', PORT, (server) => {

  server.tool(
    'list_sessions',
    'List active Bluebeam Studio Sessions for a project. Returns session ID, document name, participants, markup counts, status, and sign-off deadline. Sessions with [OVERDUE] status need immediate action.',
    {
      project_id: z.string().describe('Project ID or name'),
      status: z.enum(['active', 'awaiting_signoff', 'overdue', 'closed', 'all']).optional().default('active'),
      participant: z.string().optional().describe('Filter sessions where this party is a participant'),
    },
    async ({ project_id, status, participant }) => {
      try {
        const live = await bbFetch(`/publicapi/2/Studio/Sessions?projectId=${project_id}`)
        let data = (live ?? MOCK_SESSIONS) as typeof MOCK_SESSIONS
        if (status === 'awaiting_signoff') data = data.filter(s => s.status.includes('Awaiting'))
        if (status === 'overdue') data = data.filter(s => s.status.includes('OVERDUE'))
        if (participant) data = data.filter(s => s.participants.some(p => p.toLowerCase().includes(participant.toLowerCase())))
        return ok({ sessions: data, total: data.length, source: live ? 'bluebeam-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_session_markups',
    'Get markup details for a Bluebeam Studio Session. Returns individual markup items with type, page, description, author, and resolution status.',
    {
      session_id: z.string().describe('Bluebeam Studio Session ID (e.g. BB-2240-47)'),
      status: z.enum(['resolved', 'unresolved', 'all']).optional().default('all'),
      assigned_to: z.string().optional().describe('Filter markups assigned to a specific party'),
    },
    async ({ session_id, status, assigned_to }) => {
      try {
        const live = await bbFetch(`/publicapi/2/Studio/Sessions/${session_id}/Markups`)
        let data = (live ?? MOCK_MARKUPS.filter(m => m.session === session_id)) as typeof MOCK_MARKUPS
        if (!data.length) data = MOCK_MARKUPS
        if (status !== 'all') data = data.filter(m => m.status.toLowerCase() === status.toLowerCase())
        if (assigned_to) data = data.filter(m => m.assigned_to?.toLowerCase().includes(assigned_to.toLowerCase()))
        return ok({ markups: data, total: data.length, source: live ? 'bluebeam-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_markup_reports',
    'List generated markup summary reports from closed Bluebeam sessions. Returns report ID, session, type, generation date, and markup statistics.',
    {
      project_id: z.string().describe('Project ID or name'),
    },
    async ({ project_id }) => {
      try {
        const live = await bbFetch(`/publicapi/2/Studio/Reports?projectId=${project_id}`)
        return ok({ reports: live ?? MOCK_REPORTS, source: live ? 'bluebeam-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
