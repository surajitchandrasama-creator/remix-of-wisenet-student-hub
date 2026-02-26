import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PdfCard } from "@/components/PreReadsSidebar";

describe("PreReadsSidebar PdfCard UX", () => {
  it("disables Generate Summary when case type is empty for TA", () => {
    render(
      <PdfCard
        itemKey="session-1"
        isTA={true}
        pdf={{
          fileName: "case.pdf",
          summary: "",
          loading: false,
          error: "",
          text: "some extracted text",
          caseType: "",
          refinement: "",
          truncated: false,
          extractedTextLength: 1200,
        }}
        onCaseTypeChange={vi.fn()}
        onRefinementChange={vi.fn()}
        onSummarize={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /generate summary/i })).toBeDisabled();
    expect(screen.getByText(/select a case focus to generate/i)).toBeInTheDocument();
  });

  it("shows warning when extracted text is too short", () => {
    render(
      <PdfCard
        itemKey="session-1"
        isTA={false}
        pdf={{
          fileName: "case.pdf",
          summary: "## 1) Situation & Tension (SCQ)",
          loading: false,
          error: "",
          text: "tiny",
          caseType: "Finance",
          refinement: "",
          truncated: false,
          extractedTextLength: 120,
        }}
        onCaseTypeChange={vi.fn()}
        onRefinementChange={vi.fn()}
        onSummarize={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /view summary/i }));
    expect(screen.getByText(/limited extracted text detected/i)).toBeInTheDocument();
  });
});
