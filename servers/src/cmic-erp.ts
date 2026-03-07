import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3007
const BASE = process.env.CMIC_BASE_URL ?? 'https://your-cmic-instance.com/api'
const API_KEY = process.env.CMIC_API_KEY ?? ''

async function cmicFetch(path: string) {
  if (!API_KEY) return null
  return apiFetch(`${BASE}${path}`, API_KEY)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PORTFOLIO = [
  { project: 'Riverside Tower (2240)', value: 127000000, budget_status: 'OVER', overrun_pct: 7.3, overrun_amt: 9271000, schedule_days: -12, phase: 'Structure', health: 'At Risk', pm: 'S. Chen' },
  { project: 'Harbor District Office (2238)', value: 89000000, budget_status: 'ON', overrun_pct: 1.2, overrun_amt: 1068000, schedule_days: 2, phase: 'MEP Rough-In', health: 'On Track', pm: 'R. Davis' },
  { project: 'Lakefront Retail Center (2235)', value: 43000000, budget_status: 'UNDER', overrun_pct: -2.1, overrun_amt: -903000, schedule_days: 5, phase: 'Finishes', health: 'On Track', pm: 'T. Williams' },
  { project: 'Midtown Mixed-Use (2242)', value: 25000000, budget_status: 'ON', overrun_pct: 0.4, overrun_amt: 100000, schedule_days: 0, phase: 'Foundations', health: 'On Track', pm: 'L. Brown' },
]

const MOCK_JOB_COST = [
  { cost_type: 'Subcontracts', budget: 98400000, committed: 97800000, actual: 54200000, projected_final: 99100000, variance: -700000 },
  { cost_type: 'Owner Direct Costs', budget: 8200000, committed: 8050000, actual: 4100000, projected_final: 8300000, variance: -100000 },
  { cost_type: 'General Conditions', budget: 6800000, committed: 6750000, actual: 3400000, projected_final: 7100000, variance: -300000 },
  { cost_type: 'Contingency', budget: 5400000, committed: 1200000, actual: 850000, projected_final: 1200000, variance: 4200000 },
  { cost_type: 'Owner Contingency', budget: 8200000, committed: 847230, actual: 847230, projected_final: 847230, variance: 7352770 },
]

const MOCK_CHANGE_ORDERS = [
  { co_number: 'CO-2240-041', project: 'Riverside Tower', description: 'Level 14 concrete over-pour — weather delay recovery', amount: 287400, submitted: '02/28/2026', age_days: 7, status: 'Pending Owner', priority: 'High', contract_value_impact: 287400 },
  { co_number: 'CO-2240-042', project: 'Riverside Tower', description: 'MEP system upgrade — tenant improvement allowance', amount: 412000, submitted: '03/02/2026', age_days: 5, status: 'Pending Owner', priority: 'Medium', contract_value_impact: 412000 },
  { co_number: 'CO-2238-019', project: 'Harbor District Office', description: 'Unforeseen underground obstruction — rock removal', amount: 198000, submitted: '03/01/2026', age_days: 6, status: 'Pending Owner', priority: 'High', contract_value_impact: 198000 },
  { co_number: 'CO-2238-020', project: 'Harbor District Office', description: 'LEED documentation additional services', amount: 45000, submitted: '02/24/2026', age_days: 11, status: 'Pending Owner', priority: 'Low', contract_value_impact: 45000 },
  { co_number: 'CO-2235-031', project: 'Lakefront Retail', description: 'Tenant sign package revisions', amount: 127000, submitted: '03/05/2026', age_days: 2, status: 'Pending Owner', priority: 'Medium', contract_value_impact: 127000 },
  { co_number: 'CO-2242-008', project: 'Midtown Mixed-Use', description: 'Foundation design modification — soil condition', amount: 178000, submitted: '02/20/2026', age_days: 15, status: 'Pending Owner', priority: 'High', contract_value_impact: 178000 },
]

const MOCK_AP_INVOICES = [
  { invoice: 'INV-2240-0891', vendor: 'Allied Concrete Co.', project: 'Riverside Tower', amount: 1240000, submitted: '02/01/2026', age_days: 34, payment_terms: 'Net 45', status: 'PM Review', pm: 'S. Chen' },
  { invoice: 'INV-2240-0897', vendor: 'Apex MEP Group', project: 'Riverside Tower', amount: 890000, submitted: '02/14/2026', age_days: 21, payment_terms: 'Net 30', status: 'Owner Approval', pm: 'S. Chen' },
  { invoice: 'INV-2238-0312', vendor: 'Harbor Steel Works', project: 'Harbor District Office', amount: 1420000, submitted: '02/21/2026', age_days: 14, payment_terms: 'Net 30', status: 'PM Review', pm: 'R. Davis' },
  { invoice: 'INV-2238-0318', vendor: 'Permasteelisa Group', project: 'Harbor District Office', amount: 750000, submitted: '02/28/2026', age_days: 7, payment_terms: 'Net 30', status: 'Pending Receipt', pm: 'R. Davis' },
  { invoice: 'INV-2235-0204', vendor: 'Interior Systems Co.', project: 'Lakefront Retail', amount: 340000, submitted: '03/02/2026', age_days: 5, payment_terms: 'Net 30', status: 'Pending Receipt', pm: 'T. Williams' },
]

const MOCK_CASH_FLOW = {
  period: 'Q1 2026',
  total_contracted: 284000000,
  cumulative_billed: 62400000,
  cumulative_paid: 58100000,
  forecast_spend: 8200000,
  actual_spend: 7600000,
  variance: 600000,
  monthly: [
    { month: 'January 2026', forecast: 7800000, actual: 7200000, variance: 600000 },
    { month: 'February 2026', forecast: 8400000, actual: 8100000, variance: 300000 },
    { month: 'March 2026 (Partial)', forecast: 8200000, actual: 7600000, variance: 600000 },
  ],
}

const MOCK_CONTRACTS = [
  { contract: 'SUBK-2240-001', vendor: 'Allied Concrete Co.', scope: 'Concrete — All Structures', original_value: 4200000, current_value: 5047230, change_orders: 3, retention: 5, status: 'Active — In Default Risk', expiry: '09/15/2026' },
  { contract: 'SUBK-2240-002', vendor: 'SteelCraft Inc.', scope: 'Structural Steel', original_value: 3100000, current_value: 3087400, change_orders: 0, retention: 5, status: 'Active — Compliant', expiry: '08/30/2026' },
  { contract: 'SUBK-2240-003', vendor: 'Apex MEP Group', scope: 'Mechanical, Electrical, Plumbing', original_value: 5600000, current_value: 5720000, change_orders: 2, retention: 5, status: 'Active — Monitor', expiry: '10/15/2026' },
  { contract: 'SUBK-2240-004', vendor: 'Permasteelisa Group', scope: 'Curtain Wall / Exterior Envelope', original_value: 4100000, current_value: 4100000, change_orders: 0, retention: 10, status: 'Active — Compliant', expiry: '09/01/2026' },
]

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('cmic-erp', PORT, (server) => {

  server.tool(
    'get_portfolio_summary',
    'Get executive portfolio summary from CMiC ERP. Returns all active projects with contracted value, budget status, overrun %, schedule variance in days, project phase, and overall health rating.',
    {
      status: z.enum(['active', 'closed', 'all']).optional().default('active'),
      health: z.enum(['on_track', 'at_risk', 'critical', 'all']).optional().default('all'),
    },
    async ({ status, health }) => {
      try {
        const live = await cmicFetch(`/v1/portfolio?status=${status}`)
        let data = (live ?? MOCK_PORTFOLIO) as typeof MOCK_PORTFOLIO
        if (health && health !== 'all') data = data.filter(p => p.health.toLowerCase().replace(' ', '_') === health.toLowerCase())
        const totalValue = data.reduce((sum, p) => sum + p.value, 0)
        return ok({ projects: data, total_projects: data.length, total_value: totalValue, source: live ? 'cmic-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_job_cost_report',
    'Get detailed job cost report from CMiC ERP. Returns budget, committed, actual, projected final cost, and variance by cost type (subcontracts, GC, contingency, etc.).',
    {
      project: z.string().describe('CMiC project number (e.g. 2240)'),
      group_by: z.enum(['cost_type', 'cost_code', 'subcontractor', 'phase']).optional().default('cost_type'),
    },
    async ({ project, group_by }) => {
      try {
        const live = await cmicFetch(`/v1/projects/${project}/job-cost?group_by=${group_by}`)
        return ok({ project, cost_data: live ?? MOCK_JOB_COST, source: live ? 'cmic-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_change_orders',
    'Get change orders from CMiC ERP across all projects or a specific project. Returns CO number, project, description, amount, age, approval status, and schedule impact.',
    {
      project: z.string().optional().describe('Filter by project number, or omit for all projects'),
      status: z.enum(['pending_approval', 'approved', 'rejected', 'all']).optional().default('pending_approval'),
      approver: z.enum(['owner', 'pm', 'all']).optional().default('all'),
    },
    async ({ project, status, approver }) => {
      try {
        const path = project ? `/v1/projects/${project}/change-orders` : `/v1/change-orders?status=${status}`
        const live = await cmicFetch(path)
        let data = (live ?? MOCK_CHANGE_ORDERS) as typeof MOCK_CHANGE_ORDERS
        if (project) data = data.filter(co => co.project.includes(project))
        if (approver === 'owner') data = data.filter(co => co.status.includes('Owner'))
        const totalExposure = data.reduce((sum, co) => sum + co.amount, 0)
        return ok({ change_orders: data, total: data.length, total_exposure: totalExposure, source: live ? 'cmic-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_ap_invoices',
    'Get Accounts Payable invoices pending approval from CMiC ERP. Returns invoice number, vendor, project, amount, age, payment terms, and approval status.',
    {
      project: z.string().optional().describe('Filter by project number, or omit for all projects'),
      status: z.enum(['pending', 'pm_review', 'owner_approval', 'approved', 'paid', 'all']).optional().default('pending'),
      min_age_days: z.number().optional().describe('Only show invoices older than N days'),
    },
    async ({ project, status, min_age_days }) => {
      try {
        const live = await cmicFetch(`/v1/ap/invoices?status=${status}`)
        let data = (live ?? MOCK_AP_INVOICES) as typeof MOCK_AP_INVOICES
        if (project && project !== 'all') data = data.filter(i => i.project.includes(project))
        if (min_age_days) data = data.filter(i => i.age_days >= min_age_days)
        const totalPending = data.reduce((sum, i) => sum + i.amount, 0)
        return ok({ invoices: data, total: data.length, total_amount: totalPending, source: live ? 'cmic-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_cash_flow_forecast',
    'Get project cash flow forecast vs actual spend from CMiC ERP. Returns monthly forecast, actual, and variance with period summary.',
    {
      project: z.string().optional().describe('Project number, or omit for portfolio-level'),
      period: z.string().optional().default('Q1_2026').describe('Period identifier (e.g. Q1_2026, 2026)'),
    },
    async ({ project, period }) => {
      try {
        const path = project ? `/v1/projects/${project}/cash-flow?period=${period}` : `/v1/portfolio/cash-flow?period=${period}`
        const live = await cmicFetch(path)
        return ok(live ?? { ...MOCK_CASH_FLOW, period, project: project ?? 'portfolio' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_contract_compliance',
    'Get contract compliance status for all active vendors from CMiC ERP. Returns contract number, vendor, scope, original vs current value, change order count, retention, and compliance status.',
    {
      project: z.string().describe('Project number (e.g. 2240)'),
      status: z.enum(['active', 'expired', 'at_risk', 'all']).optional().default('active'),
    },
    async ({ project, status }) => {
      try {
        const live = await cmicFetch(`/v1/projects/${project}/contracts?status=${status}`)
        let data = (live ?? MOCK_CONTRACTS) as typeof MOCK_CONTRACTS
        if (status !== 'all') data = data.filter(c => c.status.toLowerCase().includes(status.toLowerCase().replace('_', '-')))
        return ok({ contracts: data, total: data.length, source: live ? 'cmic-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
