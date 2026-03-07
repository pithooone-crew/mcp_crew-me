import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3010
const BASE = process.env.SAGE_BASE_URL ?? 'https://api.sage.com/estimating/v1'
const API_KEY = process.env.SAGE_API_KEY ?? ''

async function sageFetch(path: string) {
  if (!API_KEY) return null
  return apiFetch(`${BASE}${path}`, API_KEY)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ESTIMATE_SUMMARY = [
  { division: 'Div 01 - General Conditions', estimate: 387000, market_low: 350000, market_high: 420000, confidence: 'High', basis: 'Duration-based' },
  { division: 'Div 03 - Concrete', estimate: 892400, market_low: 820000, market_high: 960000, confidence: 'High', basis: 'STACK quantity takeoff' },
  { division: 'Div 05 - Structural Steel', estimate: 1240000, market_low: 1180000, market_high: 1380000, confidence: 'Medium', basis: 'AISC price index + fabrication' },
  { division: 'Div 09 - Finishes', estimate: 680000, market_low: 620000, market_high: 750000, confidence: 'High', basis: 'Sub quote + historical' },
  { division: 'Div 15 - Mechanical', estimate: 820000, market_low: 780000, market_high: 920000, confidence: 'Low', basis: 'Conceptual SF rate' },
  { division: 'Div 16 - Electrical', estimate: 650000, market_low: 600000, market_high: 720000, confidence: 'Low', basis: 'Conceptual SF rate' },
]

const MOCK_HISTORICAL = [
  { project: 'Eastside Community Recreation Center', year: 2024, sf: 28400, total_cost: 4410000, cost_per_sf: 155.28, location: 'Seattle, WA', escalation_adjusted: 4617600 },
  { project: 'Ridgeline Civic Center', year: 2023, sf: 32100, total_cost: 4920000, cost_per_sf: 153.27, location: 'Bellevue, WA', escalation_adjusted: 5302800 },
  { project: 'Harbor View Community Hub', year: 2024, sf: 24800, total_cost: 3902000, cost_per_sf: 157.34, location: 'Tacoma, WA', escalation_adjusted: 4089600 },
]

const MOCK_BID_LEVELING = [
  {
    trade: 'Division 09 - Finishes',
    itb: 'ITB-2244-006',
    low_bid: 620000,
    high_bid: 750000,
    spread_pct: 21.0,
    estimate: 680000,
    bids: [
      { bidder: 'Pacific Interiors', amount: 620000, scope_complete: true, alternates: 2, qualifications: 'Paint allowance TBD', leveled_amount: 638000 },
      { bidder: 'Artisan Finish Group', amount: 665000, scope_complete: true, alternates: 1, qualifications: 'None', leveled_amount: 665000 },
      { bidder: 'Interior Systems Co.', amount: 698000, scope_complete: true, alternates: 0, qualifications: 'None', leveled_amount: 698000 },
      { bidder: 'Pro-Finish Contractors', amount: 712000, scope_complete: false, alternates: 0, qualifications: 'Excludes resilient base', leveled_amount: 736000 },
      { bidder: 'Western Interiors', amount: 750000, scope_complete: true, alternates: 0, qualifications: 'Premium drywall spec', leveled_amount: 750000 },
    ],
    recommendation: 'Pacific Interiors at leveled $638,000 — confirm paint allowance resolution',
  },
]

const MOCK_COST_HISTORY = [
  { item: 'Ready-Mix Concrete — 6000 PSI', unit: 'CY', current_cost: 215, historical_avg_1yr: 195, historical_avg_3yr: 182, trend: '+10.3%', source: 'RSMeans 2026 Q1' },
  { item: 'Structural Steel — Wide Flange (Erected)', unit: 'TON', current_cost: 3980, historical_avg_1yr: 3650, historical_avg_3yr: 3210, trend: '+9.0%', source: 'AISC + Local Quotes' },
  { item: 'Drywall — 5/8" Type X (Installed)', unit: 'SF', current_cost: 4.85, historical_avg_1yr: 4.40, historical_avg_3yr: 4.10, trend: '+10.2%', source: 'Sub Quote Average' },
  { item: 'HVAC — General Office (Conceptual)', unit: 'SF', current_cost: 28.50, historical_avg_1yr: 26.80, historical_avg_3yr: 24.20, trend: '+6.3%', source: 'Sage Cost Database' },
  { item: 'Electrical — General Office (Conceptual)', unit: 'SF', current_cost: 22.40, historical_avg_1yr: 21.20, historical_avg_3yr: 19.80, trend: '+5.7%', source: 'Sage Cost Database' },
]

const MOCK_ESTIMATE_DETAIL = {
  project: 'Northside Community Center',
  estimate_id: 'EST-NCC-003',
  version: 'Rev 2',
  estimator: 'K. Thompson',
  date: '03/05/2026',
  status: 'In Progress',
  base_bid: 4669400,
  markup_overhead: 280164,
  markup_profit: 280164,
  total_bid: 5229728,
  contingency_pct: 5.0,
  contingency_amt: 233471,
  bond: 52297,
  grand_total: 5515496,
  divisions: MOCK_ESTIMATE_SUMMARY,
}

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('sage-estimating', PORT, (server) => {

  server.tool(
    'get_estimate_summary',
    'Get base bid estimate summary from Sage Estimating by CSI division. Returns estimated cost, market low/high range, confidence level, and basis for each division.',
    {
      project: z.string().describe('Project name or Sage estimate ID'),
      estimate_version: z.string().optional().describe('Estimate version (defaults to latest)'),
    },
    async ({ project, estimate_version }) => {
      try {
        const live = await sageFetch(`/estimates/${encodeURIComponent(project)}/summary?version=${estimate_version}`)
        const data = live ?? MOCK_ESTIMATE_SUMMARY
        const baseBid = MOCK_ESTIMATE_SUMMARY.reduce((sum, d) => sum + d.estimate, 0)
        return ok({ divisions: data, base_bid: baseBid, markup_pct: 12, total_bid: Math.round(baseBid * 1.12), source: live ? 'sage-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_historical_comparison',
    'Compare current estimate to historical similar projects from Sage Estimating database. Returns project name, year, SF, total cost, cost per SF, location, and escalation-adjusted comparable.',
    {
      project_type: z.string().describe('Building type for comparison (e.g. community_center, office, retail)'),
      count: z.number().min(1).max(10).optional().default(3).describe('Number of comparable projects to return'),
      max_age_years: z.number().optional().default(3).describe('Maximum age of historical projects in years'),
    },
    async ({ project_type, count, max_age_years }) => {
      try {
        const live = await sageFetch(`/historical/${encodeURIComponent(project_type)}?count=${count}&max_age=${max_age_years}`)
        const data = ((live as typeof MOCK_HISTORICAL | null) ?? MOCK_HISTORICAL).slice(0, count)
        const avgCostPerSF = data.reduce((sum, p) => sum + p.cost_per_sf, 0) / data.length
        return ok({ comparables: data, avg_cost_per_sf: avgCostPerSF.toFixed(2), source: live ? 'sage-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_bid_leveling',
    'Get bid leveling analysis for a specific trade from Sage Estimating. Returns all bids received, scope completeness, qualifications, leveled amount, spread, and recommendation.',
    {
      project: z.string().describe('Project name or ID'),
      trade: z.string().describe('Trade or division to level (e.g. "Division 09", "Concrete")'),
    },
    async ({ project, trade }) => {
      try {
        const live = await sageFetch(`/estimates/${encodeURIComponent(project)}/bid-leveling?trade=${encodeURIComponent(trade)}`)
        const data = (live ?? MOCK_BID_LEVELING) as typeof MOCK_BID_LEVELING
        const match = data.find(d => d.trade.toLowerCase().includes(trade.toLowerCase())) ?? data[0]
        return ok(live ?? match)
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_cost_history',
    'Get historical unit cost data from Sage Estimating cost database. Returns current cost, 1-year average, 3-year average, trend, and source for common construction materials and labor.',
    {
      items: z.array(z.string()).optional().describe('Specific items to look up (e.g. ["concrete", "steel"]). Omit for all.'),
    },
    async ({ items }) => {
      try {
        const live = await sageFetch(`/cost-history`)
        let data = (live ?? MOCK_COST_HISTORY) as typeof MOCK_COST_HISTORY
        if (items && items.length) data = data.filter(d => items.some(item => d.item.toLowerCase().includes(item.toLowerCase())))
        return ok({ cost_data: data, as_of: '03/07/2026', source: live ? 'sage-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_estimate_detail',
    'Get full estimate detail including base bid, markup breakdown, contingency, bond, and grand total from Sage Estimating.',
    {
      project: z.string().describe('Project name or Sage estimate ID'),
    },
    async ({ project }) => {
      try {
        const live = await sageFetch(`/estimates/${encodeURIComponent(project)}/detail`)
        return ok(live ?? { ...MOCK_ESTIMATE_DETAIL, project })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
