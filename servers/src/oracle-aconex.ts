import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3006
const BASE = process.env.ACONEX_BASE_URL ?? 'https://api.aconex.com'
const USERNAME = process.env.ACONEX_USERNAME ?? ''
const PASSWORD = process.env.ACONEX_PASSWORD ?? ''

async function aconexFetch(path: string) {
  if (!USERNAME || !PASSWORD) return null
  const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
  return apiFetch(`${BASE}${path}`, token)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DOCUMENTS = [
  { doc_number: 'DOC-2240-4821', title: 'Geotechnical Report — Riverside Tower Site', type: 'Report', revision: 'Rev 0', author: 'GeoTech Associates', issued: '01/15/2026', status: 'Approved', confidential: false },
  { doc_number: 'DOC-2240-5210', title: 'Owner-Contractor Agreement — GMP Contract', type: 'Contract', revision: 'Rev 2', author: 'Owner Legal', issued: '11/01/2025', status: 'Executed', confidential: true },
  { doc_number: 'DOC-2240-6100', title: 'Insurance Certificate — General Contractor', type: 'Insurance', revision: 'Rev 3', author: 'GC Compliance', issued: '02/01/2026', status: 'Valid — Expires 01/31/2027', confidential: false },
  { doc_number: 'DOC-2240-6342', title: 'Payment Application #12 — February 2026', type: 'Pay App', revision: 'Rev 1', author: 'GC Finance', issued: '03/01/2026', status: 'Pending Owner Review', confidential: false },
  { doc_number: 'DOC-2240-6400', title: 'ASI-020 — Lobby Ceiling Height Change', type: 'ASI', revision: 'Rev 0', author: 'Design Team', issued: '03/06/2026', status: 'In Workflow — Owner Approval', confidential: false },
]

const MOCK_WORKFLOWS = [
  { workflow_id: 'WF-2240-0089', title: 'Change Order CO-2240-041 — Level 14 Concrete Over-pour', type: 'Change Order Approval', initiated: '02/28/2026', current_step: 'Owner Review', assigned_to: 'M. Johnson (Owner Rep)', due: '03/10/2026', age_days: 7, status: 'In Progress' },
  { workflow_id: 'WF-2240-0090', title: 'Payment Application #12 — February 2026 ($4.87M)', type: 'Pay App Approval', initiated: '03/01/2026', current_step: 'PM Certification', assigned_to: 'Owner PM', due: '03/15/2026', age_days: 6, status: 'In Progress' },
  { workflow_id: 'WF-2240-0085', title: 'ASI-019 — Window Sill Height Revision', type: 'ASI Approval', initiated: '02/20/2026', current_step: 'Complete', assigned_to: null, due: '02/28/2026', age_days: 15, status: 'Approved' },
  { workflow_id: 'WF-2240-0092', title: 'ASI-020 — Lobby Ceiling Height Increase', type: 'ASI Approval', initiated: '03/06/2026', current_step: 'Owner Approval', assigned_to: 'M. Johnson (Owner Rep)', due: '03/13/2026', age_days: 1, status: 'Pending' },
  { workflow_id: 'WF-2240-0088', title: 'Submittal Review — Curtain Wall Mock-up Report', type: 'Submittal Approval', initiated: '02/25/2026', current_step: 'Owner Rep Sign-off', assigned_to: 'Owner Rep', due: '03/07/2026', age_days: 10, status: '[OVERDUE]' },
]

const MOCK_CORRESPONDENCE = [
  { letter_id: 'LTR-2240-0312', subject: 'Notice of Delay — Concrete Schedule Impact', from: 'GC (Project Manager)', to: 'Owner Representative', sent: '03/04/2026', type: 'Formal Notice', response_due: '03/11/2026', status: 'Awaiting Response' },
  { letter_id: 'LTR-2240-0311', subject: 'Request for Additional Time — MEP Coordination', from: 'GC (Project Manager)', to: 'Owner Representative', sent: '02/28/2026', type: 'Request', response_due: '03/07/2026', status: '[OVERDUE] No Response' },
  { letter_id: 'LTR-2240-0309', subject: 'Weekly Project Status Report — Week 9', from: 'GC (Project Manager)', to: 'Owner, A/E Team', sent: '03/02/2026', type: 'Status Report', response_due: null, status: 'Sent — No Action Required' },
  { letter_id: 'LTR-2240-0308', subject: 'Geotechnical Finding — Elevator Pit Conditions', from: 'GeoTech Associates', to: 'Owner, Structural EOR', sent: '02/24/2026', type: 'Technical Report', response_due: '03/10/2026', status: 'Review In Progress' },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('oracle-aconex', PORT, (server) => {

  server.tool(
    'list_documents',
    'List project documents from Oracle Aconex document register. Returns document number, title, type, revision, author, issue date, and approval status.',
    {
      project_id: z.string().describe('Aconex project ID'),
      doc_type: z.enum(['contract', 'report', 'insurance', 'pay_app', 'asi', 'submittal', 'all']).optional().default('all'),
      status: z.string().optional().describe('Filter by status (e.g. "Pending", "Approved")'),
    },
    async ({ project_id, doc_type, status }) => {
      try {
        const live = await aconexFetch(`/api/projects/${project_id}/documents`)
        let data = (live ?? MOCK_DOCUMENTS) as typeof MOCK_DOCUMENTS
        if (doc_type && doc_type !== 'all') data = data.filter(d => d.type.toLowerCase().replace(' ', '_') === doc_type.toLowerCase())
        if (status) data = data.filter(d => d.status.toLowerCase().includes(status.toLowerCase()))
        return ok({ documents: data, total: data.length, source: live ? 'aconex-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_workflow_status',
    'Get status of approval workflows in Oracle Aconex. Returns workflow ID, title, type, current step, assigned party, due date, age, and status. Items with [OVERDUE] status need immediate attention.',
    {
      project_id: z.string().describe('Aconex project ID'),
      type: z.enum(['change_order', 'pay_app', 'asi', 'submittal', 'all']).optional().default('all'),
      assigned_to: z.string().optional().describe('Filter workflows assigned to a specific party'),
      overdue_only: z.boolean().optional().describe('Return only overdue workflows'),
    },
    async ({ project_id, type, assigned_to, overdue_only }) => {
      try {
        const live = await aconexFetch(`/api/projects/${project_id}/workflows`)
        let data = (live ?? MOCK_WORKFLOWS) as typeof MOCK_WORKFLOWS
        if (type && type !== 'all') data = data.filter(w => w.type.toLowerCase().replace(/[ -]/g, '_').includes(type.toLowerCase().replace(/[ -]/g, '_')))
        if (assigned_to) data = data.filter(w => w.assigned_to?.toLowerCase().includes(assigned_to.toLowerCase()))
        if (overdue_only) data = data.filter(w => w.status.includes('OVERDUE'))
        return ok({ workflows: data, total: data.length, overdue: data.filter(w => w.status.includes('OVERDUE')).length, source: live ? 'aconex-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_correspondence',
    'List project correspondence (formal letters, notices, status reports) from Oracle Aconex. Returns letter ID, subject, sender, recipient, date, type, and response status.',
    {
      project_id: z.string().describe('Aconex project ID'),
      from_party: z.string().optional().describe('Filter by sender party'),
      to_party: z.string().optional().describe('Filter by recipient party'),
      awaiting_response: z.boolean().optional().describe('Return only letters awaiting a response'),
    },
    async ({ project_id, from_party, to_party, awaiting_response }) => {
      try {
        const live = await aconexFetch(`/api/projects/${project_id}/correspondence`)
        let data = (live ?? MOCK_CORRESPONDENCE) as typeof MOCK_CORRESPONDENCE
        if (from_party) data = data.filter(l => l.from.toLowerCase().includes(from_party.toLowerCase()))
        if (to_party) data = data.filter(l => l.to.toLowerCase().includes(to_party.toLowerCase()))
        if (awaiting_response) data = data.filter(l => l.status.includes('Awaiting') || l.status.includes('OVERDUE'))
        return ok({ correspondence: data, total: data.length, source: live ? 'aconex-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_transmittal',
    'Get a specific document transmittal or workflow history from Oracle Aconex by document number.',
    {
      project_id: z.string().describe('Aconex project ID'),
      doc_number: z.string().describe('Document number (e.g. DOC-2240-6342)'),
    },
    async ({ project_id, doc_number }) => {
      try {
        const live = await aconexFetch(`/api/projects/${project_id}/documents/${doc_number}/transmittals`)
        const doc = MOCK_DOCUMENTS.find(d => d.doc_number === doc_number) ?? MOCK_DOCUMENTS[0]
        return ok(live ?? { document: doc, transmittals: [{ date: '03/01/2026', action: 'Issued for Review', by: doc.author, to: 'Owner Representative' }], project_id })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
