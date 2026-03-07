import 'dotenv/config'
import { z } from 'zod'
import { createSseServer, ok, fail, apiFetch } from './shared/base.js'

const PORT = 3004
const BASE = process.env.AUTODESK_BASE_URL ?? 'https://developer.api.autodesk.com'
const CLIENT_ID = process.env.AUTODESK_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.AUTODESK_CLIENT_SECRET ?? ''

async function apsFetch(path: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  return apiFetch(`${BASE}${path}`, token)
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ELEMENTS = [
  { element_id: 'elm-4821', category: 'StructuralFraming', family: 'W-Wide Flange', type: 'W18x97', level: 'Level 14', grid: 'J/12', mark: 'B-1401', material: 'A992 Steel', length_ft: 42.5, status: 'Coordinated' },
  { element_id: 'elm-4822', category: 'StructuralFraming', family: 'W-Wide Flange', type: 'W21x111', level: 'Level 14', grid: 'K/14', mark: 'B-1402', material: 'A992 Steel', length_ft: 38.0, status: 'Coordinated' },
  { element_id: 'elm-5201', category: 'StructuralFraming', family: 'Concrete-Rectangular Beam', type: '24x36', level: 'Level 8', grid: 'J/8', mark: 'CB-801', material: '6000 PSI Concrete', length_ft: 28.0, status: 'Clash - See ACC-1039' },
  { element_id: 'elm-5844', category: 'StructuralColumn', family: 'HSS-Hollow Structural Section', type: 'HSS12x12x1/2', level: 'Level 12', grid: 'K/15', mark: 'C-1201', material: 'A500 Steel', height_ft: 14.0, status: 'RFI Pending' },
  { element_id: 'elm-6100', category: 'Walls', family: 'Curtain Wall', type: 'CW-2 Unitized Panel', level: 'Level 8-10', grid: 'Perimeter', mark: 'CW-801', material: 'Aluminum/Glass', area_sf: 4820, status: 'Shop Drawings Under Review' },
]

const MOCK_CLASH_REPORT = {
  report_date: '03/03/2026',
  model_version: 'v14 — Combined Model',
  total_clashes: 47,
  hard_clashes: 8,
  soft_clashes: 22,
  clearance_clashes: 17,
  resolved: 23,
  open: 24,
  clashes: [
    { clash_id: 'CL-0341', element_a: 'MEP Duct — 48"x24"', element_b: 'W18x97 Beam (B-1401)', location: 'Level 12 — Grid J/12-14', severity: 'Hard', distance_in: -3.5, status: 'Open', owner: 'Apex MEP Group' },
    { clash_id: 'CL-0342', element_a: 'Electrical Conduit 4"', element_b: 'Mechanical Pipe 6"', location: 'Level 10 — Electrical Room', severity: 'Soft', distance_in: 1.2, status: 'Resolved', owner: 'Apex MEP Group' },
    { clash_id: 'CL-0338', element_a: 'Plumbing Chase', element_b: 'Structural Column C-1201', location: 'Level 8 — Grid K/8', severity: 'Hard', distance_in: -2.1, status: 'In Review', owner: 'Structural EOR' },
    { clash_id: 'CL-0335', element_a: 'Sprinkler Main 4"', element_b: 'Suspended Ceiling Grid', location: 'Level 11 — Corridor E', severity: 'Soft', distance_in: 0.8, status: 'Open', owner: 'Apex MEP Group' },
  ],
}

const MOCK_MODEL_VERSIONS = [
  { version: 'v14', uploaded_by: 'J. Smith (SteelCraft)', date: '03/05/2026', file: 'Riverside Tower — Structural.rvt', changes: 'Updated Level 14-16 framing per RFI-0176 response', status: 'Current' },
  { version: 'v13', uploaded_by: 'A. Patel (Architect)', date: '02/28/2026', file: 'Riverside Tower — Architectural.rvt', changes: 'ASI-019 window sill revision; Unit A3 floor plan update', status: 'Superseded' },
  { version: 'v12', uploaded_by: 'R. Chen (MEP)', date: '02/24/2026', file: 'Riverside Tower — MEP.rvt', changes: 'Level 12 duct reroute per coordination comment CL-0341', status: 'Superseded' },
]

const MOCK_PROPERTIES = {
  element_id: 'elm-4821',
  category: 'StructuralFraming',
  family: 'W-Wide Flange',
  type: 'W18x97',
  properties: {
    mark: 'B-1401',
    level: 'Level 14',
    base_level_offset: '0\' 0"',
    length: '42\' 6"',
    material: 'A992 Steel',
    area: '4.2 SF',
    volume: '7.8 CF',
    weight: '4,120 lbs',
    structural_usage: 'Girder',
    phase_created: 'New Construction',
  },
}

// ── Tools ─────────────────────────────────────────────────────────────────────

createSseServer('autodesk-aps', PORT, (server) => {

  server.tool(
    'query_elements',
    'Query Revit model elements via Autodesk APS Model Derivative API. Returns element list with category, family, type, level, grid location, and coordination status.',
    {
      project_urn: z.string().describe('APS model URN or project name'),
      category: z.string().optional().describe('Revit category filter (e.g. StructuralFraming, Walls, MEP)'),
      level: z.string().optional().describe('Filter by level (e.g. "Level 14")'),
      view: z.string().optional().describe('View name to filter elements'),
    },
    async ({ project_urn, category, level }) => {
      try {
        const live = await apsFetch(`/modelderivative/v2/designdata/${encodeURIComponent(project_urn)}/metadata`)
        let data = (live ?? MOCK_ELEMENTS) as typeof MOCK_ELEMENTS
        if (category) data = data.filter(e => e.category.toLowerCase().includes(category.toLowerCase()))
        if (level) data = data.filter(e => 'level' in e && (e as { level?: string }).level?.toLowerCase().includes(level.toLowerCase()))
        return ok({ elements: data, total: data.length, source: live ? 'aps-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_clash_report',
    'Get clash detection report from Autodesk APS / BIM Collaborate Pro. Returns total clashes, breakdown by severity (hard/soft/clearance), and list of individual clashes with element IDs, location, and status.',
    {
      project_urn: z.string().describe('APS model or project URN'),
      severity: z.enum(['hard', 'soft', 'clearance', 'all']).optional().default('all'),
      status: z.enum(['open', 'resolved', 'in_review', 'all']).optional().default('all'),
    },
    async ({ project_urn, severity, status }) => {
      try {
        const live = await apsFetch(`/modelderivative/v2/designdata/${encodeURIComponent(project_urn)}/clashes`)
        const report = (live ?? MOCK_CLASH_REPORT) as typeof MOCK_CLASH_REPORT
        let clashes = report.clashes
        if (severity && severity !== 'all') clashes = clashes.filter(c => c.severity.toLowerCase() === severity.toLowerCase())
        if (status && status !== 'all') clashes = clashes.filter(c => c.status.toLowerCase().replace(' ', '_') === status.toLowerCase())
        return ok({ ...report, clashes, source: live ? 'aps-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'list_model_versions',
    'List model version history for a project in Autodesk APS. Returns version number, uploader, upload date, file name, change description, and current status.',
    {
      project_urn: z.string().describe('APS project URN or name'),
      discipline: z.string().optional().describe('Filter by discipline model file (e.g. Structural, MEP, Architectural)'),
    },
    async ({ project_urn, discipline }) => {
      try {
        const live = await apsFetch(`/data/v1/projects/${project_urn}/versions`)
        let data = (live ?? MOCK_MODEL_VERSIONS) as typeof MOCK_MODEL_VERSIONS
        if (discipline) data = data.filter(v => v.file.toLowerCase().includes(discipline.toLowerCase()))
        return ok({ versions: data, total: data.length, source: live ? 'aps-live' : 'mock' })
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  server.tool(
    'get_element_properties',
    'Get detailed properties of a specific Revit element via APS. Returns all Revit parameters, dimensions, materials, and phase information.',
    {
      project_urn: z.string().describe('APS project URN'),
      element_id: z.string().describe('Revit element ID or mark number'),
    },
    async ({ project_urn, element_id }) => {
      try {
        const live = await apsFetch(`/modelderivative/v2/designdata/${encodeURIComponent(project_urn)}/metadata/default/objects/${element_id}/properties`)
        return ok(live ?? { ...MOCK_PROPERTIES, element_id, project_urn })
      } catch (e) {
        return fail(String(e))
      }
    },
  )
})
