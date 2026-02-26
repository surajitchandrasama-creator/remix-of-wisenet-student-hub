import { describe, expect, it } from "vitest";
import { buildSystemPrompt, isValidSummary } from "@/lib/preReadPrompt";

describe("pre-read prompt design", () => {
  it("injects case type and defaults into system prompt", () => {
    const prompt = buildSystemPrompt({ caseType: "Marketing" });
    expect(prompt).toContain("CASE_TYPE: Marketing");
    expect(prompt).toContain("FRAMEWORK_OPTIONS: 4Ps, Customer Journey Mapping, STP, Brand Positioning");
    expect(prompt).toContain("SUBJECT: Not specified");
    expect(prompt).toContain("SESSION_ID: Not specified");
  });

  it("validates strict output format", () => {
    const valid = `## 1) Situation & Tension (SCQ)
### Situation
- Fact 1
- Fact 2
- Fact 3
- Fact 4
### Complication
- Complication 1
- Complication 2
- Complication 3
### Central Questions
- Question 1?
- Question 2?
- Question 3?

## 2) Stakeholder Lenses
### Leadership (CEO/CFO)
- Leadership view and disagreement.
### Operators/Employees
- Operator view and disagreement.
### Customer/Market
- Market view and disagreement.

## 3) Discussion Frameworks
### Framework 1: 4Ps
- P1
- P2
- P3
- P4
- P5
### Framework 2: Customer Journey Mapping
- C1
- C2
- C3
- C4
- C5

## 4) Classroom Discussion Prompts
### Debate Questions
1. Q1?
2. Q2?
3. Q3?
4. Q4?
5. Q5?
6. Q6?
### Assumptions to Test
1. Assumption A. How to test: use data A.
2. Assumption B. How to test: use data B.
3. Assumption C. How to test: use data C.
### Risks / Second-order Effects
- Risk 1
- Risk 2
- Risk 3
### Next Analyses
- Analysis 1
- Analysis 2`;

    const invalid = `## 1) Situation & Tension (SCQ)
### Situation
- Only one bullet

## 4) Classroom Discussion Prompts
### Debate Questions
1. One question only`;

    expect(isValidSummary(valid)).toBe(true);
    expect(isValidSummary(invalid)).toBe(false);
  });
});
