import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3009
const BASE = process.env.BC_BASE_URL ?? 'https://developer.autodesk.com/buildingconnected/v2'
const TOKEN = process.env.BC_TOKEN ?? ''

async function bcFetch(path: string) {
  if (!TOKEN) return null
  return apiFetch(`${BASE}${path}`, TOKEN)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_BID_INVITATIONS = [
  { itb: 'ITB-2244-001', project: 'Northside Community Center', trade: 'General Conditions', csi: '01 00 00', bid_date: '03/12/2026', days_left: 5, subs_invited: 8, bids_received: 3, low_bid: 387000, coverage: '3 of 8', status: 'Active' },
  { itb: 'ITB-2244-002', project: 'Northside Community Center', trade: 'Concrete', csi: '03 00 00', bid_date: '03/12/2026', days_left: 5, subs_invited: 6, bids_received: 4, low_bid: 820000, coverage: '4 of 6', status: 'Active' },
  { itb: 'ITB-2244-003', project: 'Northside Community Center', trade: 'Structural Steel', csi: '05 12 00', bid_date: '03/14/2026', days_left: 7, subs_invited: 5, bids_received: 2, low_bid: 1180000, coverage: '2 of 5', status: 'Active' },
  { itb: 'ITB-2244-004', project: 'Northside Community Center', trade: 'Mechanical', csi: '23 00 00', bid_date: '03/17/2026', days_left: 10, subs_invited: 7, bids_received: 1, low_bid: 780000, coverage: '1 of 7', status: 'Active' },
  { itb: 'ITB-2244-005', project: 'Northside Community Center', trade: 'Electrical', csi: '26 00 00', bid_date: '03/17/2026', days_left: 10, subs_invited: 6, bids_received: 0, low_bid: null, coverage: '0 of 6', status: '[NO COVERAGE]' },
  { itb: 'ITB-2244-006', project: 'Northside Community Center', trade: 'Drywall / Finishes', csi: '09 00 00', bid_date: '03/19/2026', days_left: 12, subs_invited: 9, bids_received: 5, low_bid: 620000, coverage: '5 of 9', status: 'Active' },
]

const MOCK_BID_RESULTS = [
  { itb: 'ITB-2244-001', trade: 'General Conditions', bidder: 'Pacific Project Services', amount: 387000, submitted: '03/06/2026', qualifications: 'Compliant', score: 92, prequalified: true },
  { itb: 'ITB-2244-001', trade: 'General Conditions', bidder: 'Western Construction Mgmt', amount: 402000, submitted: '03/05/2026', qualifications: 'Compliant', score: 88, prequalified: true },
  { itb: 'ITB-2244-001', trade: 'General Conditions', bidder: 'Atlas GC Services', amount: 418000, submitted: '03/06/2026', qualifications: 'Minor Exception', score: 79, prequalified: false },
  { itb: 'ITB-2244-002', trade: 'Concrete', bidder: 'Allied Concrete Co.', amount: 820000, submitted: '03/04/2026', qualifications: 'Compliant', score: 95, prequalified: true },
  { itb: 'ITB-2244-002', trade: 'Concrete', bidder: 'Pacific Concrete', amount: 847000, submitted: '03/06/2026', qualifications: 'Compliant', score: 90, prequalified: true },
  { itb: 'ITB-2244-003', trade: 'Structural Steel', bidder: 'SteelCraft Inc.', amount: 1180000, submitted: '03/05/2026', qualifications: 'Compliant', score: 94, prequalified: true },
  { itb: 'ITB-2244-003', trade: 'Structural Steel', bidder: 'Western Steel Fabricators', amount: 1240000, submitted: '03/06/2026', qualifications: 'Compliant', score: 87, prequalified: true },
]

const MOCK_SUB_COVERAGE = {
  project: 'Northside Community Center',
  total_csi_divisions: 11,
  covered_divisions: 8,
  uncovered_divisions: 3,
  coverage_pct: 72.7,
  trades: [
    { trade: 'General Conditions', csi: '01', bids: 3, status: 'Covered' },
    { trade: 'Concrete', csi: '03', bids: 4, status: 'Covered' },
    { trade: 'Masonry', csi: '04', bids: 0, status: '[NO COVERAGE]' },
    { trade: 'Structural Steel', csi: '05', bids: 2, status: 'Covered' },
    { trade: 'Waterproofing', csi: '07', bids: 2, status: 'Covered' },
    { trade: 'Doors & Hardware', csi: '08', bids: 3, status: 'Covered' },
    { trade: 'Drywall / Finishes', csi: '09', bids: 5, status: 'Covered' },
    { trade: 'Flooring', csi: '09B', bids: 0, status: '[NO COVERAGE]' },
    { trade: 'Mechanical', csi: '23', bids: 1, status: 'Low Coverage' },
    { trade: 'Electrical', csi: '26', bids: 0, status: '[NO COVERAGE]' },
    { trade: 'Plumbing', csi: '22', bids: 2, status: 'Covered' },
  ],
}

const MOCK_SUBS = [
  { company: 'Allied Concrete Co.', trade: 'Concrete', prequalified: true, bonding_capacity: 5000000, experience: '15 years', local_presence: true, past_projects: 12, score: 95, status: 'Invited — Bid Received' },
  { company: 'SteelCraft Inc.', trade: 'Structural Steel', prequalified: true, bonding_capacity: 8000000, experience: '22 years', local_presence: true, past_projects: 8, score: 94, status: 'Invited — Bid Received' },
  { company: 'Apex MEP Group', trade: 'Mechanical', prequalified: true, bonding_capacity: 6000000, experience: '18 years', local_presence: true, past_projects: 14, score: 91, status: 'Invited — Bid Pending' },
  { company: 'Pacific Interiors', trade: 'Drywall', prequalified: false, bonding_capacity: 2000000, experience: '8 years', local_presence: true, past_projects: 5, score: 74, status: 'Invited — Bid Received' },
  { company: 'Western Electric Co.', trade: 'Electrical', prequalified: false, bonding_capacity: 3000000, experience: '10 years', local_presence: false, past_projects: 3, score: 68, status: 'Invited — No Response' },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('building-connected', PORT, (server) => {

  server.tool(
    'get_bid_invitations',
    'Get active bid invitations (ITBs) from BuildingConnected. Returns ITB number, project, trade, CSI division, bid deadline, days remaining, subs invited vs bids received, low bid, coverage, and status. Items with [NO COVERAGE] mean no bids received for that trade.',
    {
      project_id: z.string().describe('Project ID or name'),
      status: z.enum(['active', 'closed', 'all']).optional().default('active'),
      trade: z.string().optional().describe('Filter by trade name (e.g. "Concrete", "Electrical")'),
      days_until_bid: z.number().optional().describe('Only show bids closing within N days'),
    },
    async ({ project_id, status, trade, days_until_bid }) => {
      try {
        const live = await bcFetch(`/projects/${project_id}/bid-packages`)
        let data = (live ?? MOCK_BID_INVITATIONS) as typeof MOCK_BID_INVITATIONS
        if (status !== 'all') data = data.filter(i => i.status.toLowerCase().includes(status.toLowerCase()) || i.status.includes('NO COVERAGE'))
        if (trade) data = data.filter(i => i.trade.toLowerCase().includes(trade.toLowerCase()))
        if (days_until_bid) data = data.filter(i => i.days_left <= days_until_bid)
        const noConverage = data.filter(i => i.status.includes('NO COVERAGE')).length
        return ok({ invitations: data, total: data.length, no_coverage_count: noConverage, source: live ? 'bc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_bid_results',
    'Get submitted bid results for a project or specific ITB from BuildingConnected. Returns bidder, amount, submission date, qualification status, and prequalification status.',
    {
      project_id: z.string().describe('Project ID or name'),
      itb: z.string().optional().describe('Filter by specific ITB number (e.g. ITB-2244-001)'),
      trade: z.string().optional().describe('Filter by trade'),
      prequalified_only: z.boolean().optional().describe('Only return bids from prequalified subs'),
    },
    async ({ project_id, itb, trade, prequalified_only }) => {
      try {
        const live = await bcFetch(`/projects/${project_id}/bids`)
        let data = (live ?? MOCK_BID_RESULTS) as typeof MOCK_BID_RESULTS
        if (itb) data = data.filter(b => b.itb === itb)
        if (trade) data = data.filter(b => b.trade.toLowerCase().includes(trade.toLowerCase()))
        if (prequalified_only) data = data.filter(b => b.prequalified)
        return ok({ bids: data, total: data.length, source: live ? 'bc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_sub_coverage',
    'Get subcontractor bid coverage report by trade from BuildingConnected. Returns coverage status for all CSI divisions, highlighting trades with no bids ([NO COVERAGE]) or low coverage.',
    {
      project_id: z.string().describe('Project ID or name'),
    },
    async ({ project_id }) => {
      try {
        const live = await bcFetch(`/projects/${project_id}/coverage`)
        return ok(live ?? { ...MOCK_SUB_COVERAGE, project_id })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_subcontractor_list',
    'Get list of subcontractors invited to bid with qualification scores, bonding capacity, and response status from BuildingConnected.',
    {
      project_id: z.string().describe('Project ID or name'),
      trade: z.string().optional().describe('Filter by trade'),
      prequalified: z.boolean().optional().describe('Filter by prequalification status'),
    },
    async ({ project_id, trade, prequalified }) => {
      try {
        const live = await bcFetch(`/projects/${project_id}/subcontractors`)
        let data = (live ?? MOCK_SUBS) as typeof MOCK_SUBS
        if (trade) data = data.filter(s => s.trade.toLowerCase().includes(trade.toLowerCase()))
        if (prequalified !== undefined) data = data.filter(s => s.prequalified === prequalified)
        return ok({ subcontractors: data, total: data.length, source: live ? 'bc-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  // ── Write-back: Invite Subcontractor ──────────────────────────────────────
  server.tool(
    'invite_subcontractor',
    'Invite a subcontractor to bid on an active ITB (Invitation to Bid) in BuildingConnected.',
    {
      project_id: z.string().describe('Project ID'),
      itb_id: z.string().describe('ITB ID to invite the sub to (e.g. ITB-2244-005)'),
      company_name: z.string().describe('Subcontractor company name'),
      contact_email: z.string().describe('Contact email address'),
      trade: z.string().optional().describe('Trade / CSI division'),
      message: z.string().optional().describe('Custom invitation message'),
    },
    async ({ project_id, itb_id, company_name, contact_email, trade, message }) => {
      try {
        const live = await bcFetch(`/projects/${project_id}/bids/${itb_id}/invite`)
        if (live) return ok({ ...live, source: 'bc-live' })

        const itb = MOCK_BID_INVITATIONS.find(i => i.itb === itb_id) ?? MOCK_BID_INVITATIONS[0]
        return ok({
          invited: true,
          itb_id,
          project: itb.project,
          trade: trade ?? itb.trade,
          company_name,
          contact_email,
          invitation_sent_at: new Date().toISOString(),
          bid_due: itb.bid_date,
          custom_message: message ?? null,
          source: 'mock',
          message: `Invitation sent to ${company_name} (${contact_email}) for ${itb_id} — ${itb.trade}. Bid due ${itb.bid_date}.`,
        })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
