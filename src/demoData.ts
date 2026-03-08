import type { Role, ToolCall } from './types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const GC_RFI_RESPONSE = `Here are all open RFIs for Project 2240 — Riverside Tower:

\`\`\`json
[
  {"rfi_number": "RFI-0187", "subject": "Concrete mix design approval - Podium Level", "subcontractor": "Allied Concrete Co.", "due_date": "03/09/2026", "days_open": 18, "status": "Pending Sub Response", "alert": true},
  {"rfi_number": "RFI-0183", "subject": "MEP coordination conflict — Level 12 ceiling plenum", "subcontractor": "Apex MEP Group", "due_date": "03/04/2026", "days_open": 22, "status": "Overdue", "alert": true},
  {"rfi_number": "RFI-0179", "subject": "Waterproofing membrane substitution request", "subcontractor": "Watertight Systems", "due_date": "03/14/2026", "days_open": 7, "status": "Open", "alert": false},
  {"rfi_number": "RFI-0176", "subject": "Structural steel connection detail — Grid J/14", "subcontractor": "SteelCraft Inc.", "due_date": "03/20/2026", "days_open": 4, "status": "Open", "alert": false},
  {"rfi_number": "RFI-0172", "subject": "Elevator pit waterproofing specification conflict", "subcontractor": "Otis Elevator", "due_date": "02/28/2026", "days_open": 31, "status": "Overdue", "alert": true},
  {"rfi_number": "RFI-0168", "subject": "Facade panel anchorage detail clarification", "subcontractor": "Permasteelisa Group", "due_date": "03/11/2026", "days_open": 12, "status": "Pending Sub Response", "alert": false}
]
\`\`\`

**Summary:** 23 total open RFIs | [ALERT] 4 overdue (avg 27 days) | 8 pending sub response

[ALERT] RFI-0183 and RFI-0172 are critically overdue. Recommend escalation to Apex MEP Group and Otis Elevator today.`

const GC_BUDGET_RESPONSE = `Budget vs. Actual Analysis — Project 2240 Riverside Tower:

\`\`\`json
[
  {"division": "Div 03 - Concrete", "budget": 4200000, "actual": 5047230, "variance": -847230, "pct": -20.2},
  {"division": "Div 05 - Structural Steel", "budget": 3100000, "actual": 3087400, "variance": 12600, "pct": 0.4},
  {"division": "Div 08 - Openings", "budget": 1850000, "actual": 1921000, "variance": -71000, "pct": -3.8},
  {"division": "Div 09 - Finishes", "budget": 980000, "actual": 956600, "variance": 23400, "pct": 2.4},
  {"division": "Div 15 - Plumbing", "budget": 2400000, "actual": 2380000, "variance": 20000, "pct": 0.8},
  {"division": "Div 16 - Electrical", "budget": 3200000, "actual": 3341000, "variance": -141000, "pct": -4.4}
]
\`\`\`

[ALERT] **Division 03 — Concrete** is $847,230 OVER budget (20.2%) due to excess concrete pours on podium and accelerated schedule. Immediate cost-to-complete review recommended.

Division 09 — Finishes is $23,400 under budget — opportunity to reallocate to Division 03 contingency.`

const GC_SCHEDULE_RESPONSE = `Primavera P6 Schedule Analysis — Riverside Tower (as of 03/07/2026):

**Overall Status:** 12 days behind on critical path

**Critical Path Activities This Week:**

\`\`\`json
[
  {"activity": "ACT-2240-C14", "description": "Level 14 Concrete Deck Pour", "baseline_start": "02/24/2026", "actual_start": "03/07/2026", "float": 0, "status": "In Progress", "delay_days": 11},
  {"activity": "ACT-2240-C15", "description": "Level 15 Rebar Placement", "baseline_start": "03/02/2026", "actual_start": null, "float": 0, "status": "Not Started", "delay_days": 5},
  {"activity": "ACT-2240-ME12", "description": "MEP Rough-in Levels 12-13", "baseline_start": "03/01/2026", "actual_start": null, "float": 2, "status": "Not Started", "delay_days": 6},
  {"activity": "ACT-2240-EXT", "description": "Exterior Facade Panel Install — Zone A", "baseline_start": "03/15/2026", "actual_start": null, "float": 0, "status": "Scheduled", "delay_days": 0}
]
\`\`\`

[ALERT] Concrete package (Allied Concrete Co.) is the primary driver of the 12-day delay. Root cause: equipment mobilization delay and rework on Level 12 pour.

**Recommended Recovery Actions:**
- Authorize weekend pour on Level 14 to recover 3 days
- Pre-mobilize Level 15 rebar crew to overlap with Level 14 completion
- Expedite MEP coordination drawings for Levels 12-13`

const AE_DRAWINGS_RESPONSE = `ACC Drawing Register — Updated in Last 7 Days:

\`\`\`json
[
  {"sheet": "A-301", "title": "Level 3 Floor Plan — Unit Mix Revision", "discipline": "Architectural", "revision": "Rev 6", "issue_date": "03/06/2026", "issued_to": "GC, MEP", "status": "Issued for Construction"},
  {"sheet": "S-215", "title": "Moment Frame Connection Details — Grid J", "discipline": "Structural", "revision": "Rev 3", "issue_date": "03/05/2026", "issued_to": "GC, Steel", "status": "Issued for Construction"},
  {"sheet": "M-420", "title": "Level 12 HVAC Coordination Plan", "discipline": "Mechanical", "revision": "Rev 2", "issue_date": "03/04/2026", "issued_to": "GC, MEP", "status": "Issued for Coordination"},
  {"sheet": "E-550", "title": "Electrical Panel Schedule — Main Distribution", "discipline": "Electrical", "revision": "Rev 4", "issue_date": "03/03/2026", "issued_to": "GC, Electrical", "status": "Issued for Construction"},
  {"sheet": "A-850", "title": "Exterior Facade Details — Panel Type B", "discipline": "Architectural", "revision": "Rev 5", "issue_date": "03/01/2026", "issued_to": "GC, Facade", "status": "Issued for Construction"}
]
\`\`\`

**Total:** 156 sheets in drawing set | 12 updated in last 7 days | 5 disciplines

All sheets issued with Bluebeam session stamps. 2 sheets (M-421, E-551) pending coordination sign-off.`

const AE_RFIS_RESPONSE = `Open RFIs Against A/E Documents — Riverside Tower:

\`\`\`json
[
  {"rfi": "RFI-0187", "spec": "03 30 00", "question": "Concrete mix design — 6000 PSI vs 5000 PSI on podium", "submitted": "02/17/2026", "days_open": 18, "assigned": "Structural EOR", "overdue": true},
  {"rfi": "RFI-0185", "spec": "03 30 00", "question": "Rebar splice locations at Level 14 transfer beam", "submitted": "02/20/2026", "days_open": 15, "assigned": "Structural EOR", "overdue": true},
  {"rfi": "RFI-0183", "spec": "23 05 00", "question": "Duct routing conflict with structural beam at Level 12", "submitted": "02/13/2026", "days_open": 22, "assigned": "MEP Engineer", "overdue": true},
  {"rfi": "RFI-0179", "spec": "07 13 00", "question": "Waterproofing membrane substitution — CPP vs HDPE", "submitted": "02/28/2026", "days_open": 7, "assigned": "Architectural", "overdue": false},
  {"rfi": "RFI-0177", "spec": "05 12 00", "question": "Shear tab connection detail — Grid K/15 column", "submitted": "03/01/2026", "days_open": 6, "assigned": "Structural EOR", "overdue": false}
]
\`\`\`

**19 open RFIs total** | [OVERDUE] 5 over 10 days | 3 against Spec Section 03 30 00 (Concrete)

[OVERDUE] RFI-0183 at 22 days without response — MEP coordination delay is impacting critical path.`

const OW_PORTFOLIO_RESPONSE = `Executive Portfolio Summary — Q1 2026:

**Portfolio Overview:** 4 active projects | $284M total contracted value

\`\`\`json
[
  {"project": "Riverside Tower (2240)", "value": 127000000, "budget_status": "OVER", "overrun_pct": 7.3, "schedule_days": -12, "phase": "Structure", "health": "At Risk"},
  {"project": "Harbor District Office (2238)", "value": 89000000, "budget_status": "ON", "overrun_pct": 1.2, "schedule_days": 2, "phase": "MEP Rough-In", "health": "On Track"},
  {"project": "Lakefront Retail Center (2235)", "value": 43000000, "budget_status": "UNDER", "overrun_pct": -2.1, "schedule_days": 5, "phase": "Finishes", "health": "On Track"},
  {"project": "Midtown Mixed-Use (2242)", "value": 25000000, "budget_status": "ON", "overrun_pct": 0.4, "schedule_days": 0, "phase": "Foundations", "health": "On Track"}
]
\`\`\`

**Immediate Actions Required:**
- [OVER BUDGET] Riverside Tower civil scope 7.3% over — approve concrete PCO or exercise contingency
- 7 change orders pending approval totaling $1,247,400 — 3 require Owner signature by 03/14
- CMiC: $4.3M in invoices pending AP approval — oldest invoice 34 days

Cash flow: $8.2M forecast vs $7.6M actual spend this quarter — $600K favorable variance.`

const OW_CHANGE_ORDERS_RESPONSE = `Pending Change Orders — All Projects (Requiring Approval):

\`\`\`json
[
  {"co_number": "CO-2240-041", "project": "Riverside Tower", "description": "Level 14 concrete over-pour — weather delay", "amount": 287400, "submitted": "02/28/2026", "age_days": 7, "status": "Pending Owner", "priority": "High"},
  {"co_number": "CO-2240-042", "project": "Riverside Tower", "description": "MEP system upgrade — tenant improvement", "amount": 412000, "submitted": "03/02/2026", "age_days": 5, "status": "Pending Owner", "priority": "Medium"},
  {"co_number": "CO-2238-019", "project": "Harbor District Office", "description": "Unforeseen underground obstruction", "amount": 198000, "submitted": "03/01/2026", "age_days": 6, "status": "Pending Owner", "priority": "High"},
  {"co_number": "CO-2238-020", "project": "Harbor District Office", "description": "LEED documentation additional services", "amount": 45000, "submitted": "02/24/2026", "age_days": 11, "status": "Pending Owner", "priority": "Low"},
  {"co_number": "CO-2235-031", "project": "Lakefront Retail", "description": "Tenant sign package revisions", "amount": 127000, "submitted": "03/05/2026", "age_days": 2, "status": "Pending Owner", "priority": "Medium"},
  {"co_number": "CO-2242-008", "project": "Midtown Mixed-Use", "description": "Foundation design modification", "amount": 178000, "submitted": "02/20/2026", "age_days": 15, "status": "Pending Owner", "priority": "High"}
]
\`\`\`

**Total Exposure:** $1,247,400 across 7 pending COs | [ALERT] CO-2242-008 is 15 days old — contractor is on hold pending approval.`

const PRE_BIDS_RESPONSE = `Active Bid Invitations — BuildingConnected (as of 03/07/2026):

\`\`\`json
[
  {"itb": "ITB-2244-001", "project": "Northside Community Center", "trade": "General Conditions", "bid_date": "03/12/2026", "days_left": 5, "subs_invited": 8, "bids_received": 3, "coverage": "3 of 8"},
  {"itb": "ITB-2244-002", "project": "Northside Community Center", "trade": "Concrete", "bid_date": "03/12/2026", "days_left": 5, "subs_invited": 6, "bids_received": 4, "coverage": "4 of 6"},
  {"itb": "ITB-2244-003", "project": "Northside Community Center", "trade": "Structural Steel", "bid_date": "03/14/2026", "days_left": 7, "subs_invited": 5, "bids_received": 2, "coverage": "2 of 5"},
  {"itb": "ITB-2244-004", "project": "Northside Community Center", "trade": "Mechanical", "bid_date": "03/17/2026", "days_left": 10, "subs_invited": 7, "bids_received": 1, "coverage": "1 of 7"},
  {"itb": "ITB-2244-005", "project": "Northside Community Center", "trade": "Electrical", "bid_date": "03/17/2026", "days_left": 10, "subs_invited": 6, "bids_received": 0, "coverage": "0 of 6"},
  {"itb": "ITB-2244-006", "project": "Northside Community Center", "trade": "Drywall / Finishes", "bid_date": "03/19/2026", "days_left": 12, "subs_invited": 9, "bids_received": 5, "coverage": "5 of 9"}
]
\`\`\`

**Bid Coverage:** 8 of 11 trades have sub coverage | [NO COVERAGE] Division 16 Electrical — 0 bids received, deadline in 10 days

[ALERT] ITB-2244-001 and ITB-2244-002 close in 5 days. Recommend follow-up with non-responding subs today.`

const PRE_TAKEOFF_RESPONSE = `STACK Takeoff Summary — Northside Community Center (Level 4 Slab):

\`\`\`json
[
  {"item": "Slab on Grade — 6\" NW Concrete", "quantity": 47230, "unit": "SF", "csi": "03 30 00"},
  {"item": "Reinforcing Steel — #5 @ 12\" EW", "quantity": 94460, "unit": "LF", "csi": "03 20 00"},
  {"item": "Vapor Barrier — 10 mil", "quantity": 47230, "unit": "SF", "csi": "07 26 00"},
  {"item": "Concrete Finishing — Steel Trowel", "quantity": 47230, "unit": "SF", "csi": "03 35 00"},
  {"item": "Control Joints — Saw-cut", "quantity": 2840, "unit": "LF", "csi": "03 15 00"},
  {"item": "Edge Forms", "quantity": 920, "unit": "LF", "csi": "03 11 00"}
]
\`\`\`

**Total Slab Area:** 47,230 SF | Estimated Material Cost: $892,400 | Labor Factor: $18.90/SF

Takeoff verified against Autodesk ACC Sheet S-402 Rev 3. Quantity discrepancy of +240 SF from previous estimate corrected.`

const PRE_ESTIMATE_RESPONSE = `Sage Estimating — Base Bid Summary (Northside Community Center):

\`\`\`json
[
  {"division": "Div 01 - General Conditions", "estimate": 387000, "market_low": 350000, "market_high": 420000, "confidence": "High"},
  {"division": "Div 03 - Concrete", "estimate": 892400, "market_low": 820000, "market_high": 960000, "confidence": "High"},
  {"division": "Div 05 - Structural Steel", "estimate": 1240000, "market_low": 1180000, "market_high": 1380000, "confidence": "Medium"},
  {"division": "Div 09 - Finishes", "estimate": 680000, "market_low": 620000, "market_high": 750000, "confidence": "High"},
  {"division": "Div 15 - Mechanical", "estimate": 820000, "market_low": 780000, "market_high": 920000, "confidence": "Low"},
  {"division": "Div 16 - Electrical", "estimate": 650000, "market_low": 600000, "market_high": 720000, "confidence": "Low"}
]
\`\`\`

**Base Bid Total:** $4,669,400 | **Markup (12%):** $560,328 | **Total Bid:** $5,229,728

Historical comparison vs 3 similar projects (avg $4.87M base, ±8% variance): Current estimate is **4.1% above** historical average — driven by current steel escalation (+9% YoY).`

const SAFETY_INCIDENTS_RESPONSE = `Safety Incident Report — Riverside Tower (Last 30 Days):

\`\`\`json
[
  {"id": "INC-2240-047", "date": "03/05/2026", "type": "Near Miss", "description": "Unsecured load fell from Level 12 scaffolding — no injuries", "trade": "Ironworkers", "recordable": false, "status": "Open", "corrective_action": "Pending"},
  {"id": "INC-2240-046", "date": "02/28/2026", "type": "First Aid", "description": "Laceration — hand injury during rebar placement", "trade": "Concrete", "recordable": false, "status": "Closed", "corrective_action": "Completed"},
  {"id": "INC-2240-045", "date": "02/21/2026", "type": "OSHA Recordable", "description": "Electrical shock — lockout/tagout violation by Skyline Electrical", "trade": "Electrical", "recordable": true, "status": "Open", "corrective_action": "Pending"},
  {"id": "INC-2240-043", "date": "02/14/2026", "type": "OSHA Recordable", "description": "Struck-by: Falling debris hit subcontractor — hard hat prevented serious injury", "trade": "Masonry", "recordable": true, "status": "Closed", "corrective_action": "Completed"},
  {"id": "INC-2240-041", "date": "02/09/2026", "type": "Near Miss", "description": "Scaffold plank failure — worker caught by lifeline", "trade": "Laborers", "recordable": false, "status": "Closed", "corrective_action": "Completed"}
]
\`\`\`

**[ALERT] 2 open OSHA-recordable incidents** — corrective actions pending for INC-2240-047 and INC-2240-045.

TRIR (last 90 days): **2.80** vs. industry average 3.40 — project is performing better than industry but trending upward.

Recommend immediate stand-down for Skyline Electrical crew pending LOTO retraining completion.`

const SAFETY_METRICS_RESPONSE = `Safety Performance Metrics — Riverside Tower (YTD 2026):

\`\`\`json
[
  {"metric": "TRIR", "value": 2.80, "industry_avg": 3.40, "trend": "up", "status": "Warning"},
  {"metric": "DART Rate", "value": 1.20, "industry_avg": 1.80, "trend": "stable", "status": "Good"},
  {"metric": "Near Miss Reports", "value": 14, "industry_avg": null, "trend": "up", "status": "Info"},
  {"metric": "Safety Observations", "value": 89, "industry_avg": null, "trend": "up", "status": "Good"},
  {"metric": "Toolbox Talks Completed", "value": 18, "industry_avg": null, "trend": "stable", "status": "Good"},
  {"metric": "Days Without Recordable", "value": 8, "industry_avg": null, "trend": "reset", "status": "Warning"}
]
\`\`\`

**Overall Assessment:** Project is performing **below industry average** for TRIR and DART Rate, which is positive. However, the LOTO violation on 02/21 reset the recordable-free streak to 8 days.

**Top Risk Factors This Week:**
- Ironworker overhead work at Level 13-14 (unsecured load incident)
- Electrical crew LOTO non-compliance (pending retraining)
- Scaffold inspection overdue for Tower Crane #2 base area`

const SAFETY_TOOLBOX_RESPONSE = `Toolbox Talk Compliance — March 2026:

\`\`\`json
[
  {"talk": "TBT-032", "topic": "Lockout/Tagout Procedures", "required_by": "03/07/2026", "status": "Overdue", "trades_completed": ["Concrete", "Ironworkers"], "trades_pending": ["Electrical", "Plumbing", "Mechanical"]},
  {"talk": "TBT-031", "topic": "Fall Protection — Leading Edge Work", "required_by": "03/05/2026", "status": "Complete", "trades_completed": ["All Trades"], "trades_pending": []},
  {"talk": "TBT-030", "topic": "Struck-By Hazards — Overhead Work Zones", "required_by": "03/01/2026", "status": "Complete", "trades_completed": ["All Trades"], "trades_pending": []},
  {"talk": "TBT-033", "topic": "Heat Illness Prevention", "required_by": "03/14/2026", "status": "Scheduled", "trades_completed": [], "trades_pending": ["All Trades"]},
  {"talk": "TBT-034", "topic": "Confined Space Entry", "required_by": "03/21/2026", "status": "Scheduled", "trades_completed": [], "trades_pending": ["Plumbing", "Mechanical"]}
]
\`\`\`

**[OVERDUE] TBT-032 (Lockout/Tagout)** is overdue — 3 trades have not completed. This is directly related to the 02/21 LOTO incident involving Skyline Electrical.

Action Required: Schedule mandatory LOTO training for Electrical, Plumbing, and Mechanical crews before end of week.`

const SAFETY_COMPLIANCE_RESPONSE = `OSHA Compliance Status — Riverside Tower (03/07/2026):

\`\`\`json
[
  {"category": "Fall Protection", "score": 94, "items_inspected": 48, "violations": 3, "status": "Compliant", "last_inspection": "03/05/2026"},
  {"category": "Electrical Safety (LOTO)", "score": 72, "items_inspected": 18, "violations": 5, "status": "Non-Compliant", "last_inspection": "03/03/2026"},
  {"category": "Scaffolding & Access", "score": 88, "items_inspected": 24, "violations": 3, "status": "Compliant", "last_inspection": "03/04/2026"},
  {"category": "PPE Compliance", "score": 91, "items_inspected": 147, "violations": 13, "status": "Compliant", "last_inspection": "03/07/2026"},
  {"category": "Housekeeping & Sanitation", "score": 96, "items_inspected": 62, "violations": 2, "status": "Compliant", "last_inspection": "03/06/2026"}
]
\`\`\`

**[ALERT] Electrical Safety (LOTO) is NON-COMPLIANT** with a score of 72/100 — 5 violations identified.

Immediate corrective actions required:
- Conduct site-wide LOTO audit for all electrical crews
- Mandatory retraining for Skyline Electrical before they resume panel work
- Verify lockout devices are properly applied on all live panels at Level 12-14

All other categories are within acceptable compliance thresholds.`

export function getDemoToolCalls(role: Role, query: string): ToolCall[] {
  const q = query.toLowerCase()
  const id1 = makeId()
  const id2 = makeId()
  const id3 = makeId()

  if (role === 'general_contractor') {
    if (q.includes('rfi') || q.includes('subcontractor')) {
      return [
        { id: id1, platform: 'procore', tool: 'get_rfis', params: { project_id: '2240', status: 'open' }, result: '23 results', resultCount: 23, durationMs: 342, status: 'success' },
      ]
    }
    if (q.includes('budget') || q.includes('cost') || q.includes('division')) {
      return [
        { id: id1, platform: 'procore', tool: 'get_budget_summary', params: { project_id: '2240', group_by: 'csi_division' }, result: '6 divisions', resultCount: 6, durationMs: 287, status: 'success' },
      ]
    }
    if (q.includes('schedule') || q.includes('critical path') || q.includes('p6') || q.includes('baseline')) {
      return [
        { id: id1, platform: 'primavera-p6', tool: 'get_critical_path', params: { project_id: 'RT-2240', week: 'current' }, result: '14 activities', resultCount: 14, durationMs: 512, status: 'success' },
        { id: id2, platform: 'primavera-p6', tool: 'compare_baseline', params: { project_id: 'RT-2240', baseline: 'BL-01' }, result: 'comparison complete', durationMs: 398, status: 'success' },
      ]
    }
    if (q.includes('daily log') || q.includes('safety')) {
      return [
        { id: id1, platform: 'procore', tool: 'get_daily_logs', params: { project_id: '2240', date: 'today' }, result: '3 logs', resultCount: 3, durationMs: 221, status: 'success' },
      ]
    }
    if (q.includes('acc') || q.includes('issue') || q.includes('punch')) {
      return [
        { id: id1, platform: 'procore', tool: 'get_rfis', params: { project_id: '2240', status: 'open' }, result: '23 results', resultCount: 23, durationMs: 342, status: 'success' },
        { id: id2, platform: 'autodesk-acc', tool: 'get_issues', params: { linked_rfis: true }, result: '11 issues linked', resultCount: 11, durationMs: 467, status: 'success' },
      ]
    }
    return [
      { id: id1, platform: 'procore', tool: 'get_project_summary', params: { project_id: '2240' }, result: 'Project data retrieved', durationMs: 198, status: 'success' },
    ]
  }

  if (role === 'architect_engineer') {
    if (q.includes('drawing') || q.includes('sheet') || q.includes('7 days')) {
      return [
        { id: id1, platform: 'autodesk-acc', tool: 'get_drawings', params: { updated_since: '7d', project: 'riverside-tower' }, result: '12 sheets', resultCount: 12, durationMs: 389, status: 'success' },
      ]
    }
    if (q.includes('rfi') || q.includes('spec')) {
      return [
        { id: id1, platform: 'autodesk-acc', tool: 'get_rfis', params: { status: 'open', spec_section: '03 30 00' }, result: '19 RFIs', resultCount: 19, durationMs: 312, status: 'success' },
      ]
    }
    if (q.includes('bluebeam') || q.includes('markup') || q.includes('session')) {
      return [
        { id: id1, platform: 'bluebeam', tool: 'get_sessions', params: { status: 'awaiting_signoff' }, result: '2 sessions', resultCount: 2, durationMs: 156, status: 'success' },
      ]
    }
    if (q.includes('revit') || q.includes('bim') || q.includes('model') || q.includes('element')) {
      return [
        { id: id1, platform: 'autodesk-aps', tool: 'query_elements', params: { category: 'StructuralFraming', view: 'Structural Plan - Level 14' }, result: '847 elements', resultCount: 847, durationMs: 823, status: 'success' },
      ]
    }
    return [
      { id: id1, platform: 'autodesk-acc', tool: 'get_project_summary', params: { project: 'riverside-tower' }, result: 'Project data retrieved', durationMs: 241, status: 'success' },
    ]
  }

  if (role === 'owner_developer') {
    if (q.includes('portfolio') || q.includes('executive') || q.includes('health')) {
      return [
        { id: id1, platform: 'cmic-erp', tool: 'get_portfolio_summary', params: { status: 'active' }, result: '4 projects', resultCount: 4, durationMs: 445, status: 'success' },
        { id: id2, platform: 'oracle-aconex', tool: 'get_workflow_status', params: { type: 'all' }, result: 'Workflow data', durationMs: 389, status: 'success' },
      ]
    }
    if (q.includes('change order') || q.includes('pco') || q.includes('pending')) {
      return [
        { id: id1, platform: 'cmic-erp', tool: 'get_change_orders', params: { status: 'pending_approval', approver: 'owner' }, result: '7 COs', resultCount: 7, durationMs: 334, status: 'success' },
      ]
    }
    if (q.includes('invoice') || q.includes('ap') || q.includes('cash flow')) {
      return [
        { id: id1, platform: 'cmic-erp', tool: 'get_ap_invoices', params: { status: 'pending', project: 'all' }, result: '$4.3M pending', durationMs: 512, status: 'success' },
        { id: id2, platform: 'cmic-erp', tool: 'get_cash_flow_forecast', params: { period: 'Q1_2026' }, result: 'Cash flow data', durationMs: 289, status: 'success' },
      ]
    }
    if (q.includes('job cost') || q.includes('budget') || q.includes('2240')) {
      return [
        { id: id1, platform: 'cmic-erp', tool: 'get_job_cost_report', params: { project: '2240', group_by: 'cost_type' }, result: 'Job cost report', durationMs: 678, status: 'success' },
      ]
    }
    return [
      { id: id1, platform: 'oracle-aconex', tool: 'get_project_documents', params: { project: 'all', status: 'active' }, result: 'Document list', durationMs: 312, status: 'success' },
      { id: id2, platform: 'cmic-erp', tool: 'get_project_summary', params: {} , result: 'ERP summary', durationMs: 401, status: 'success' },
    ]
  }

  if (role === 'safety') {
    if (q.includes('incident') || q.includes('osha') || q.includes('recordable') || q.includes('injury')) {
      return [
        { id: id1, platform: 'safety-platform', tool: 'list_incidents', params: { project_id: '2240', days: 30 }, result: '5 incidents', resultCount: 5, durationMs: 289, status: 'success' },
        { id: id2, platform: 'safety-platform', tool: 'get_safety_metrics', params: { project_id: '2240', period: '90d' }, result: 'TRIR: 2.80', durationMs: 198, status: 'success' },
      ]
    }
    if (q.includes('metric') || q.includes('trir') || q.includes('dart') || q.includes('performance') || q.includes('kpi')) {
      return [
        { id: id1, platform: 'safety-platform', tool: 'get_safety_metrics', params: { project_id: '2240', period: '90d' }, result: 'TRIR: 2.80, DART: 1.20', durationMs: 245, status: 'success' },
      ]
    }
    if (q.includes('toolbox') || q.includes('tbt') || q.includes('training') || q.includes('talk')) {
      return [
        { id: id1, platform: 'safety-platform', tool: 'list_toolbox_talks', params: { project_id: '2240', month: '2026-03' }, result: '5 toolbox talks', resultCount: 5, durationMs: 178, status: 'success' },
      ]
    }
    if (q.includes('compliance') || q.includes('loto') || q.includes('ppe') || q.includes('inspection') || q.includes('violation')) {
      return [
        { id: id1, platform: 'safety-platform', tool: 'get_osha_compliance_status', params: { project_id: '2240' }, result: '5 categories', resultCount: 5, durationMs: 334, status: 'success' },
      ]
    }
    if (q.includes('observation') || q.includes('hazard') || q.includes('near miss')) {
      return [
        { id: id1, platform: 'safety-platform', tool: 'list_safety_observations', params: { project_id: '2240', limit: 10 }, result: '6 observations', resultCount: 6, durationMs: 212, status: 'success' },
      ]
    }
    return [
      { id: id1, platform: 'safety-platform', tool: 'list_incidents', params: { project_id: '2240' }, result: '5 incidents', resultCount: 5, durationMs: 289, status: 'success' },
      { id: id2, platform: 'safety-platform', tool: 'get_safety_metrics', params: { project_id: '2240' }, result: 'Safety metrics', durationMs: 198, status: 'success' },
    ]
  }

  // preconstruction
  if (q.includes('bid') || q.includes('itb') || q.includes('buildingconnected') || q.includes('invitation')) {
    return [
      { id: id1, platform: 'building-connected', tool: 'get_bid_invitations', params: { status: 'active' }, result: '3 active ITBs', resultCount: 3, durationMs: 278, status: 'success' },
    ]
  }
  if (q.includes('takeoff') || q.includes('slab') || q.includes('stack') || q.includes('quantity')) {
    return [
      { id: id1, platform: 'stack-ct', tool: 'get_takeoff_summary', params: { area: '4th_floor_slab' }, result: '47,230 SF', durationMs: 445, status: 'success' },
    ]
  }
  if (q.includes('estimate') || q.includes('sage') || q.includes('bid leveling') || q.includes('historic')) {
    return [
      { id: id1, platform: 'sage-estimating', tool: 'get_estimate_summary', params: { project: 'northside-cc' }, result: '$4.87M estimate', durationMs: 567, status: 'success' },
      { id: id2, platform: 'sage-estimating', tool: 'get_historical_comparison', params: { project_type: 'community_center', count: 3 }, result: '3 comparable projects', resultCount: 3, durationMs: 389, status: 'success' },
    ]
  }
  if (q.includes('sub') || q.includes('coverage') || q.includes('trade')) {
    return [
      { id: id1, platform: 'building-connected', tool: 'get_sub_coverage', params: { project: 'northside-cc' }, result: '8 of 11 trades', durationMs: 234, status: 'success' },
      { id: id2, platform: 'building-connected', tool: 'get_bid_results', params: { project: 'northside-cc' }, result: '15 bids received', resultCount: 15, durationMs: 312, status: 'success' },
    ]
  }
  return [
    { id: id1, platform: 'stack-ct', tool: 'get_project_quantities', params: { project: 'northside-cc' }, result: 'Quantity data', durationMs: 334, status: 'success' },
    { id: id2, platform: 'building-connected', tool: 'get_project_summary', params: { project: 'northside-cc' }, result: 'Bid summary', durationMs: 201, status: 'success' },
    { id: id3, platform: 'sage-estimating', tool: 'get_estimate', params: { project: 'northside-cc' }, result: 'Estimate loaded', durationMs: 445, status: 'success' },
  ]
}

export function getDemoResponse(role: Role, query: string): string {
  const q = query.toLowerCase()

  if (role === 'general_contractor') {
    if (q.includes('rfi') || q.includes('subcontractor')) return GC_RFI_RESPONSE
    if (q.includes('budget') || q.includes('cost') || q.includes('division')) return GC_BUDGET_RESPONSE
    if (q.includes('schedule') || q.includes('critical path') || q.includes('p6') || q.includes('baseline') || q.includes('progress')) return GC_SCHEDULE_RESPONSE
    if (q.includes('daily') || q.includes('safety') || q.includes('incident')) return `Daily Log Summary — Project 2240 (03/07/2026):\n\n3 logs submitted today.\n\n[ALERT] Safety incident reported by Skyline Electrical at 10:42 AM — electrical panel energization without lockout/tagout. Workers OK. OSHA-recordable event logged. Corrective action initiated.\n\nManpower on site: 147 workers across 12 subcontractors. Weather: Clear, 52°F.`
    if (q.includes('submittal') || q.includes('pending')) return `Submittals Pending Approval (>14 days):\n\n\`\`\`json\n[\n  {"sub_number": "SUB-0312", "description": "Concrete Mix Design — 6000 PSI", "subcontractor": "Allied Concrete", "submitted": "02/10/2026", "days_pending": 25, "ball_in_court": "EOR"},\n  {"sub_number": "SUB-0318", "description": "Waterproofing Membrane Data Sheet", "subcontractor": "Watertight Systems", "submitted": "02/15/2026", "days_pending": 20, "ball_in_court": "Architect"},\n  {"sub_number": "SUB-0327", "description": "Structural Steel Shop Drawings", "subcontractor": "SteelCraft Inc.", "submitted": "02/20/2026", "days_pending": 15, "ball_in_court": "Structural EOR"}\n]\n\`\`\`\n\n[ALERT] 3 submittals over 14 days — contact respective reviewers for expedited review.`
    if (q.includes('punch') || q.includes('trade') || q.includes('responsible')) return `Punch List — Level 10 (Inspection 03/05/2026):\n\n\`\`\`json\n[\n  {"item": "PUNCH-1047", "description": "Drywall corner bead damage", "trade": "Drywall", "responsible": "Interior Systems Co.", "priority": "Medium"},\n  {"item": "PUNCH-1048", "description": "HVAC diffuser missing", "trade": "Mechanical", "responsible": "Apex MEP", "priority": "High"},\n  {"item": "PUNCH-1049", "description": "Floor drain cover bent", "trade": "Plumbing", "responsible": "Apex MEP", "priority": "Low"}\n]\n\`\`\`\n\n12 punch items on Level 10. 4 cleared since last inspection.`
    return `Project 2240 — Riverside Tower Status as of 03/07/2026:\n\n- **Schedule:** 12 days behind critical path\n- **Budget:** $847,230 over on Division 03 Concrete\n- **Open RFIs:** 23 (4 overdue)\n- **Safety:** 3 recordable incidents in last 30 days\n\nUse the prompt suggestions above for detailed queries.`
  }

  if (role === 'architect_engineer') {
    if (q.includes('drawing') || q.includes('sheet') || q.includes('7 days') || q.includes('updated')) return AE_DRAWINGS_RESPONSE
    if (q.includes('rfi') || q.includes('spec') || q.includes('03 30 00')) return AE_RFIS_RESPONSE
    if (q.includes('bluebeam') || q.includes('markup') || q.includes('sign-off') || q.includes('session')) return `Bluebeam Studio Sessions — Pending Sign-off:\n\n\`\`\`json\n[\n  {"session": "BB-2240-47", "document": "Level 12 MEP Coordination Plan", "participants": ["Apex MEP", "GC PM", "Structural EOR"], "opened": "03/01/2026", "markups": 34, "status": "Awaiting GC Sign-off"},\n  {"session": "BB-2240-52", "document": "Exterior Facade Details Rev 5", "participants": ["Architect", "Facade Sub", "Owner Rep"], "opened": "03/04/2026", "markups": 12, "status": "Awaiting Facade Sub Sign-off"}\n]\n\`\`\`\n\n2 sessions pending final sign-off. Session BB-2240-47 has been open 6 days.`
    if (q.includes('asi') || q.includes('supplemental')) return `ASIs Issued This Month (March 2026):\n\n\`\`\`json\n[\n  {"asi": "ASI-019", "description": "Window sill height revision — Unit A3", "issued": "03/03/2026", "sheets_affected": ["A-301", "A-401"], "cost_impact": "NIC"},\n  {"asi": "ASI-020", "description": "Lobby ceiling height increase to 14ft", "issued": "03/06/2026", "sheets_affected": ["A-100", "A-800", "S-100"], "cost_impact": "TBD"}\n]\n\`\`\`\n\n2 ASIs issued in March. ASI-020 may have structural cost impact — awaiting EOR review.`
    if (q.includes('clash') || q.includes('coordination')) return `Clash Detection Report — Coordination Meeting 03/03/2026:\n\n\`\`\`json\n[\n  {"clash_id": "CL-0341", "discipline_a": "Structural", "discipline_b": "Mechanical", "location": "Level 12 — Grid J/12-14", "severity": "Hard", "status": "Open"},\n  {"clash_id": "CL-0342", "discipline_a": "Mechanical", "discipline_b": "Electrical", "location": "Level 10 — Electrical Room", "severity": "Soft", "status": "Resolved"},\n  {"clash_id": "CL-0338", "discipline_a": "Structural", "discipline_b": "Plumbing", "location": "Level 8 — Grid K/8", "severity": "Hard", "status": "In Review"}\n]\n\`\`\`\n\n47 total clashes | 23 resolved | 24 open (8 Hard conflicts)`
    return `A/E Project Status — Riverside Tower:\n\n- **156 drawing sheets** in current set\n- **19 open RFIs** (5 over 10 days [OVERDUE])\n- **2 Bluebeam sessions** awaiting sign-off\n- **12 sheets** updated in last 7 days\n\nUse prompt chips above for detailed queries.`
  }

  if (role === 'owner_developer') {
    if (q.includes('portfolio') || q.includes('executive') || q.includes('health') || q.includes('summary')) return OW_PORTFOLIO_RESPONSE
    if (q.includes('change order') || q.includes('pco') || q.includes('pending') || q.includes('approval')) return OW_CHANGE_ORDERS_RESPONSE
    if (q.includes('invoice') || q.includes('ap') || q.includes('payable')) return `CMiC AP — Invoices Pending Approval:\n\n\`\`\`json\n[\n  {"invoice": "INV-2240-0891", "vendor": "Allied Concrete Co.", "project": "Riverside Tower", "amount": 1240000, "age_days": 34, "status": "PM Review"},\n  {"invoice": "INV-2240-0897", "vendor": "Apex MEP Group", "project": "Riverside Tower", "amount": 890000, "age_days": 21, "status": "Owner Approval"},\n  {"invoice": "INV-2238-0312", "vendor": "Harbor Steel Works", "project": "Harbor District Office", "amount": 1420000, "age_days": 14, "status": "PM Review"},\n  {"invoice": "INV-2238-0318", "vendor": "Permasteelisa Group", "project": "Harbor District Office", "amount": 750000, "age_days": 7, "status": "Pending"},\n  {"invoice": "INV-2235-0204", "vendor": "Interior Systems Co.", "project": "Lakefront Retail", "amount": 340000, "age_days": 5, "status": "Pending"}\n]\n\`\`\`\n\n**Total Pending AP:** $4,640,000 | [ALERT] INV-2240-0891 at 34 days — Allied Concrete may apply late charges after 45 days.`
    if (q.includes('job cost') || q.includes('2240') || q.includes('cost type')) return `CMiC Job Cost Report — Project 2240 (Riverside Tower) by Cost Type:\n\n\`\`\`json\n[\n  {"cost_type": "Subcontracts", "budget": 98400000, "committed": 97800000, "actual": 54200000, "projected_final": 99100000, "variance": -700000},\n  {"cost_type": "Owner Direct Costs", "budget": 8200000, "committed": 8050000, "actual": 4100000, "projected_final": 8300000, "variance": -100000},\n  {"cost_type": "General Conditions", "budget": 6800000, "committed": 6750000, "actual": 3400000, "projected_final": 7100000, "variance": -300000},\n  {"cost_type": "Contingency", "budget": 5400000, "committed": 1200000, "actual": 850000, "projected_final": 1200000, "variance": 4200000}\n]\n\`\`\`\n\n[OVER BUDGET] Projected final cost exceeds budget by $1,100,000 on subcontracts + GC. Contingency draw of $847K approved for concrete overage.`
    if (q.includes('milestone') || q.includes('schedule') || q.includes('baseline')) return `Schedule Milestone Status — All Projects:\n\n\`\`\`json\n[\n  {"project": "Riverside Tower", "milestone": "Structural Topping Out", "baseline": "05/15/2026", "forecast": "06/01/2026", "variance_days": -17, "status": "At Risk"},\n  {"project": "Harbor District Office", "milestone": "Mechanical Substantial Completion", "baseline": "07/30/2026", "forecast": "07/28/2026", "variance_days": 2, "status": "On Track"},\n  {"project": "Lakefront Retail", "milestone": "Final Completion", "baseline": "04/30/2026", "forecast": "04/25/2026", "variance_days": 5, "status": "Ahead"}\n]\n\`\`\``
    return OW_PORTFOLIO_RESPONSE
  }

  if (role === 'safety') {
    if (q.includes('incident') || q.includes('osha') || q.includes('recordable') || q.includes('injury') || q.includes('accident')) return SAFETY_INCIDENTS_RESPONSE
    if (q.includes('metric') || q.includes('trir') || q.includes('dart') || q.includes('performance') || q.includes('kpi') || q.includes('stat')) return SAFETY_METRICS_RESPONSE
    if (q.includes('toolbox') || q.includes('tbt') || q.includes('training') || q.includes('talk') || q.includes('overdue')) return SAFETY_TOOLBOX_RESPONSE
    if (q.includes('compliance') || q.includes('loto') || q.includes('ppe') || q.includes('inspection') || q.includes('violation')) return SAFETY_COMPLIANCE_RESPONSE
    if (q.includes('observation') || q.includes('near miss') || q.includes('hazard') || q.includes('at-risk')) return `Safety Observations — Last 7 Days (Riverside Tower):\n\n\`\`\`json\n[\n  {"id": "OBS-2240-089", "type": "At-Risk", "description": "Ironworker not clipped off at leading edge — Level 14", "observer": "Safety Officer Chen", "date": "03/07/2026", "corrected_on_site": true},\n  {"id": "OBS-2240-088", "type": "Positive", "description": "Concrete crew conducting spontaneous housekeeping before shift end", "observer": "PM Rodriguez", "date": "03/06/2026", "corrected_on_site": false},\n  {"id": "OBS-2240-087", "type": "At-Risk", "description": "Missing barricade around Level 12 slab opening", "observer": "Safety Officer Chen", "date": "03/05/2026", "corrected_on_site": true},\n  {"id": "OBS-2240-086", "type": "Positive", "description": "Electrical crew conducting toolbox talk before energizing panel — best practice", "observer": "Superintendent Walsh", "date": "03/04/2026", "corrected_on_site": false}\n]\n\`\`\`\n\n**4 observations this week** | 2 at-risk (both corrected on site) | 2 positive behaviors recognized.`
    return `Safety Dashboard — Riverside Tower (03/07/2026):\n\n- **TRIR (90-day):** 2.80 vs 3.40 industry avg ✓\n- **DART Rate:** 1.20 vs 1.80 industry avg ✓\n- **Days without recordable:** 8 (reset 02/21 — LOTO incident)\n- **Open incidents:** 2 OSHA-recordable, corrective actions pending\n- **[ALERT] LOTO non-compliance** — Electrical crew requires retraining\n\nUse the prompt chips above for incident reports, compliance status, toolbox talks, and safety metrics.`
  }

  // preconstruction
  if (q.includes('bid') || q.includes('itb') || q.includes('invitation') || q.includes('deadline')) return PRE_BIDS_RESPONSE
  if (q.includes('takeoff') || q.includes('slab') || q.includes('stack') || q.includes('quantity') || q.includes('floor')) return PRE_TAKEOFF_RESPONSE
  if (q.includes('estimate') || q.includes('sage') || q.includes('similar') || q.includes('historic')) return PRE_ESTIMATE_RESPONSE
  if (q.includes('sub') || q.includes('coverage') || q.includes('trade') || q.includes('bid level')) return PRE_BIDS_RESPONSE
  if (q.includes('csi') || q.includes('division') || q.includes('breakdown')) return `STACK Quantity Breakdown by CSI Division — Northside Community Center:\n\n\`\`\`json\n[\n  {"division": "Div 03 - Concrete", "quantity": "47,230 SF slab; 1,240 CY foundations", "unit": "SF/CY"},\n  {"division": "Div 05 - Structural Steel", "quantity": "312 tons", "unit": "TON"},\n  {"division": "Div 07 - Thermal & Moisture", "quantity": "28,400 SF insulation; 920 LF flashing", "unit": "SF/LF"},\n  {"division": "Div 09 - Finishes", "quantity": "42,100 SF drywall; 18,200 SF flooring", "unit": "SF"},\n  {"division": "Div 15 - Mechanical", "quantity": "8,400 LF ductwork; 42 diffusers", "unit": "LF/EA"},\n  {"division": "Div 16 - Electrical", "quantity": "12,800 LF conduit; 340 devices", "unit": "LF/EA"}\n]\n\`\`\``
  return PRE_ESTIMATE_RESPONSE
}
