export type CaseType =
  | "General Strategy"
  | "Finance"
  | "Marketing"
  | "Technology"
  | "Operations"
  | "Business Case";

export interface PromptBuildParams {
  caseType: CaseType;
  subject?: string;
  sessionId?: string;
  refinement?: string;
}

const FRAMEWORK_OPTIONS_BY_CASE_TYPE: Record<CaseType, string[]> = {
  "General Strategy": ["SWOT", "Porter's 5 Forces", "PESTEL", "3Cs", "VRIO"],
  Finance: ["Profitability Tree", "Unit Economics", "ROIC", "Break-even", "Sensitivity Analysis"],
  Marketing: ["4Ps", "Customer Journey Mapping", "STP", "Brand Positioning"],
  Technology: ["Product-Market Fit", "Business Model Canvas", "North Star Metric", "RICE Prioritization"],
  Operations: ["Process Mapping", "Bottleneck Analysis", "Capacity Utilization", "Service Blueprint"],
  "Business Case": ["SWOT", "Issue Tree", "Scenario Planning", "Risk Matrix", "3Cs"],
};

const CASE_GUIDANCE_BY_TYPE: Record<CaseType, string> = {
  "General Strategy": "Focus on strategic positioning, market forces, and organization-level trade-offs.",
  Finance: "Focus on profitability, capital allocation, risk-return trade-offs, and key financial assumptions.",
  Marketing: "Focus on target segment, positioning, channel strategy, pricing, and customer behavior evidence.",
  Technology: "Focus on product feasibility, adoption drivers, platform risks, and technology execution constraints.",
  Operations: "Focus on process efficiency, execution bottlenecks, capacity limits, and implementation sequencing.",
  "Business Case": "Balance strategic, financial, operational, and market angles to frame cross-functional trade-offs.",
};

export const SYSTEM_PROMPT_TEMPLATE = `Context (injected):
- CASE_TYPE: {{CASE_TYPE}}
- FRAMEWORK_OPTIONS: {{FRAMEWORK_OPTIONS}}
- CASE_GUIDANCE: {{CASE_GUIDANCE}}
- SUBJECT: {{SUBJECT}}
- SESSION_ID: {{SESSION_ID}}
{{REFINE_FOCUS_BLOCK}}

Role: You are a case discussion facilitator (not a solver). Help students prepare for class discussion using only the case text.
Policy: No final decision, no should-do X, no final plan.

Output format (Markdown, exact headings and counts):

## 1) Situation & Tension (SCQ)
### Situation
- Exactly 4 bullets grounded in the case.
### Complication
- Exactly 3 bullets on what changed or failed.
### Central Questions
- Exactly 3 bullets phrased as decision questions.

## 2) Stakeholder Lenses
### Leadership (CEO/CFO)
- What they care about + likely disagreement points.
### Operators/Employees
- What they care about + likely disagreement points.
### Customer/Market
- What they care about + likely disagreement points.

## 3) Discussion Frameworks
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 evidence-based bullets.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 evidence-based bullets.

## 4) Classroom Discussion Prompts
### Debate Questions
1. Exactly 6 numbered questions total.
### Assumptions to Test
1. Exactly 3 numbered assumptions; each line must include "How to test: ...".
### Risks / Second-order Effects
- Exactly 3 bullets.
### Next Analyses
- Exactly 2 bullets describing what to analyze next.

Style constraints:
- Use only information present in the provided case text.
- Be specific with names, numbers, and constraints when present.
- Do not add new facts.`;

export function getFrameworkOptions(caseType: CaseType): string[] {
  return FRAMEWORK_OPTIONS_BY_CASE_TYPE[caseType] || FRAMEWORK_OPTIONS_BY_CASE_TYPE["General Strategy"];
}

export function buildSystemPrompt(params: PromptBuildParams): string {
  const frameworkOptions = getFrameworkOptions(params.caseType).join(", ");
  const caseGuidance = CASE_GUIDANCE_BY_TYPE[params.caseType];
  const subject = params.subject?.trim() || "Not specified";
  const sessionId = params.sessionId?.trim() || "Not specified";
  const refinement = params.refinement?.trim();
  const refineFocusBlock = refinement ? `- REFINE_FOCUS: ${refinement}` : "";

  return SYSTEM_PROMPT_TEMPLATE
    .replace("{{CASE_TYPE}}", params.caseType)
    .replace("{{FRAMEWORK_OPTIONS}}", frameworkOptions)
    .replace("{{CASE_GUIDANCE}}", caseGuidance)
    .replace("{{SUBJECT}}", subject)
    .replace("{{SESSION_ID}}", sessionId)
    .replace("{{REFINE_FOCUS_BLOCK}}", refineFocusBlock);
}

function countBullets(block: string): number {
  return (block.match(/^\s*[-*]\s+/gm) || []).length;
}

function countNumbered(block: string): number {
  return (block.match(/^\s*\d+\.\s+/gm) || []).length;
}

function extractBlock(text: string, startMarker: string, endMarkers: string[]): string {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";

  const from = start + startMarker.length;
  let end = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker, from);
    if (idx >= 0 && idx < end) end = idx;
  }
  return text.slice(from, end).trim();
}

export function isValidSummary(text: string): boolean {
  if (!text || !text.trim()) return false;

  const heading1 = "## 1) Situation & Tension (SCQ)";
  const heading2 = "## 2) Stakeholder Lenses";
  const heading3 = "## 3) Discussion Frameworks";
  const heading4 = "## 4) Classroom Discussion Prompts";
  const requiredHeadings = [heading1, heading2, heading3, heading4];
  if (!requiredHeadings.every((h) => text.includes(h))) return false;

  const section1 = extractBlock(text, heading1, [heading2]);
  const section3 = extractBlock(text, heading3, [heading4]);
  const section4 = extractBlock(text, heading4, []);
  if (!section1 || !section3 || !section4) return false;

  const situation = extractBlock(section1, "### Situation", ["### Complication", "### Central Questions"]);
  const complication = extractBlock(section1, "### Complication", ["### Central Questions"]);
  const centralQuestions = extractBlock(section1, "### Central Questions", []);
  if (!situation || !complication || !centralQuestions) return false;
  if (countBullets(situation) !== 4) return false;
  if (countBullets(complication) !== 3) return false;
  if (countBullets(centralQuestions) !== 3) return false;

  const frameworkHeaderMatches = [...section3.matchAll(/^### Framework \d+:.*$/gm)];
  if (frameworkHeaderMatches.length !== 2) return false;
  const frameworkBlocks = frameworkHeaderMatches.map((match, idx) => {
    const start = match.index ?? 0;
    const end = idx === frameworkHeaderMatches.length - 1 ? section3.length : frameworkHeaderMatches[idx + 1].index ?? section3.length;
    return section3.slice(start, end);
  });
  if (!frameworkBlocks.every((b) => countBullets(b) === 5)) return false;

  const debate = extractBlock(section4, "### Debate Questions", ["### Assumptions to Test"]);
  const assumptions = extractBlock(section4, "### Assumptions to Test", ["### Risks / Second-order Effects", "### Risks / Second-order effects"]);
  const risks = extractBlock(section4, "### Risks / Second-order Effects", ["### Next Analyses"])
    || extractBlock(section4, "### Risks / Second-order effects", ["### Next Analyses"]);
  const nextAnalyses = extractBlock(section4, "### Next Analyses", []);

  if (!debate || !assumptions || !risks || !nextAnalyses) return false;
  if (countNumbered(debate) !== 6) return false;

  const assumptionLines = (assumptions.match(/^\s*\d+\.\s+.*$/gm) || []).map((line) => line.trim());
  if (assumptionLines.length !== 3) return false;
  if (!assumptionLines.every((line) => /How to test:/i.test(line))) return false;

  if (countBullets(risks) !== 3) return false;
  if (countBullets(nextAnalyses) !== 2) return false;

  return true;
}

export const FORMAT_REPAIR_SYSTEM_PROMPT = `Rewrite the provided summary into the exact required Markdown format and counts.
Do not add any new facts. Keep all content grounded in the original text.
No final decision, no should-do X.

Required headings:
## 1) Situation & Tension (SCQ)
## 2) Stakeholder Lenses
## 3) Discussion Frameworks
## 4) Classroom Discussion Prompts`;

export function buildFormatRepairUserPrompt(generatedSummary: string): string {
  return `Rewrite the summary below to match the strict format and counts exactly.
Keep existing facts only; do not invent new data.

SUMMARY TO REFORMAT:
${generatedSummary}`;
}
