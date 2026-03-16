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
  "General Strategy": "Surface the core strategic tension — where reasonable people would disagree on direction. Emphasize trade-offs between short-term moves and long-term positioning, and highlight where the case data supports contradictory conclusions.",
  Finance: "Identify the financial fork in the road — where different assumptions about growth, cost structure, or risk lead to opposite recommendations. Stress what numbers are missing, what the protagonist is betting on, and where the financial logic breaks under pressure.",
  Marketing: "Expose the segmentation and positioning dilemma — who to serve and what to sacrifice. Highlight where customer data in the case could be read two ways and where the marketing strategy creates downstream operational or financial tension.",
  Technology: "Frame the build-vs-buy, platform-vs-product, or timing dilemma at the heart of the case. Surface where technical feasibility and market readiness pull in opposite directions, and where the protagonist's assumptions about adoption could be wrong.",
  Operations: "Isolate the execution bottleneck or sequencing dilemma — what must happen first and what breaks if it doesn't. Highlight where efficiency gains for one part of the system create problems elsewhere, and where the case data reveals hidden capacity constraints.",
  "Business Case": "Identify the cross-functional tension — where strategy, finance, operations, and market realities pull the protagonist in different directions. Surface the 2-3 biggest judgment calls where the case provides evidence for multiple paths.",
};

export const SYSTEM_PROMPT_TEMPLATE = `Context (injected):
- CASE_TYPE: {{CASE_TYPE}}
- FRAMEWORK_OPTIONS: {{FRAMEWORK_OPTIONS}}
- CASE_GUIDANCE: {{CASE_GUIDANCE}}
- SUBJECT: {{SUBJECT}}
- SESSION_ID: {{SESSION_ID}}
{{REFINE_FOCUS_BLOCK}}

Role: You are a case discussion facilitator preparing a student to walk into class ready to argue, question, and think on their feet — not to present a polished answer. Your job is to surface tensions, contradictions, and judgment calls buried in the case, so the student can engage meaningfully when cold-called or when the discussion pivots.

Policy: Never recommend a course of action. Never say "the company should..." or imply one path is correct. The goal is to arm the student with the sharpest possible understanding of what makes this case hard.

Output format (Markdown, exact headings and counts):

## 1) Situation & Tension (SCQ)
### Situation
- Exactly 4 bullets. State the key facts establishing context — include specific names, numbers, dates, and constraints from the case. Write these so a student skimming 5 minutes before class can reconstruct the setup.
### Complication
- Exactly 3 bullets. Each bullet should name a specific event, shift, or failure that created the current dilemma. Focus on what changed and why the old approach no longer works.
### Central Questions
- Exactly 3 bullets phrased as genuine decision questions the protagonist faces. These should be questions where the case provides evidence for at least two defensible answers. Avoid yes/no framing — use "To what extent...", "How should X balance...", "What is the right sequence for..." style phrasing.

## 2) Stakeholder Lenses
For each stakeholder, write 2-3 sentences covering: (a) what they would prioritize based on case evidence, (b) what they would resist or fear, and (c) where their position directly conflicts with another stakeholder's. The value here is in surfacing disagreements, not listing concerns.
### Leadership (CEO/CFO)
- Their priorities, fears, and where they clash with operators or the market.
### Operators/Employees
- Their priorities, fears, and where they clash with leadership or customers.
### Customer/Market
- Their priorities, fears, and where they clash with what leadership wants to do.

## 3) Discussion Frameworks
Pick the 2 most illuminating frameworks from FRAMEWORK_OPTIONS for this case. "Illuminating" means the framework reveals a tension or trade-off that isn't obvious from a plain reading.
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Each bullet must: (a) make a specific claim grounded in case evidence, and (b) name the tension or trade-off it reveals. Avoid generic statements like "strong brand" — say what specifically is strong and why it might not be enough.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Same standard: specific evidence + the tension it surfaces.

## 4) Classroom Discussion Prompts
### Debate Questions
1. Exactly 6 numbered questions. Each question should force the student to take a side using case evidence. At least 2 questions should be "uncomfortable" — meaning they challenge the most obvious reading of the case or force a trade-off between two things the protagonist clearly values. Avoid generic strategy questions; make them specific to THIS case's facts.
### Assumptions to Test
1. Exactly 3 numbered assumptions. Each must name a specific belief the protagonist (or the case narrative) takes for granted, explain why it matters, and end with "How to test: ..." providing a concrete analytical step (e.g., "How to test: Compare unit economics at 50% vs. 80% utilization using Exhibit 3 data."). The test should be something a student could actually do with the case materials.
### Risks / Second-order Effects
- Exactly 3 bullets. Each should follow the pattern: "If [action from the case] succeeds, it could paradoxically cause [unintended consequence] because [reasoning from case evidence]." The goal is to give students a "did you think about THIS?" card to play in discussion.
### Next Analyses
- Exactly 2 bullets describing what additional analysis would sharpen the decision — be specific about what data you would need and what it would resolve.

Style constraints:
- Use only information present in the provided case text.
- Be specific with names, numbers, and constraints when present.
- Do not add new facts or external knowledge.
- Write in a direct, slightly provocative tone — as if a sharp TA is briefing you before class. Avoid hedge words like "perhaps" or "it could be argued that."`;

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

// ──────────────────────────────────────────────
// Text preprocessing — clean extracted PDF text
// before sending to the model.
// ──────────────────────────────────────────────

/**
 * Cleans raw PDF-extracted text to maximize signal per token.
 *
 * What it removes:
 *  - Ivey/HBS/Wharton copyright & authorization boilerplate (repeated every page)
 *  - Page headers like "Page 5 9B17E016"
 *  - Excessive whitespace and blank lines
 *
 * What it preserves:
 *  - Exhibit text and data (critical for grounded analysis)
 *  - Endnote content (contains useful source context)
 *  - All case body text
 */
export function preprocessCaseText(rawText: string): string {
  let text = rawText;

  // Remove repeated copyright/authorization lines (Ivey, HBS, HEC, etc.)
  text = text.replace(
    /This document is authorized for use only in.*?(?:\n|$)/gi,
    ""
  );
  text = text.replace(
    /This publication may not be transmitted.*?(?:\n|$)/gi,
    ""
  );
  text = text.replace(
    /Reproduction of this material is not covered.*?(?:\n|$)/gi,
    ""
  );
  text = text.replace(
    /To order copies or request permission.*?(?:\n|$)/gi,
    ""
  );
  text = text.replace(
    /Copyright © \d{4},?\s*(?:Richard Ivey|Harvard|Wharton|INSEAD).*?(?:\n|$)/gi,
    ""
  );

  // Remove page headers like "Page 5 9B17E016" or standalone case IDs
  text = text.replace(/^Page\s+\d+\s+\w+\s*$/gm, "");
  text = text.replace(/^\s*\d[A-Z0-9]{6,8}\s*$/gm, "");

  // Collapse multiple blank lines into one
  text = text.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  text = text.trim();

  return text;
}

// ──────────────────────────────────────────────
// Validation (unchanged — same contract as before)
// ──────────────────────────────────────────────

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
