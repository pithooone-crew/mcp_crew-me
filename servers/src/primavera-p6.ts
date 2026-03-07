import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3003
const BASE = process.env.P6_BASE_URL ?? 'http://localhost:8080/p6ws/services'
const USERNAME = process.env.P6_USERNAME ?? ''
const PASSWORD = process.env.P6_PASSWORD ?? ''

async function p6Fetch(path: string) {
  if (!USERNAME || !PASSWORD) return null
  const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
  return apiFetch(`${BASE}${path}`, token)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CRITICAL_PATH = [
  { activity: 'ACT-2240-C14', description: 'Level 14 Concrete Deck Pour', wbs: '2240.STR.14', baseline_start: '02/24/2026', actual_start: '03/07/2026', baseline_finish: '03/06/2026', forecast_finish: '03/14/2026', float: 0, status: 'In Progress', delay_days: 11 },
  { activity: 'ACT-2240-C15', description: 'Level 15 Rebar Placement', wbs: '2240.STR.15', baseline_start: '03/02/2026', actual_start: null, baseline_finish: '03/09/2026', forecast_finish: '03/16/2026', float: 0, status: 'Not Started', delay_days: 5 },
  { activity: 'ACT-2240-ME12', description: 'MEP Rough-in Levels 12-13', wbs: '2240.MEP.12', baseline_start: '03/01/2026', actual_start: null, baseline_finish: '03/20/2026', forecast_finish: '03/26/2026', float: 2, status: 'Not Started', delay_days: 6 },
  { activity: 'ACT-2240-EXT', description: 'Exterior Facade Panel Install — Zone A', wbs: '2240.EXT.A', baseline_start: '03/15/2026', actual_start: null, baseline_finish: '04/30/2026', forecast_finish: '04/30/2026', float: 0, status: 'Scheduled', delay_days: 0 },
  { activity: 'ACT-2240-C16', description: 'Level 16 Concrete Deck Pour', wbs: '2240.STR.16', baseline_start: '03/10/2026', actual_start: null, baseline_finish: '03/22/2026', forecast_finish: '04/02/2026', float: 0, status: 'Not Started', delay_days: 11 },
]

const MOCK_BASELINE = {
  project: 'Riverside Tower (RT-2240)',
  baseline: 'BL-01 — Original Contract',
  data_date: '03/07/2026',
  overall_status: '12 days behind on critical path',
  schedule_performance_index: 0.87,
  percent_complete: 34,
  milestones: [
    { milestone: 'Structural Topping Out', baseline: '05/15/2026', forecast: '06/01/2026', variance: -17, status: 'At Risk' },
    { milestone: 'Enclosure Complete', baseline: '07/30/2026', forecast: '08/15/2026', variance: -16, status: 'At Risk' },
    { milestone: 'MEP Substantial Completion', baseline: '09/15/2026', forecast: '09/22/2026', variance: -7, status: 'Watch' },
    { milestone: 'Final Completion', baseline: '11/01/2026', forecast: '11/10/2026', variance: -9, status: 'Watch' },
  ],
}

const MOCK_LOOKAHEAD = [
  { activity: 'ACT-2240-C14', description: 'Level 14 Concrete Deck Pour', crew: 'Allied Concrete Co.', start: '03/07/2026', finish: '03/14/2026', manpower: 28, equipment: 'Pump truck + crane', constraints: 'Weather hold possible 03/09' },
  { activity: 'ACT-2240-ME12A', description: 'Level 12 MEP Stub-up Install', crew: 'Apex MEP Group', start: '03/09/2026', finish: '03/16/2026', manpower: 14, equipment: 'Scissor lift', constraints: 'RFI-0183 resolution required' },
  { activity: 'ACT-2240-STLS', description: 'Level 15 Structural Steel Erection', crew: 'SteelCraft Inc.', start: '03/11/2026', finish: '03/25/2026', manpower: 22, equipment: 'Tower crane (3 days)', constraints: 'Steel delivery confirmed 03/10' },
  { activity: 'ACT-2240-EXT8', description: 'Curtain Wall Level 8-10 Install', crew: 'Permasteelisa Group', start: '03/07/2026', finish: '03/28/2026', manpower: 18, equipment: 'Swing stage', constraints: 'None' },
]

const MOCK_RESOURCES = [
  { resource: 'Allied Concrete Co.', role: 'Concrete Subcontractor', budgeted_hours: 12400, actual_hours: 8920, remaining_hours: 5800, percent_loaded: 72, cost_at_completion: 5047230, budget: 4200000, variance: -847230 },
  { resource: 'SteelCraft Inc.', role: 'Structural Steel', budgeted_hours: 8200, actual_hours: 6100, remaining_hours: 2400, percent_loaded: 74, cost_at_completion: 3087400, budget: 3100000, variance: 12600 },
  { resource: 'Apex MEP Group', role: 'MEP Subcontractor', budgeted_hours: 18600, actual_hours: 6200, remaining_hours: 14800, percent_loaded: 33, cost_at_completion: 5720000, budget: 5600000, variance: -120000 },
  { resource: 'Permasteelisa Group', role: 'Facade Contractor', budgeted_hours: 6400, actual_hours: 1200, remaining_hours: 5800, percent_loaded: 19, cost_at_completion: 4200000, budget: 4100000, variance: -100000 },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('primavera-p6', PORT, (server) => {

  server.tool(
    'get_critical_path',
    'Get critical path activities from Primavera P6 CPM schedule. Returns activity IDs, descriptions, WBS, baseline vs actual dates, total float, status, and delay days. Float = 0 means on critical path.',
    {
      project_id: z.string().describe('P6 project ID (e.g. RT-2240)'),
      week: z.enum(['current', 'next', '2weeks']).optional().default('current').describe('Timeframe to filter activities'),
      wbs_code: z.string().optional().describe('Filter by WBS code prefix (e.g. "2240.STR")'),
    },
    async ({ project_id, week, wbs_code }) => {
      try {
        const live = await p6Fetch(`/project/${project_id}/activities?float=0&week=${week}`)
        let data = (live ?? MOCK_CRITICAL_PATH) as typeof MOCK_CRITICAL_PATH
        if (wbs_code) data = data.filter(a => a.wbs.startsWith(wbs_code))
        return ok({ critical_path: data, total_activities: data.length, source: live ? 'p6-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'compare_baseline',
    'Compare current schedule against a P6 baseline. Returns overall schedule variance, SPI, percent complete, milestone forecasts vs baseline, and delay summary.',
    {
      project_id: z.string().describe('P6 project ID'),
      baseline: z.string().optional().default('BL-01').describe('Baseline identifier (e.g. BL-01, BL-02)'),
    },
    async ({ project_id, baseline }) => {
      try {
        const live = await p6Fetch(`/project/${project_id}/baseline/${baseline}/compare`)
        return ok(live ?? { ...MOCK_BASELINE, baseline, project_id })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_lookahead',
    'Get 3-week lookahead schedule from P6. Returns upcoming activities with crew assignments, manpower, equipment, and constraints.',
    {
      project_id: z.string().describe('P6 project ID'),
      weeks: z.number().min(1).max(6).optional().default(3).describe('Number of weeks to look ahead'),
      subcontractor: z.string().optional().describe('Filter by subcontractor name'),
    },
    async ({ project_id, weeks, subcontractor }) => {
      try {
        const live = await p6Fetch(`/project/${project_id}/lookahead?weeks=${weeks}`)
        let data = (live ?? MOCK_LOOKAHEAD) as typeof MOCK_LOOKAHEAD
        if (subcontractor) data = data.filter(a => a.crew.toLowerCase().includes(subcontractor.toLowerCase()))
        return ok({ lookahead: data, weeks, total: data.length, source: live ? 'p6-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_resource_loading',
    'Get resource loading and cost report from P6. Returns budgeted vs actual hours, remaining hours, percent loaded, and cost variance per subcontractor or resource.',
    {
      project_id: z.string().describe('P6 project ID'),
      resource_type: z.enum(['labor', 'equipment', 'material', 'all']).optional().default('all'),
    },
    async ({ project_id, resource_type }) => {
      try {
        const live = await p6Fetch(`/project/${project_id}/resources?type=${resource_type}`)
        return ok({ resources: live ?? MOCK_RESOURCES, source: live ? 'p6-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
