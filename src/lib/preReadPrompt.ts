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

// ──────────────────────────────────────────────
// Per-type system prompts
// ──────────────────────────────────────────────

const SHARED_PREAMBLE = `Context (injected):
- CASE_TYPE: {{CASE_TYPE}}
- FRAMEWORK_OPTIONS: {{FRAMEWORK_OPTIONS}}
- SUBJECT: {{SUBJECT}}
- SESSION_ID: {{SESSION_ID}}
{{REFINE_FOCUS_BLOCK}}

Policy: Use only information present in the provided case text. Be specific with names, numbers, dates, and constraints. Do not add new facts or external knowledge.`;

// ─── GENERAL STRATEGY (concept/topic cases like Eight Shifts, McKinsey frameworks) ───

const GENERAL_STRATEGY_PROMPT = `${SHARED_PREAMBLE}

Role: You are a study-aid that helps students internalize strategic concepts and frameworks from reading material. The goal is to extract the core ideas, show how they connect, and provide concrete application examples — not to debate a decision.

Output format (Markdown, exact headings and counts):

## 1) Core Concepts
### Key Ideas
- Exactly 5 bullets. Each bullet names one distinct concept, framework, or principle from the reading and explains it in 1-2 sentences. Use the author's terminology where present.
### How They Connect
- Exactly 3 bullets. Each bullet explains a relationship between two or more of the key ideas above — how one enables, constrains, or builds on another.

## 2) Application Examples
### From the Reading
- Exactly 3 bullets. Each bullet describes a specific company, industry, or scenario mentioned in the reading that illustrates one of the key ideas. Name the company/example and the concept it demonstrates.
### Beyond the Reading
- Exactly 3 bullets. Each bullet proposes a real-world scenario (not from the reading) where one of the key ideas would apply. Explain which concept it tests and why. These should be examples a student could use in class to show they've internalized the framework.

## 3) Framework Comparison
### When to Use This Framework
- Exactly 3 bullets describing the types of strategic situations where this framework adds the most value.
### Limitations
- Exactly 3 bullets describing what this framework misses, oversimplifies, or assumes away.

## 4) Class Preparation
### Likely Discussion Questions
1. Exactly 4 numbered questions a professor might ask to test understanding of these concepts.
### Connections to Other Frameworks
- Exactly 3 bullets linking ideas from this reading to other well-known strategy frameworks (e.g., Porter, Christensen, resource-based view). Name the framework and explain the connection.
### Key Takeaway
- Exactly 1 bullet: the single most important insight a student should remember from this reading.

Style: Write clearly and concisely, as if a sharp TA is explaining these concepts to a peer. Avoid hedge words.`;

// ─── FINANCE (mix of conceptual understanding + decision-based analysis) ───

const FINANCE_PROMPT = `${SHARED_PREAMBLE}

Role: You are a finance case discussion facilitator. Your job is to help students understand the financial logic of the case, identify the key assumptions driving the numbers, and prepare to discuss what changes if those assumptions shift. Balance conceptual understanding with decision-oriented analysis.

Output format (Markdown, exact headings and counts):

## 1) Situation & Financial Context
### Setup
- Exactly 4 bullets summarizing the company/situation, the financial decision at hand, key players, and the time frame. Include specific numbers from the case.
### Key Financial Data
- Exactly 4 bullets extracting the most decision-relevant numbers from the case (revenue, costs, margins, growth rates, valuations, debt levels, etc.). Each bullet should name the metric, its value, and why it matters for the decision.

## 2) Conceptual Foundation
### Financial Concepts at Play
- Exactly 4 bullets. Each names a financial concept or method used or implied in the case (e.g., DCF, WACC, leverage ratios, working capital management) and explains in 1-2 sentences how it applies to this specific situation.
### Common Mistakes
- Exactly 3 bullets describing analytical errors students commonly make with this type of financial problem. Be specific to the case context.

## 3) Assumption Sensitivity
### Critical Assumptions
1. Exactly 4 numbered assumptions. Each names a specific assumption embedded in the case's financial logic, explains what it affects, and describes what happens to the conclusion if the assumption is wrong. Format: "[Assumption]. This drives [what it affects]. If wrong: [consequence]."
### What-If Scenarios
- Exactly 3 bullets. Each proposes a specific scenario (e.g., "If revenue growth slows from X% to Y%...") and traces its impact through the financial model or decision framework in the case.

## 4) Discussion Preparation
### Decision Framing
- Exactly 2 bullets. Frame the core financial decision(s) the protagonist faces, without recommending an answer. Highlight where the financial logic supports more than one path.
### Quantitative Questions
1. Exactly 4 numbered questions that require students to work with the case's numbers (not just discuss qualitatively). These should be the kind of questions a finance professor would ask in a cold call.
### Risks & Second-order Effects
- Exactly 3 bullets following the pattern: "If [financial action] succeeds, it could paradoxically [unintended consequence] because [reasoning from case data]."

Style: Be precise with numbers. Write as if a sharp finance TA is briefing you before class.`;

// ─── MARKETING (customer/segment focus, positioning tensions) ───

const MARKETING_PROMPT = `${SHARED_PREAMBLE}

Role: You are a marketing case discussion facilitator. Your job is to help students understand the customer, segment, and positioning tensions in the case — who to serve, what to sacrifice, and what the data says about customer behavior.

Output format (Markdown, exact headings and counts):

## 1) Market Context
### Situation
- Exactly 4 bullets covering the company, its market position, the marketing challenge, and key constraints. Include specific numbers.
### Customer & Segment Data
- Exactly 4 bullets extracting specific customer behavior data, segment sizes, preferences, or market research findings from the case. Each bullet should name the data point and its strategic implication.

## 2) Positioning & Strategy Tensions
### Current Positioning
- Exactly 3 bullets describing how the company currently positions itself — target segment, value proposition, and key differentiators as evidenced in the case.
### The Tension
- Exactly 3 bullets identifying where the current positioning is under pressure. What's changing in the market, customer behavior, or competitive landscape that forces a repositioning decision?

## 3) Framework Analysis
Pick the 2 most relevant frameworks from FRAMEWORK_OPTIONS for this case.
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Each makes a specific, evidence-based claim about one element of the framework as applied to this case, and names the marketing tension it reveals.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Same standard.

## 4) Discussion Preparation
### Debate Questions
1. Exactly 5 numbered questions. Each should force students to take a side on a marketing trade-off using case evidence (e.g., pursue segment A vs. segment B, premium vs. mass positioning, channel X vs. channel Y).
### Assumptions to Test
1. Exactly 3 numbered assumptions about customer behavior or market dynamics that the case takes for granted. Each must end with "How to test: ..." providing a concrete analytical step.
### Customer Insight
- Exactly 2 bullets describing a non-obvious insight about customer behavior or preferences that emerges from close reading of the case data — the kind of observation that would impress a professor.

Style: Write with a customer-first lens. Every claim should trace back to evidence about what customers do, want, or fear.`;

// ─── TECHNOLOGY (product/platform, adoption, build-vs-buy, sequencing) ───

const TECHNOLOGY_PROMPT = `${SHARED_PREAMBLE}

Role: You are a technology case discussion facilitator. Your job is to help students understand the product, platform, and adoption dynamics — where technical feasibility and market readiness pull in different directions, and where sequencing and timing matter as much as strategy.

Output format (Markdown, exact headings and counts):

## 1) Product & Technology Context
### Situation
- Exactly 4 bullets covering the company, its product/platform, the technology decision at hand, and key constraints. Include specific numbers and technical details from the case.
### Technology Landscape
- Exactly 3 bullets describing the relevant technology ecosystem — competing platforms, adoption curves, infrastructure dependencies, or standards mentioned in the case.

## 2) Core Dilemmas
### Build vs. Buy / Platform vs. Product
- Exactly 3 bullets framing the central technology trade-off in the case. What are the options, what does each cost, and what does each lock in or lock out?
### Adoption & Timing Risk
- Exactly 3 bullets examining when and how fast the market will adopt the technology. What does the case say about adoption barriers, network effects, or switching costs?

## 3) Framework Analysis
Pick the 2 most relevant frameworks from FRAMEWORK_OPTIONS for this case.
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Each makes a specific claim grounded in case evidence and names the technology tension it reveals.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Same standard.

## 4) Discussion Preparation
### Sequencing Questions
1. Exactly 4 numbered questions about what to build first, what to defer, and what dependencies exist. These should force students to think about order of operations, not just what to do.
### Technical Assumptions to Test
1. Exactly 3 numbered assumptions about technology feasibility, adoption speed, or platform dynamics. Each must end with "How to test: ..." providing a concrete step.
### Risks & Second-order Effects
- Exactly 3 bullets following the pattern: "If [technology bet] succeeds, it could paradoxically [unintended consequence] because [reasoning from case evidence]."
### Execution Priorities
- Exactly 2 bullets describing what the team should focus on in the next 90 days if they chose each of the two main paths in the case.

Style: Write with a builder's lens — concrete, sequencing-aware, and specific about what's technically hard vs. what's strategically uncertain.`;

// ─── OPERATIONS (process, bottleneck, capacity, implementation sequencing) ───

const OPERATIONS_PROMPT = `${SHARED_PREAMBLE}

Role: You are an operations case discussion facilitator. Your job is to help students identify bottlenecks, capacity constraints, and implementation sequences — where efficiency gains in one part of the system create problems elsewhere, and where the order of execution determines success or failure.

Output format (Markdown, exact headings and counts):

## 1) Operations Context
### Situation
- Exactly 4 bullets covering the company, its operations challenge, the current process/system, and key performance metrics from the case.
### Process & Capacity Data
- Exactly 4 bullets extracting specific operational data — throughput rates, cycle times, capacity utilization, defect rates, lead times, or cost structures mentioned in the case.

## 2) Bottleneck & Constraint Analysis
### Current Bottleneck(s)
- Exactly 3 bullets identifying the binding constraints in the current system. Name what's limiting throughput or performance, cite the evidence, and explain why it's the bottleneck (not just a problem).
### Ripple Effects
- Exactly 3 bullets describing how the identified bottleneck(s) create downstream problems elsewhere in the system. Follow the chain of cause and effect.

## 3) Framework Analysis
Pick the 2 most relevant frameworks from FRAMEWORK_OPTIONS for this case.
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Each makes a specific, evidence-based claim about one element of the framework as applied to this case's operations.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Same standard.

## 4) Implementation & Discussion
### Sequencing Questions
1. Exactly 4 numbered questions about what to implement first, what dependencies exist, and what breaks if the sequence is wrong.
### Capacity Assumptions to Test
1. Exactly 3 numbered assumptions about throughput, demand, or resource availability. Each must end with "How to test: ..." providing a concrete analytical step using case data.
### Risks & Second-order Effects
- Exactly 3 bullets following the pattern: "If [operational improvement] succeeds, it could paradoxically [unintended consequence] because [reasoning from case evidence]."
### Quick Wins vs. Structural Fixes
- Exactly 2 bullets: one identifying a change that could show results within weeks, and one identifying a deeper structural change that would take months but address root causes.

Style: Write with an operator's lens — concrete, quantitative, and focused on what actually moves the needle on throughput and cost.`;

// ─── BUSINESS CASE (cross-functional, debate-heavy — the Netflix-style template) ───

const BUSINESS_CASE_PROMPT = `${SHARED_PREAMBLE}

Role: You are a case discussion facilitator preparing a student to walk into class ready to argue, question, and think on their feet — not to present a polished answer. Your job is to surface tensions, contradictions, and judgment calls buried in the case, so the student can engage meaningfully when cold-called or when the discussion pivots.

Policy addition: Never recommend a course of action. Never say "the company should..." or imply one path is correct.

Output format (Markdown, exact headings and counts):

## 1) Situation & Tension (SCQ)
### Situation
- Exactly 4 bullets. State the key facts establishing context — include specific names, numbers, dates, and constraints from the case. Write these so a student skimming 5 minutes before class can reconstruct the setup.
### Complication
- Exactly 3 bullets. Each bullet should name a specific event, shift, or failure that created the current dilemma. Focus on what changed and why the old approach no longer works.
### Central Questions
- Exactly 3 bullets phrased as genuine decision questions the protagonist faces. These should be questions where the case provides evidence for at least two defensible answers. Avoid yes/no framing.

## 2) Stakeholder Lenses
For each stakeholder, write 2-3 sentences covering: (a) what they would prioritize based on case evidence, (b) what they would resist or fear, and (c) where their position directly conflicts with another stakeholder's.
### Leadership (CEO/CFO)
- Their priorities, fears, and where they clash with operators or the market.
### Operators/Employees
- Their priorities, fears, and where they clash with leadership or customers.
### Customer/Market
- Their priorities, fears, and where they clash with what leadership wants to do.

## 3) Discussion Frameworks
Pick the 2 most illuminating frameworks from FRAMEWORK_OPTIONS for this case.
### Framework 1: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Each must make a specific claim grounded in case evidence and name the tension or trade-off it reveals.
### Framework 2: <name from FRAMEWORK_OPTIONS>
- Exactly 5 bullets. Same standard.

## 4) Classroom Discussion Prompts
### Debate Questions
1. Exactly 6 numbered questions. Each should force the student to take a side using case evidence. At least 2 should be "uncomfortable" — challenging the obvious reading or forcing a trade-off.
### Assumptions to Test
1. Exactly 3 numbered assumptions. Each must name a specific belief taken for granted, explain why it matters, and end with "How to test: ..." providing a concrete analytical step.
### Risks / Second-order Effects
- Exactly 3 bullets. Each should follow: "If [action from the case] succeeds, it could paradoxically cause [unintended consequence] because [reasoning from case evidence]."
### Next Analyses
- Exactly 2 bullets describing what additional analysis would sharpen the decision.

Style: Write in a direct, slightly provocative tone — as if a sharp TA is briefing you before class. Avoid hedge words.`;

// ──────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────

const PROMPT_BY_TYPE: Record<CaseType, string> = {
  "General Strategy": GENERAL_STRATEGY_PROMPT,
  Finance: FINANCE_PROMPT,
  Marketing: MARKETING_PROMPT,
  Technology: TECHNOLOGY_PROMPT,
  Operations: OPERATIONS_PROMPT,
  "Business Case": BUSINESS_CASE_PROMPT,
};

export function getFrameworkOptions(caseType: CaseType): string[] {
  return FRAMEWORK_OPTIONS_BY_CASE_TYPE[caseType] || FRAMEWORK_OPTIONS_BY_CASE_TYPE["General Strategy"];
}

export function buildSystemPrompt(params: PromptBuildParams): string {
  const frameworkOptions = getFrameworkOptions(params.caseType).join(", ");
  const subject = params.subject?.trim() || "Not specified";
  const sessionId = params.sessionId?.trim() || "Not specified";
  const refinement = params.refinement?.trim();
  const refineFocusBlock = refinement ? `- REFINE_FOCUS: ${refinement}` : "";

  const template = PROMPT_BY_TYPE[params.caseType] || BUSINESS_CASE_PROMPT;

  return template
    .replace("{{CASE_TYPE}}", params.caseType)
    .replace("{{FRAMEWORK_OPTIONS}}", frameworkOptions)
    .replace("{{SUBJECT}}", subject)
    .replace("{{SESSION_ID}}", sessionId)
    .replace("{{REFINE_FOCUS_BLOCK}}", refineFocusBlock);
}

// ──────────────────────────────────────────────
// Text preprocessing
// ──────────────────────────────────────────────

export function preprocessCaseText(rawText: string): string {
  let text = rawText;

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

  text = text.replace(/^Page\s+\d+\s+\w+\s*$/gm, "");
  text = text.replace(/^\s*\d[A-Z0-9]{6,8}\s*$/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

// ──────────────────────────────────────────────
// Validation — per-type validators
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

function hasHeadings(text: string, headings: string[]): boolean {
  return headings.every((h) => text.includes(h));
}

// --- Business Case validator (original, strict) ---

function isValidBusinessCase(text: string): boolean {
  const h1 = "## 1) Situation & Tension (SCQ)";
  const h2 = "## 2) Stakeholder Lenses";
  const h3 = "## 3) Discussion Frameworks";
  const h4 = "## 4) Classroom Discussion Prompts";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);
  if (!s1 || !s3 || !s4) return false;

  const situation = extractBlock(s1, "### Situation", ["### Complication", "### Central Questions"]);
  const complication = extractBlock(s1, "### Complication", ["### Central Questions"]);
  const central = extractBlock(s1, "### Central Questions", []);
  if (countBullets(situation) !== 4) return false;
  if (countBullets(complication) !== 3) return false;
  if (countBullets(central) !== 3) return false;

  const fwMatches = [...s3.matchAll(/^### Framework \d+:.*$/gm)];
  if (fwMatches.length !== 2) return false;
  const fwBlocks = fwMatches.map((m, i) => {
    const start = m.index ?? 0;
    const end = i === fwMatches.length - 1 ? s3.length : fwMatches[i + 1].index ?? s3.length;
    return s3.slice(start, end);
  });
  if (!fwBlocks.every((b) => countBullets(b) === 5)) return false;

  const debate = extractBlock(s4, "### Debate Questions", ["### Assumptions to Test"]);
  const assumptions = extractBlock(s4, "### Assumptions to Test", ["### Risks / Second-order Effects", "### Risks / Second-order effects"]);
  const risks = extractBlock(s4, "### Risks / Second-order Effects", ["### Next Analyses"])
    || extractBlock(s4, "### Risks / Second-order effects", ["### Next Analyses"]);
  const next = extractBlock(s4, "### Next Analyses", []);
  if (countNumbered(debate) !== 6) return false;

  const aLines = (assumptions.match(/^\s*\d+\.\s+.*$/gm) || []).map((l) => l.trim());
  if (aLines.length !== 3) return false;
  if (!aLines.every((l) => /How to test:/i.test(l))) return false;

  if (countBullets(risks) !== 3) return false;
  if (countBullets(next) !== 2) return false;

  return true;
}

// --- General Strategy validator ---

function isValidGeneralStrategy(text: string): boolean {
  const h1 = "## 1) Core Concepts";
  const h2 = "## 2) Application Examples";
  const h3 = "## 3) Framework Comparison";
  const h4 = "## 4) Class Preparation";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s2 = extractBlock(text, h2, [h3]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);

  const keyIdeas = extractBlock(s1, "### Key Ideas", ["### How They Connect"]);
  const connections = extractBlock(s1, "### How They Connect", []);
  if (countBullets(keyIdeas) !== 5) return false;
  if (countBullets(connections) !== 3) return false;

  const fromReading = extractBlock(s2, "### From the Reading", ["### Beyond the Reading"]);
  const beyond = extractBlock(s2, "### Beyond the Reading", []);
  if (countBullets(fromReading) !== 3) return false;
  if (countBullets(beyond) !== 3) return false;

  const whenToUse = extractBlock(s3, "### When to Use This Framework", ["### Limitations"]);
  const limitations = extractBlock(s3, "### Limitations", []);
  if (countBullets(whenToUse) !== 3) return false;
  if (countBullets(limitations) !== 3) return false;

  const questions = extractBlock(s4, "### Likely Discussion Questions", ["### Connections to Other Frameworks"]);
  const otherFw = extractBlock(s4, "### Connections to Other Frameworks", ["### Key Takeaway"]);
  const takeaway = extractBlock(s4, "### Key Takeaway", []);
  if (countNumbered(questions) !== 4) return false;
  if (countBullets(otherFw) !== 3) return false;
  if (countBullets(takeaway) !== 1) return false;

  return true;
}

// --- Finance validator ---

function isValidFinance(text: string): boolean {
  const h1 = "## 1) Situation & Financial Context";
  const h2 = "## 2) Conceptual Foundation";
  const h3 = "## 3) Assumption Sensitivity";
  const h4 = "## 4) Discussion Preparation";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s2 = extractBlock(text, h2, [h3]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);

  const setup = extractBlock(s1, "### Setup", ["### Key Financial Data"]);
  const finData = extractBlock(s1, "### Key Financial Data", []);
  if (countBullets(setup) !== 4) return false;
  if (countBullets(finData) !== 4) return false;

  const concepts = extractBlock(s2, "### Financial Concepts at Play", ["### Common Mistakes"]);
  const mistakes = extractBlock(s2, "### Common Mistakes", []);
  if (countBullets(concepts) !== 4) return false;
  if (countBullets(mistakes) !== 3) return false;

  const criticalA = extractBlock(s3, "### Critical Assumptions", ["### What-If Scenarios"]);
  const whatIf = extractBlock(s3, "### What-If Scenarios", []);
  if (countNumbered(criticalA) !== 4) return false;
  if (countBullets(whatIf) !== 3) return false;

  const decision = extractBlock(s4, "### Decision Framing", ["### Quantitative Questions"]);
  const quantQ = extractBlock(s4, "### Quantitative Questions", ["### Risks & Second-order Effects", "### Risks"]);
  const risks = extractBlock(s4, "### Risks & Second-order Effects", [])
    || extractBlock(s4, "### Risks", []);
  if (countBullets(decision) !== 2) return false;
  if (countNumbered(quantQ) !== 4) return false;
  if (countBullets(risks) !== 3) return false;

  return true;
}

// --- Marketing validator ---

function isValidMarketing(text: string): boolean {
  const h1 = "## 1) Market Context";
  const h2 = "## 2) Positioning & Strategy Tensions";
  const h3 = "## 3) Framework Analysis";
  const h4 = "## 4) Discussion Preparation";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s2 = extractBlock(text, h2, [h3]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);

  const situation = extractBlock(s1, "### Situation", ["### Customer & Segment Data"]);
  const custData = extractBlock(s1, "### Customer & Segment Data", []);
  if (countBullets(situation) !== 4) return false;
  if (countBullets(custData) !== 4) return false;

  const currPos = extractBlock(s2, "### Current Positioning", ["### The Tension"]);
  const tension = extractBlock(s2, "### The Tension", []);
  if (countBullets(currPos) !== 3) return false;
  if (countBullets(tension) !== 3) return false;

  const fwMatches = [...s3.matchAll(/^### Framework \d+:.*$/gm)];
  if (fwMatches.length !== 2) return false;

  const debate = extractBlock(s4, "### Debate Questions", ["### Assumptions to Test"]);
  const assumptions = extractBlock(s4, "### Assumptions to Test", ["### Customer Insight"]);
  const insight = extractBlock(s4, "### Customer Insight", []);
  if (countNumbered(debate) !== 5) return false;

  const aLines = (assumptions.match(/^\s*\d+\.\s+.*$/gm) || []).map((l) => l.trim());
  if (aLines.length !== 3) return false;
  if (!aLines.every((l) => /How to test:/i.test(l))) return false;

  if (countBullets(insight) !== 2) return false;

  return true;
}

// --- Technology validator ---

function isValidTechnology(text: string): boolean {
  const h1 = "## 1) Product & Technology Context";
  const h2 = "## 2) Core Dilemmas";
  const h3 = "## 3) Framework Analysis";
  const h4 = "## 4) Discussion Preparation";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s2 = extractBlock(text, h2, [h3]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);

  const situation = extractBlock(s1, "### Situation", ["### Technology Landscape"]);
  const landscape = extractBlock(s1, "### Technology Landscape", []);
  if (countBullets(situation) !== 4) return false;
  if (countBullets(landscape) !== 3) return false;

  const buildBuy = extractBlock(s2, "### Build vs. Buy / Platform vs. Product", ["### Adoption & Timing Risk"]);
  const adoption = extractBlock(s2, "### Adoption & Timing Risk", []);
  if (countBullets(buildBuy) !== 3) return false;
  if (countBullets(adoption) !== 3) return false;

  const fwMatches = [...s3.matchAll(/^### Framework \d+:.*$/gm)];
  if (fwMatches.length !== 2) return false;

  const seqQ = extractBlock(s4, "### Sequencing Questions", ["### Technical Assumptions to Test"]);
  const techA = extractBlock(s4, "### Technical Assumptions to Test", ["### Risks & Second-order Effects", "### Risks"]);
  const risks = extractBlock(s4, "### Risks & Second-order Effects", ["### Execution Priorities"])
    || extractBlock(s4, "### Risks", ["### Execution Priorities"]);
  const exec = extractBlock(s4, "### Execution Priorities", []);
  if (countNumbered(seqQ) !== 4) return false;

  const aLines = (techA.match(/^\s*\d+\.\s+.*$/gm) || []).map((l) => l.trim());
  if (aLines.length !== 3) return false;
  if (!aLines.every((l) => /How to test:/i.test(l))) return false;

  if (countBullets(risks) !== 3) return false;
  if (countBullets(exec) !== 2) return false;

  return true;
}

// --- Operations validator ---

function isValidOperations(text: string): boolean {
  const h1 = "## 1) Operations Context";
  const h2 = "## 2) Bottleneck & Constraint Analysis";
  const h3 = "## 3) Framework Analysis";
  const h4 = "## 4) Implementation & Discussion";
  if (!hasHeadings(text, [h1, h2, h3, h4])) return false;

  const s1 = extractBlock(text, h1, [h2]);
  const s2 = extractBlock(text, h2, [h3]);
  const s3 = extractBlock(text, h3, [h4]);
  const s4 = extractBlock(text, h4, []);

  const situation = extractBlock(s1, "### Situation", ["### Process & Capacity Data"]);
  const procData = extractBlock(s1, "### Process & Capacity Data", []);
  if (countBullets(situation) !== 4) return false;
  if (countBullets(procData) !== 4) return false;

  const bottleneck = extractBlock(s2, "### Current Bottleneck(s)", ["### Ripple Effects"]);
  const ripple = extractBlock(s2, "### Ripple Effects", []);
  if (countBullets(bottleneck) !== 3) return false;
  if (countBullets(ripple) !== 3) return false;

  const fwMatches = [...s3.matchAll(/^### Framework \d+:.*$/gm)];
  if (fwMatches.length !== 2) return false;

  const seqQ = extractBlock(s4, "### Sequencing Questions", ["### Capacity Assumptions to Test"]);
  const capA = extractBlock(s4, "### Capacity Assumptions to Test", ["### Risks & Second-order Effects", "### Risks"]);
  const risks = extractBlock(s4, "### Risks & Second-order Effects", ["### Quick Wins vs. Structural Fixes", "### Quick Wins"])
    || extractBlock(s4, "### Risks", ["### Quick Wins vs. Structural Fixes", "### Quick Wins"]);
  const quickWins = extractBlock(s4, "### Quick Wins vs. Structural Fixes", [])
    || extractBlock(s4, "### Quick Wins", []);
  if (countNumbered(seqQ) !== 4) return false;

  const aLines = (capA.match(/^\s*\d+\.\s+.*$/gm) || []).map((l) => l.trim());
  if (aLines.length !== 3) return false;
  if (!aLines.every((l) => /How to test:/i.test(l))) return false;

  if (countBullets(risks) !== 3) return false;
  if (countBullets(quickWins) !== 2) return false;

  return true;
}

// --- Unified validator ---

const VALIDATOR_BY_TYPE: Record<CaseType, (text: string) => boolean> = {
  "General Strategy": isValidGeneralStrategy,
  Finance: isValidFinance,
  Marketing: isValidMarketing,
  Technology: isValidTechnology,
  Operations: isValidOperations,
  "Business Case": isValidBusinessCase,
};

export function isValidSummary(text: string, caseType?: CaseType): boolean {
  if (!text || !text.trim()) return false;
  const validator = caseType ? VALIDATOR_BY_TYPE[caseType] : isValidBusinessCase;
  return validator(text);
}

// ──────────────────────────────────────────────
// Format repair (shared across all types)
// ──────────────────────────────────────────────

export const FORMAT_REPAIR_SYSTEM_PROMPT = `Rewrite the provided summary into the exact required Markdown format and counts.
Do not add any new facts. Keep all content grounded in the original text.
No final decision, no should-do X. Preserve all section headings exactly as specified.`;

export function buildFormatRepairUserPrompt(generatedSummary: string): string {
  return `Rewrite the summary below to match the strict format and counts exactly.
Keep existing facts only; do not invent new data.

SUMMARY TO REFORMAT:
${generatedSummary}`;
}