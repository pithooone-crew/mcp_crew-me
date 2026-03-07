import type { RoleConfig, Role } from './types'

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  general_contractor: {
    id: 'general_contractor',
    label: 'General Contractor',
    icon: '🔨',
    accent: '#f59e0b',
    platforms: [
      { id: 'procore', name: 'Procore', icon: '🏗', color: '#f59e0b', url: 'https://procore.mcp.example.com/sse' },
      { id: 'autodesk-acc', name: 'Autodesk ACC', icon: '📐', color: '#3b82f6', url: 'https://acc.mcp.example.com/sse' },
      { id: 'primavera-p6', name: 'Primavera P6', icon: '📅', color: '#8b5cf6', url: 'https://p6.mcp.example.com/sse' },
    ],
    systemPrompt: `You are an expert General Contractor project management AI integrated via MCP with Procore (field ops, RFIs, submittals, budget), Autodesk ACC (BIM coordination, issues), and Primavera P6 (CPM scheduling). Route queries intelligently: field operations → procore, model/design issues → acc, schedule/critical path → primavera-p6. Always return structured JSON arrays for list queries. Format currency as $X,XXX,XXX. Format dates as MM/DD/YYYY. Flag items that are overdue or over budget with [ALERT] prefix.`,
    promptSuggestions: [
      'Show all open RFIs by subcontractor and due date',
      "Pull today's daily logs and flag any safety incidents",
      'Compare schedule baseline vs actual progress in P6',
      'List submittals pending approval older than 14 days',
      'Show budget vs actual cost by CSI division in Procore',
      'What activities are on the critical path this week in P6?',
      'Pull ACC issues tied to active RFIs',
      'Show punch list items by trade and responsible party',
    ],
    mcpServers: [
      { type: 'url', url: 'https://procore.mcp.example.com/sse', name: 'procore' },
      { type: 'url', url: 'https://acc.mcp.example.com/sse', name: 'autodesk-acc' },
      { type: 'url', url: 'https://p6.mcp.example.com/sse', name: 'primavera-p6' },
    ],
  },
  architect_engineer: {
    id: 'architect_engineer',
    label: 'Architect / Engineer',
    icon: '📐',
    accent: '#3b82f6',
    platforms: [
      { id: 'autodesk-acc', name: 'Autodesk ACC', icon: '☁️', color: '#3b82f6', url: 'https://acc.mcp.example.com/sse' },
      { id: 'autodesk-aps', name: 'Autodesk APS', icon: '🧊', color: '#60a5fa', url: 'https://aps.autodesk.com/mcp/sse' },
      { id: 'bluebeam', name: 'Bluebeam', icon: '✏️', color: '#0ea5e9', url: 'https://bluebeam.mcp.example.com/sse' },
    ],
    systemPrompt: `You are an expert A/E project delivery AI integrated via MCP with Autodesk ACC (drawings, issues, transmittals), Autodesk APS/Revit (BIM model data), and Bluebeam (PDF review/markup sessions). Route: document control → acc, BIM/model queries → autodesk-aps, PDF review/approvals → bluebeam. Return drawing lists with current revision and issue date. Flag unanswered RFIs over 10 days with [OVERDUE].`,
    promptSuggestions: [
      'Show all drawing sheets updated in the last 7 days',
      'List open design issues assigned to my team in ACC',
      'Pull Revit model element data for structural grid lines',
      'Show active Bluebeam markup sessions awaiting sign-off',
      'Find all ASIs issued this month',
      'What RFIs have been submitted against Spec Section 03 30 00?',
      'List transmittals sent to contractor this week',
      'Show clash detection report from last coordination meeting',
    ],
    mcpServers: [
      { type: 'url', url: 'https://acc.mcp.example.com/sse', name: 'autodesk-acc' },
      { type: 'url', url: 'https://aps.autodesk.com/mcp/sse', name: 'autodesk-aps' },
      { type: 'url', url: 'https://bluebeam.mcp.example.com/sse', name: 'bluebeam' },
    ],
  },
  owner_developer: {
    id: 'owner_developer',
    label: 'Owner / Developer',
    icon: '🏢',
    accent: '#8b5cf6',
    platforms: [
      { id: 'oracle-aconex', name: 'Oracle Aconex', icon: '📁', color: '#8b5cf6', url: 'https://aconex.mcp.example.com/sse' },
      { id: 'cmic-erp', name: 'CMiC ERP', icon: '💼', color: '#a78bfa', url: 'https://cmic.mcp.example.com/sse' },
    ],
    systemPrompt: `You are an expert Owner/Developer executive AI integrated via MCP with Oracle Aconex (document control, workflows, correspondence) and CMiC ERP (job cost, contracts, AP/AR, forecasting). Route: document workflows/approvals → oracle-aconex, financial/cost/contract data → cmic-erp. Always show budget variance as both $ and %. Executive summaries should be 3 bullets max unless detail requested. Flag any items with >5% budget overrun with [OVER BUDGET].`,
    promptSuggestions: [
      'Show project cash flow forecast vs actual spend this quarter',
      'Pull all change orders pending my approval across all projects',
      'What is the current budget exposure from open PCOs?',
      'Show contract compliance status for all active vendors',
      'Pull CMiC job cost report for project 2240 by cost type',
      'List all submittals due this month across the portfolio',
      'What invoices are pending approval in CMiC AP?',
      'Generate executive summary of project health across portfolio',
    ],
    mcpServers: [
      { type: 'url', url: 'https://aconex.mcp.example.com/sse', name: 'oracle-aconex' },
      { type: 'url', url: 'https://cmic.mcp.example.com/sse', name: 'cmic-erp' },
    ],
  },
  preconstruction: {
    id: 'preconstruction',
    label: 'Preconstruction',
    icon: '📊',
    accent: '#10b981',
    platforms: [
      { id: 'stack-ct', name: 'STACK CT', icon: '📏', color: '#10b981', url: 'https://stack.mcp.example.com/sse' },
      { id: 'building-connected', name: 'BuildingConnected', icon: '🔗', color: '#34d399', url: 'https://buildingconnected.mcp.example.com/sse' },
      { id: 'sage-estimating', name: 'Sage Estimating', icon: '🧮', color: '#6ee7b7', url: 'https://sage-est.mcp.example.com/sse' },
    ],
    systemPrompt: `You are an expert Preconstruction and Estimating AI integrated via MCP with STACK (digital takeoff/quantities), BuildingConnected (bid management/subs), and Sage Estimating (detailed estimates/cost history). Route: takeoff quantities → stack-ct, bid mgmt/sub coverage → building-connected, detailed estimating/historical costs → sage-estimating. Show quantities with units. Show bid coverage as X of Y trades covered. Flag missing sub coverage with [NO COVERAGE].`,
    promptSuggestions: [
      'Pull all active bid invitations from BuildingConnected',
      'Show STACK takeoff summary for the 4th floor slab',
      'Compare my Sage estimate vs last 3 similar projects',
      'List subcontractor bids received and coverage by trade',
      'What ITBs have bid deadlines in the next 10 days?',
      'Show STACK quantity breakdown by CSI division',
      'Pull qualification status for invited subs on this project',
      'Summarize bid leveling for Division 09 finishes',
    ],
    mcpServers: [
      { type: 'url', url: 'https://stack.mcp.example.com/sse', name: 'stack-ct' },
      { type: 'url', url: 'https://buildingconnected.mcp.example.com/sse', name: 'building-connected' },
      { type: 'url', url: 'https://sage-est.mcp.example.com/sse', name: 'sage-estimating' },
    ],
  },
}

export const COLORS = {
  bgPrimary: '#0a0f1a',
  bgSecondary: '#111827',
  bgPanel: '#0d1520',
  accentGC: '#f59e0b',
  accentAE: '#3b82f6',
  accentOW: '#8b5cf6',
  accentPre: '#10b981',
  textPrimary: '#f1f5f9',
  textMuted: '#64748b',
  border: '#1e2d40',
  alert: '#ef4444',
}

export const ROLE_ACCENT: Record<Role, string> = {
  general_contractor: '#f59e0b',
  architect_engineer: '#3b82f6',
  owner_developer: '#8b5cf6',
  preconstruction: '#10b981',
}
