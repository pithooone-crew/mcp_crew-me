import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3011
const BASE = process.env.SAFETY_BASE_URL ?? 'https://api.safetyplatform.example.com/v1'
const API_KEY = process.env.SAFETY_API_KEY ?? ''

async function safetyFetch(path: string) {
  if (!API_KEY) return null
  return apiFetch(`${BASE}${path}`, API_KEY)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_INCIDENTS = [
  { id: 'INC-2240-001', type: 'Struck-By', date: '02/14/2026', location: 'Level 4 — Formwork Area', osha_recordable: true, status: 'Open', injured_party: 'J. Martinez (Concrete Sub)', root_cause: 'Inadequate exclusion zone during overhead work', corrective_actions: ['Re-establish exclusion zones', 'Retool box talk on overhead hazards'], days_open: 21 },
  { id: 'INC-2240-002', type: 'Near Miss', date: '02/28/2026', location: 'Level 2 — Electrical Chase', osha_recordable: false, status: 'Closed', injured_party: 'None', root_cause: 'Energized panel not locked out during rough-in work', corrective_actions: ['LOTO retraining completed 03/01/2026'], days_open: 0 },
  { id: 'INC-2240-003', type: 'Fall — Same Level', date: '03/01/2026', location: 'Ground Floor — Material Staging', osha_recordable: true, status: 'Open', injured_party: 'T. Williams (Ironworker)', root_cause: 'Slip on wet concrete — no non-slip footwear', corrective_actions: ['PPE audit scheduled', 'Wet area signage installed'], days_open: 6 },
  { id: 'INC-2240-004', type: 'First Aid', date: '03/03/2026', location: 'Level 3 — Drywall', osha_recordable: false, status: 'Closed', injured_party: 'R. Chen (GC Self-Perform)', root_cause: 'Laceration from utility knife — improper blade retraction', corrective_actions: ['Reviewed cutting tool protocol with crew'], days_open: 0 },
  { id: 'INC-2240-005', type: 'Property Damage', date: '03/05/2026', location: 'Site Perimeter', osha_recordable: false, status: 'Open', injured_party: 'None', root_cause: 'Crane swing arc exceeded site boundary during pick', corrective_actions: ['Crane lift plan revision in progress', 'Operator retraining required'], days_open: 2 },
]

const MOCK_COMPLIANCE = [
  { category: 'Fall Protection', score: 94, violations_open: 0, last_inspection: '03/01/2026', next_inspection: '04/01/2026', status: 'Compliant', notes: 'All leading edge work has proper guardrails or harnesses' },
  { category: 'PPE', score: 78, violations_open: 3, last_inspection: '02/20/2026', next_inspection: '03/20/2026', status: 'Non-Compliant', notes: 'Hard hat compliance issues observed on Level 4; 3 open citations' },
  { category: 'Excavation & Trenching', score: 100, violations_open: 0, last_inspection: '02/15/2026', next_inspection: '04/15/2026', status: 'Compliant', notes: 'No active excavations this period' },
  { category: 'Electrical / LOTO', score: 85, violations_open: 1, last_inspection: '02/28/2026', next_inspection: '03/28/2026', status: 'Compliant', notes: 'One open LOTO procedure issue from INC-2240-002 follow-up' },
  { category: 'HazCom / SDS', score: 91, violations_open: 0, last_inspection: '02/10/2026', next_inspection: '04/10/2026', status: 'Compliant', notes: 'SDS binder current; chemical inventory updated' },
]

const MOCK_TOOLBOX_TALKS = [
  { id: 'TBT-001', topic: 'Struck-By Hazards & Exclusion Zones', date: '02/17/2026', presenter: 'J. Thompson (Safety Mgr)', attendees: 47, signed: 44, completion_pct: 93.6, required: false, status: 'Complete' },
  { id: 'TBT-002', topic: 'Lockout/Tagout (LOTO) Procedures', date: '03/01/2026', presenter: 'M. Rivera (Electrical Super)', attendees: 18, signed: 18, completion_pct: 100, required: true, status: 'Complete' },
  { id: 'TBT-003', topic: 'Slip, Trip & Fall Prevention', date: '03/03/2026', presenter: 'J. Thompson (Safety Mgr)', attendees: 52, signed: 49, completion_pct: 94.2, required: false, status: 'Complete' },
  { id: 'TBT-004', topic: 'Crane & Rigging Safety', date: null, presenter: null, attendees: 0, signed: 0, completion_pct: 0, required: true, status: 'Overdue — Due 03/07/2026' },
  { id: 'TBT-005', topic: 'Emergency Action Plan & Evacuation Routes', date: null, presenter: null, attendees: 0, signed: 0, completion_pct: 0, required: true, status: 'Scheduled 03/10/2026' },
  { id: 'TBT-006', topic: 'Heat Illness Prevention', date: null, presenter: null, attendees: 0, signed: 0, completion_pct: 0, required: true, status: 'Scheduled 03/17/2026' },
]

const MOCK_METRICS = {
  project: 'Northside Community Center',
  period: 'YTD 2026',
  manhours_worked: 142800,
  total_recordable_incidents: 2,
  dart_cases: 1,
  near_misses: 3,
  first_aid_cases: 2,
  trir: 2.80,
  dart_rate: 1.40,
  industry_avg_trir: 3.40,
  industry_avg_dart: 1.80,
  trir_vs_industry: '-17.6%',
  dart_vs_industry: '-22.2%',
  trend: [
    { month: 'Jan 2026', manhours: 48200, recordables: 0, near_misses: 1 },
    { month: 'Feb 2026', manhours: 61400, recordables: 2, near_misses: 2 },
    { month: 'Mar 2026', manhours: 33200, recordables: 0, near_misses: 0 },
  ],
  days_without_recordable: 6,
}

const MOCK_OBSERVATIONS = [
  { id: 'OBS-001', type: 'At-Risk', date: '03/04/2026', observer: 'K. Johnson (Foreman)', location: 'Level 4 — Steel Frame', description: 'Worker not wearing harness while within 6ft of unguarded leading edge', trade: 'Ironworker', status: 'Open', corrective_action: 'Verbal warning issued; harness required before re-entry' },
  { id: 'OBS-002', type: 'Positive', date: '03/04/2026', observer: 'J. Thompson (Safety Mgr)', location: 'Ground Floor', description: 'Concrete crew proactively installed barricades around fresh pour without being asked', trade: 'Concrete', status: 'Closed', corrective_action: null },
  { id: 'OBS-003', type: 'At-Risk', date: '03/05/2026', observer: 'M. Rivera (Electrical Super)', location: 'Level 2 — MEP Corridor', description: 'Temporary lighting inadequate in work zone — below 10 foot-candles', trade: 'Electrical', status: 'Open', corrective_action: 'Additional string lights ordered; ETA 03/08' },
  { id: 'OBS-004', type: 'At-Risk', date: '03/06/2026', observer: 'K. Johnson (Foreman)', location: 'Site Entrance', description: 'Vehicles not checking in at gate — tailgating observed during morning shift change', trade: 'All Trades', status: 'Open', corrective_action: 'Gate attendant added to morning check-in; new signage posted' },
  { id: 'OBS-005', type: 'Positive', date: '03/06/2026', observer: 'J. Thompson (Safety Mgr)', location: 'Level 3', description: 'Drywall crew maintaining excellent housekeeping — aisles clear, scrap binned daily', trade: 'Drywall', status: 'Closed', corrective_action: null },
  { id: 'OBS-006', type: 'Positive', date: '03/07/2026', observer: 'L. Park (PM)', location: 'Crane Staging Area', description: 'Rigger performed thorough pre-use equipment inspection before lift without prompting', trade: 'Crane Operator', status: 'Closed', corrective_action: null },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('safety-platform', PORT, (server) => {

  server.tool(
    'list_incidents',
    'List safety incidents for a project. Returns incident ID, type, date, location, OSHA recordable status, injured party, root cause, corrective actions, and days open. Flag [ALERT] on open OSHA-recordable incidents.',
    {
      project_id: z.string().describe('Project ID or name'),
      date_from: z.string().optional().describe('Start date MM/DD/YYYY'),
      date_to: z.string().optional().describe('End date MM/DD/YYYY'),
      osha_recordable: z.boolean().optional().describe('Filter to OSHA recordable only'),
      status: z.enum(['open', 'closed', 'all']).optional().default('all'),
    },
    async ({ project_id, osha_recordable, status }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/incidents`)
        let data = (live ?? MOCK_INCIDENTS) as typeof MOCK_INCIDENTS
        if (osha_recordable !== undefined) data = data.filter(i => i.osha_recordable === osha_recordable)
        if (status !== 'all') data = data.filter(i => i.status.toLowerCase() === status)
        const openRecordable = data.filter(i => i.osha_recordable && i.status === 'Open').length
        return ok({ incidents: data, total: data.length, open_recordable: openRecordable, source: live ? 'live' : 'mock' })
      } catch (e) { return fail(String(e)) }
    },
  )

  server.tool(
    'get_osha_compliance_status',
    'Get OSHA compliance checklist status by category. Returns compliance score, open violations, inspection dates, and corrective actions required. Flag categories below 80% with [ALERT].',
    {
      project_id: z.string().describe('Project ID or name'),
      category: z.enum(['ppe', 'fall_protection', 'excavation', 'electrical', 'hazcom', 'all']).optional().default('all'),
    },
    async ({ project_id, category }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/compliance`)
        let data = (live ?? MOCK_COMPLIANCE) as typeof MOCK_COMPLIANCE
        if (category !== 'all') data = data.filter(c => c.category.toLowerCase().replace(/[^a-z]/g, '').includes(category.replace(/_/g, '')))
        const overallScore = Math.round(data.reduce((s, c) => s + c.score, 0) / data.length)
        const openViolations = data.reduce((s, c) => s + c.violations_open, 0)
        return ok({ categories: data, overall_score: overallScore, total_open_violations: openViolations, source: live ? 'live' : 'mock' })
      } catch (e) { return fail(String(e)) }
    },
  )

  server.tool(
    'list_toolbox_talks',
    'List toolbox talk records including topic, date delivered, attendees, presenter, completion percentage, and required upcoming topics. Flag overdue required talks with [ALERT].',
    {
      project_id: z.string().describe('Project ID or name'),
      required_only: z.boolean().optional().describe('Only show required/undelivered talks'),
      date_from: z.string().optional().describe('Filter from date MM/DD/YYYY'),
    },
    async ({ project_id, required_only }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/toolbox-talks`)
        let data = (live ?? MOCK_TOOLBOX_TALKS) as typeof MOCK_TOOLBOX_TALKS
        if (required_only) data = data.filter(t => t.required)
        const overdue = data.filter(t => t.status.includes('Overdue')).length
        return ok({ talks: data, total: data.length, overdue_count: overdue, source: live ? 'live' : 'mock' })
      } catch (e) { return fail(String(e)) }
    },
  )

  server.tool(
    'get_safety_metrics',
    'Get project safety KPIs including TRIR, DART rate, near miss frequency, manhours, and trend vs prior period. Compares against industry averages (BLS construction).',
    {
      project_id: z.string().describe('Project ID or name'),
      period: z.enum(['mtd', 'ytd', 'project_to_date']).optional().default('ytd'),
    },
    async ({ project_id }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/metrics`)
        return ok(live ?? { ...MOCK_METRICS, project_id })
      } catch (e) { return fail(String(e)) }
    },
  )

  server.tool(
    'list_safety_observations',
    'List safety observations (positive and at-risk) filed by supervisors. Returns observer, date, location, type, description, and corrective action status.',
    {
      project_id: z.string().describe('Project ID or name'),
      type: z.enum(['positive', 'at_risk', 'all']).optional().default('all'),
      open_only: z.boolean().optional().describe('Only return observations with open corrective actions'),
    },
    async ({ project_id, type, open_only }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/observations`)
        let data = (live ?? MOCK_OBSERVATIONS) as typeof MOCK_OBSERVATIONS
        if (type !== 'all') data = data.filter(o => o.type.toLowerCase().replace('-', '_') === type)
        if (open_only) data = data.filter(o => o.status === 'Open')
        const positive = data.filter(o => o.type === 'Positive').length
        const atRisk = data.filter(o => o.type === 'At-Risk').length
        return ok({ observations: data, total: data.length, positive_count: positive, at_risk_count: atRisk, source: live ? 'live' : 'mock' })
      } catch (e) { return fail(String(e)) }
    },
  )

  server.tool(
    'create_incident_report',
    'Create a new safety incident report in the safety management platform. Returns created incident ID and confirmation.',
    {
      project_id: z.string().describe('Project ID'),
      type: z.string().describe('Incident type (e.g. Near Miss, First Aid, Recordable, Property Damage)'),
      date: z.string().describe('Incident date MM/DD/YYYY'),
      location: z.string().describe('Location on site'),
      description: z.string().describe('Detailed description of what occurred'),
      injured_party: z.string().optional().describe('Name and trade of injured party, or "None"'),
      osha_recordable: z.boolean().optional().default(false),
      immediate_actions: z.string().optional().describe('Immediate corrective actions taken'),
    },
    async ({ project_id, type, date, location, description, injured_party, osha_recordable, immediate_actions }) => {
      try {
        const live = await safetyFetch(`/projects/${encodeURIComponent(project_id)}/incidents`)
        if (live) return ok(live)
        const newId = `INC-${project_id}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`
        return ok({
          id: newId, type, date, location, description,
          injured_party: injured_party ?? 'None',
          osha_recordable, status: 'Open',
          immediate_actions: immediate_actions ?? 'Pending investigation',
          created: new Date().toLocaleDateString('en-US'),
          source: 'mock-write',
        })
      } catch (e) { return fail(String(e)) }
    },
  )
})
