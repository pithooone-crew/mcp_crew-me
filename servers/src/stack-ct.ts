import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3008
const BASE = process.env.STACK_BASE_URL ?? 'https://api.stackct.com/v1'
const API_KEY = process.env.STACK_API_KEY ?? ''

async function stackFetch(path: string) {
  if (!API_KEY) return null
  return apiFetch(`${BASE}${path}`, API_KEY)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TAKEOFF_SUMMARY = [
  { item: 'Slab on Grade — 6" NW Concrete', quantity: 47230, unit: 'SF', csi: '03 30 00', unit_cost: 12.40, total_cost: 585652 },
  { item: 'Reinforcing Steel — #5 @ 12" EW', quantity: 94460, unit: 'LF', csi: '03 20 00', unit_cost: 1.85, total_cost: 174751 },
  { item: 'Vapor Barrier — 10 mil', quantity: 47230, unit: 'SF', csi: '07 26 00', unit_cost: 0.65, total_cost: 30700 },
  { item: 'Concrete Finishing — Steel Trowel', quantity: 47230, unit: 'SF', csi: '03 35 00', unit_cost: 1.20, total_cost: 56676 },
  { item: 'Control Joints — Saw-cut', quantity: 2840, unit: 'LF', csi: '03 15 00', unit_cost: 2.85, total_cost: 8094 },
  { item: 'Edge Forms', quantity: 920, unit: 'LF', csi: '03 11 00', unit_cost: 4.10, total_cost: 3772 },
]

const MOCK_QUANTITIES_BY_DIVISION = [
  { division: 'Div 03 - Concrete', items: 14, total_quantity_sf: 47230, total_quantity_cy: 1286, labor_hours: 3840, material_cost: 892400 },
  { division: 'Div 05 - Structural Steel', items: 8, total_quantity_tons: 312, total_quantity_lf: 18420, labor_hours: 2200, material_cost: 1240000 },
  { division: 'Div 07 - Thermal & Moisture', items: 6, total_quantity_sf: 28400, total_quantity_lf: 920, labor_hours: 840, material_cost: 187000 },
  { division: 'Div 09 - Finishes', items: 12, total_quantity_sf: 42100, labor_hours: 5200, material_cost: 680000 },
  { division: 'Div 15 - Mechanical', items: 9, total_quantity_lf: 8400, ea: 42, labor_hours: 2800, material_cost: 820000 },
  { division: 'Div 16 - Electrical', items: 11, total_quantity_lf: 12800, ea: 340, labor_hours: 3100, material_cost: 650000 },
]

const MOCK_SHEETS = [
  { sheet_id: 'SHT-001', name: 'S-402 Rev 3 — Level 4 Structural Plan', discipline: 'Structural', scale: '1/8" = 1\'', linked_estimate: 'EST-NCC-003', status: 'Takeoff Complete', total_items: 6, last_measured: '03/05/2026' },
  { sheet_id: 'SHT-002', name: 'A-201 Rev 2 — Level 2 Floor Plan', discipline: 'Architectural', scale: '1/8" = 1\'', linked_estimate: 'EST-NCC-001', status: 'In Progress', total_items: 12, last_measured: '03/06/2026' },
  { sheet_id: 'SHT-003', name: 'M-101 Rev 1 — HVAC Floor Plan', discipline: 'Mechanical', scale: '1/8" = 1\'', linked_estimate: 'EST-NCC-005', status: 'Not Started', total_items: 0, last_measured: null },
  { sheet_id: 'SHT-004', name: 'E-201 Rev 1 — Electrical Floor Plan', discipline: 'Electrical', scale: '1/8" = 1\'', linked_estimate: 'EST-NCC-006', status: 'Not Started', total_items: 0, last_measured: null },
]

const MOCK_COMPARISON = {
  current_estimate: 'EST-NCC-003 (Rev 2)',
  previous_estimate: 'EST-NCC-001 (Rev 1)',
  comparison_date: '03/06/2026',
  changes: [
    { item: 'Slab on Grade — 6" NW Concrete', prev_qty: 47000, curr_qty: 47230, delta: 230, delta_pct: 0.5, reason: 'Revised boundary per S-402 Rev 3', cost_impact: 2852 },
    { item: 'Reinforcing Steel — #5 @ 12" EW', prev_qty: 94000, curr_qty: 94460, delta: 460, delta_pct: 0.5, reason: 'Matches slab area increase', cost_impact: 851 },
    { item: 'Edge Forms', prev_qty: 890, curr_qty: 920, delta: 30, delta_pct: 3.4, reason: 'Additional perimeter per structural note', cost_impact: 123 },
  ],
  total_cost_change: 3826,
}

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('stack-ct', PORT, (server) => {

  server.tool(
    'get_takeoff_summary',
    'Get digital takeoff quantity summary from STACK CT for a specific area or drawing. Returns line items with quantity, unit, CSI division, unit cost, and total cost.',
    {
      project_id: z.string().describe('STACK project ID or name'),
      area: z.string().optional().describe('Specific area or floor (e.g. "4th_floor_slab", "level_4")'),
      csi_division: z.string().optional().describe('Filter by CSI division (e.g. "03 30 00")'),
    },
    async ({ project_id, area, csi_division }) => {
      try {
        const live = await stackFetch(`/projects/${project_id}/takeoff?area=${area}`)
        let data = (live ?? MOCK_TAKEOFF_SUMMARY) as typeof MOCK_TAKEOFF_SUMMARY
        if (csi_division) data = data.filter(i => i.csi.startsWith(csi_division.slice(0, 5)))
        const totalCost = data.reduce((sum, i) => sum + i.total_cost, 0)
        const totalSF = data.find(i => i.unit === 'SF')?.quantity ?? 0
        return ok({ items: data, total_items: data.length, total_cost: totalCost, primary_area_sf: totalSF, source: live ? 'stack-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_quantities_by_division',
    'Get takeoff quantity summary grouped by CSI division from STACK CT. Returns item count, quantities in various units, labor hours, and material cost per division.',
    {
      project_id: z.string().describe('STACK project ID or name'),
      divisions: z.array(z.string()).optional().describe('Specific CSI divisions to include (e.g. ["03", "05"])'),
    },
    async ({ project_id, divisions }) => {
      try {
        const live = await stackFetch(`/projects/${project_id}/quantities/by-division`)
        let data = (live ?? MOCK_QUANTITIES_BY_DIVISION) as typeof MOCK_QUANTITIES_BY_DIVISION
        if (divisions && divisions.length) data = data.filter(d => divisions.some(div => d.division.startsWith(`Div ${div}`)))
        return ok({ divisions: data, source: live ? 'stack-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_sheets',
    'List drawing sheets in STACK CT with takeoff status. Returns sheet name, discipline, scale, linked estimate, measurement status, and item count.',
    {
      project_id: z.string().describe('STACK project ID'),
      status: z.enum(['complete', 'in_progress', 'not_started', 'all']).optional().default('all'),
      discipline: z.string().optional().describe('Filter by discipline (Structural, Architectural, Mechanical, Electrical)'),
    },
    async ({ project_id, status, discipline }) => {
      try {
        const live = await stackFetch(`/projects/${project_id}/sheets`)
        let data = (live ?? MOCK_SHEETS) as typeof MOCK_SHEETS
        if (status !== 'all') data = data.filter(s => s.status.toLowerCase().replace(' ', '_') === status.toLowerCase())
        if (discipline) data = data.filter(s => s.discipline.toLowerCase().includes(discipline.toLowerCase()))
        return ok({ sheets: data, total: data.length, source: live ? 'stack-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'compare_estimates',
    'Compare current STACK takeoff estimate to a previous version. Returns changed items with previous vs current quantities, delta, percent change, reason, and cost impact.',
    {
      project_id: z.string().describe('STACK project ID'),
      current_estimate: z.string().optional().describe('Current estimate ID (defaults to latest)'),
      previous_estimate: z.string().optional().describe('Previous estimate ID to compare against'),
    },
    async ({ project_id, current_estimate, previous_estimate }) => {
      try {
        const live = await stackFetch(`/projects/${project_id}/estimates/compare?curr=${current_estimate}&prev=${previous_estimate}`)
        return ok(live ?? { ...MOCK_COMPARISON, project_id })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
