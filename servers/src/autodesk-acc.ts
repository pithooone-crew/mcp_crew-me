import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3002
const BASE = process.env.AUTODESK_BASE_URL ?? 'https://developer.api.autodesk.com'
const CLIENT_ID = process.env.AUTODESK_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.AUTODESK_CLIENT_SECRET ?? ''

async function accFetch(path: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  // In production, first obtain a 2-legged token via /authentication/v2/token
  const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  return apiFetch(`${BASE}${path}`, token)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DRAWINGS = [
  { sheet: 'A-301', title: 'Level 3 Floor Plan — Unit Mix Revision', discipline: 'Architectural', revision: 'Rev 6', issue_date: '03/06/2026', issued_to: 'GC, MEP', status: 'Issued for Construction' },
  { sheet: 'S-215', title: 'Moment Frame Connection Details — Grid J', discipline: 'Structural', revision: 'Rev 3', issue_date: '03/05/2026', issued_to: 'GC, Steel', status: 'Issued for Construction' },
  { sheet: 'M-420', title: 'Level 12 HVAC Coordination Plan', discipline: 'Mechanical', revision: 'Rev 2', issue_date: '03/04/2026', issued_to: 'GC, MEP', status: 'Issued for Coordination' },
  { sheet: 'E-550', title: 'Electrical Panel Schedule — Main Distribution', discipline: 'Electrical', revision: 'Rev 4', issue_date: '03/03/2026', issued_to: 'GC, Electrical', status: 'Issued for Construction' },
  { sheet: 'A-850', title: 'Exterior Facade Details — Panel Type B', discipline: 'Architectural', revision: 'Rev 5', issue_date: '03/01/2026', issued_to: 'GC, Facade', status: 'Issued for Construction' },
  { sheet: 'P-310', title: 'Level 10-12 Plumbing Plan', discipline: 'Plumbing', revision: 'Rev 1', issue_date: '02/28/2026', issued_to: 'GC, MEP', status: 'Issued for Construction' },
]

const MOCK_ISSUES = [
  { issue_id: 'ACC-1041', title: 'Level 12 duct conflicts with beam at Grid J/12', type: 'Clash', discipline: 'MEP', priority: 'High', assigned_to: 'Apex MEP Group', created: '03/01/2026', due: '03/10/2026', status: 'Open', linked_rfi: 'RFI-0183' },
  { issue_id: 'ACC-1039', title: 'Curtain wall anchor conflicts with slab edge at Level 8', type: 'Clash', discipline: 'Structural', priority: 'High', assigned_to: 'SteelCraft Inc.', created: '02/27/2026', due: '03/07/2026', status: '[OVERDUE]', linked_rfi: 'RFI-0176' },
  { issue_id: 'ACC-1037', title: 'Sprinkler head placement below suspended ceiling', type: 'Design', discipline: 'Fire Protection', priority: 'Medium', assigned_to: 'Apex MEP Group', created: '02/24/2026', due: '03/12/2026', status: 'In Review', linked_rfi: null },
  { issue_id: 'ACC-1034', title: 'Elevator shaft opening mismatch — levels 14-16', type: 'Discrepancy', discipline: 'Architectural', priority: 'High', assigned_to: 'Architect Team', created: '02/20/2026', due: '03/05/2026', status: '[OVERDUE]', linked_rfi: null },
  { issue_id: 'ACC-1030', title: 'Structural slab penetration not shown on MEP plan', type: 'Omission', discipline: 'Structural', priority: 'Medium', assigned_to: 'Structural EOR', created: '02/18/2026', due: '03/15/2026', status: 'Open', linked_rfi: 'RFI-0179' },
]

const MOCK_TRANSMITTALS = [
  { transmittal: 'TR-2240-087', description: 'Structural Drawings Rev 3 — Levels 8-14', sent_to: 'SteelCraft Inc.', sent_date: '03/05/2026', sheets: 12, method: 'ACC', status: 'Delivered' },
  { transmittal: 'TR-2240-086', description: 'MEP Coordination Package — Level 12', sent_to: 'Apex MEP Group', sent_date: '03/04/2026', sheets: 8, method: 'ACC', status: 'Delivered' },
  { transmittal: 'TR-2240-085', description: 'Exterior Facade Details Rev 5', sent_to: 'Permasteelisa Group', sent_date: '03/01/2026', sheets: 6, method: 'ACC', status: 'Delivered' },
  { transmittal: 'TR-2240-084', description: 'ASI-019 — Window Sill Revision', sent_to: 'GC, All Subs', sent_date: '03/03/2026', sheets: 3, method: 'ACC', status: 'Pending Acknowledgment' },
]

const MOCK_RFIS = [
  { rfi: 'RFI-0187', spec: '03 30 00', question: 'Concrete mix design — 6000 PSI vs 5000 PSI on podium', submitted: '02/17/2026', days_open: 18, assigned: 'Structural EOR', overdue: true },
  { rfi: 'RFI-0185', spec: '03 30 00', question: 'Rebar splice locations at Level 14 transfer beam', submitted: '02/20/2026', days_open: 15, assigned: 'Structural EOR', overdue: true },
  { rfi: 'RFI-0183', spec: '23 05 00', question: 'Duct routing conflict with structural beam at Level 12', submitted: '02/13/2026', days_open: 22, assigned: 'MEP Engineer', overdue: true },
  { rfi: 'RFI-0179', spec: '07 13 00', question: 'Waterproofing membrane substitution — CPP vs HDPE', submitted: '02/28/2026', days_open: 7, assigned: 'Architectural', overdue: false },
  { rfi: 'RFI-0177', spec: '05 12 00', question: 'Shear tab connection detail — Grid K/15 column', submitted: '03/01/2026', days_open: 6, assigned: 'Structural EOR', overdue: false },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('autodesk-acc', PORT, (server) => {

  server.tool(
    'list_drawings',
    'List drawings from Autodesk ACC drawing register. Returns sheet number, title, discipline, revision, issue date, and status. Filter by discipline or updated since a date.',
    {
      project: z.string().describe('ACC project name or hub ID'),
      discipline: z.string().optional().describe('Filter by discipline: Architectural, Structural, Mechanical, Electrical, Plumbing'),
      updated_since: z.string().optional().describe('Filter to sheets updated since this date (e.g. "7d", "MM/DD/YYYY")'),
    },
    async ({ project, discipline, updated_since }) => {
      try {
        const live = await accFetch(`/construction/admin/v1/projects/${project}/drawings`)
        let data = (live ?? MOCK_DRAWINGS) as typeof MOCK_DRAWINGS
        if (discipline) data = data.filter(d => d.discipline.toLowerCase().includes(discipline.toLowerCase()))
        void updated_since // used in real API query
        return ok({ drawings: data, total: data.length, source: live ? 'acc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_issues',
    'List open issues and clashes in Autodesk ACC BIM Collaborate. Returns issue ID, title, type, discipline, priority, assigned party, due date, and status. Items with [OVERDUE] need immediate attention.',
    {
      project: z.string().describe('ACC project name or ID'),
      type: z.enum(['clash', 'design', 'discrepancy', 'omission', 'all']).optional().default('all'),
      linked_rfis: z.boolean().optional().describe('Only return issues linked to open RFIs'),
      assigned_to: z.string().optional().describe('Filter by assigned party'),
    },
    async ({ project, type, linked_rfis, assigned_to }) => {
      try {
        const live = await accFetch(`/issues/v1/containers/${project}/quality-issues`)
        let data = (live ?? MOCK_ISSUES) as typeof MOCK_ISSUES
        if (type && type !== 'all') data = data.filter(i => i.type.toLowerCase() === type.toLowerCase())
        if (linked_rfis) data = data.filter(i => i.linked_rfi !== null)
        if (assigned_to) data = data.filter(i => i.assigned_to.toLowerCase().includes(assigned_to.toLowerCase()))
        return ok({ issues: data, total: data.length, source: live ? 'acc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_transmittals',
    'List transmittals sent via Autodesk ACC. Returns transmittal number, description, recipient, sent date, number of sheets, and delivery status.',
    {
      project: z.string().describe('ACC project name or ID'),
      sent_to: z.string().optional().describe('Filter by recipient party'),
      days: z.number().optional().default(7).describe('Return transmittals from last N days'),
    },
    async ({ project, sent_to, days }) => {
      try {
        const live = await accFetch(`/construction/admin/v1/projects/${project}/transmittals?days=${days}`)
        let data = (live ?? MOCK_TRANSMITTALS) as typeof MOCK_TRANSMITTALS
        if (sent_to) data = data.filter(t => t.sent_to.toLowerCase().includes(sent_to.toLowerCase()))
        return ok({ transmittals: data, total: data.length, source: live ? 'acc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_rfis',
    'List RFIs in Autodesk ACC document management. Returns RFI number, spec section, question, submission date, days open, assigned reviewer, and overdue status.',
    {
      project: z.string().describe('ACC project name or ID'),
      spec_section: z.string().optional().describe('Filter by CSI spec section (e.g. "03 30 00")'),
      overdue_only: z.boolean().optional().describe('Return only overdue RFIs (>10 days)'),
    },
    async ({ project, spec_section, overdue_only }) => {
      try {
        const live = await accFetch(`/construction/admin/v1/projects/${project}/rfis`)
        let data = (live ?? MOCK_RFIS) as typeof MOCK_RFIS
        if (spec_section) data = data.filter(r => r.spec.includes(spec_section))
        if (overdue_only) data = data.filter(r => r.overdue)
        return ok({ rfis: data, total: data.length, overdue: data.filter(r => r.overdue).length, source: live ? 'acc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
