import { Sparkles, X, Upload, FileText, Loader2, Minus, Maximize2, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { usePreReadPdfs } from "@/hooks/usePreReadPdfs";
import { CaseType } from "@/lib/preReadPrompt";
import { format, addDays } from "date-fns";

interface CalendarSession {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  sessionType: string;
  faculty: string;
  weekStart?: string;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function getTodaySessions(): CalendarSession[] {
  try {
    const stored = localStorage.getItem("calendar-schedule");
    if (!stored) return [];
    const all: CalendarSession[] = JSON.parse(stored);

    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0 ... Sun=6
    const weekStartDate = addDays(today, -dayOfWeek);
    const weekStartKey = format(weekStartDate, "yyyy-MM-dd");

    return all
      .filter((s) => s.weekStart === weekStartKey && s.day === dayOfWeek)
      .sort((a, b) => {
        const toMins = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        return toMins(a.startTime) - toMins(b.startTime);
      });
  } catch {
    return [];
  }
}

const PreReadsSidebar = () => {
  const {
    pdfsByItem,
    fileInputRef,
    triggerUpload,
    handleFileChange,
    removePdf,
    updatePdfCaseType,
    updatePdfRefinement,
    summarizePdf,
  } = usePreReadPdfs();

  const [todaySessions] = useState<CalendarSession[]>(getTodaySessions);

  const userSession = JSON.parse(localStorage.getItem("wisenet_session") || "{}");
  const isTA = userSession.role === "TA";

  const todayLabel = format(new Date(), "EEE, d MMM yyyy");
  const totalPdfsToday = todaySessions.reduce((count, session) => count + ((pdfsByItem[session.id] || []).length), 0);

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-full overflow-y-auto border-l bg-card shadow-elevated">
      <div className="border-b px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">Upcoming Pre-reads</h2>
        {/* UX(1): subtle instruction banner */}
        <p className="mt-1 text-xs text-muted-foreground">
          Select case type, generate summary, then view the structured discussion brief.
        </p>
      </div>

      <div className="p-4 space-y-5">
        {todaySessions.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
            {/* UX(2): empty-state guidance */}
            <p className="text-xs text-muted-foreground">
              {isTA ? "Upload a pre-read PDF when sessions are available." : "Your TA will upload pre-read PDFs for each session."}
            </p>
          </div>
        ) : (
          <div>
            <div className="sticky top-0 z-10 mb-2 bg-card pb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Today - {todayLabel}
              </span>
            </div>

            {totalPdfsToday === 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                {/* UX(2): empty-state guidance when sessions exist but no PDFs */}
                {isTA ? "No pre-read PDFs attached yet. Use the upload icon on a session to add one." : "No pre-read PDFs have been shared yet for today."}
              </p>
            )}

            <div className="space-y-2">
              {todaySessions.map((session) => {
                const itemKey = session.id;
                const pdfs = pdfsByItem[itemKey] || [];

                return (
                  <div key={itemKey}>
                    <div className="group flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-secondary">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </p>
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {session.courseCode}
                        </p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {session.sessionType} - {session.faculty}
                        </p>
                      </div>

                      {isTA && (
                        <button
                          onClick={() => triggerUpload(itemKey)}
                          className="mt-1 flex-shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Upload PDFs"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {pdfs.length > 0 && (
                      <div className="ml-2 mr-2 mt-1 space-y-1.5">
                        {pdfs.map((pdf, idx) => (
                          <PdfCard
                            key={`${pdf.fileName}-${idx}`}
                            itemKey={itemKey}
                            pdf={pdf}
                            isTA={isTA}
                            onRemove={isTA ? () => removePdf(itemKey, idx) : undefined}
                            onCaseTypeChange={(caseType) => updatePdfCaseType(itemKey, idx, caseType)}
                            onRefinementChange={(value) => updatePdfRefinement(itemKey, idx, value)}
                            onSummarize={() => summarizePdf(itemKey, idx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </aside>
  );
};

interface PdfCardProps {
  itemKey: string;
  isTA: boolean;
  pdf: {
    fileName: string;
    summary: string;
    loading: boolean;
    error: string;
    text: string;
    caseType: CaseType | "";
    refinement?: string;
    truncated?: boolean;
    extractedTextLength: number;
  };
  onRemove?: () => void;
  onCaseTypeChange: (caseType: CaseType | "") => void;
  onRefinementChange: (value: string) => void;
  onSummarize: () => void;
}

const FEEDBACK_KEY = "wisenet_summary_feedback";

export const PdfCard = ({ itemKey, isTA, pdf, onRemove, onCaseTypeChange, onRefinementChange, onSummarize }: PdfCardProps) => {
  const [isPopupWindowOpen, setIsPopupWindowOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const feedbackId = `${itemKey}::${pdf.fileName}`;
  const [feedback, setFeedback] = useState<"up" | "down" | "">(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}");
      return stored[feedbackId] || "";
    } catch {
      return "";
    }
  });

  const prevLoading = useRef(pdf.loading);
  useEffect(() => {
    if (prevLoading.current && !pdf.loading && pdf.summary) {
      setIsPopupWindowOpen(true);
      setIsMinimized(false);
    }
    prevLoading.current = pdf.loading;
  }, [pdf.loading, pdf.summary]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}");
      stored[feedbackId] = feedback;
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(stored));
    } catch {
      // ignore localStorage failures
    }
  }, [feedback, feedbackId]);

  return (
    <div className="rounded-md border bg-secondary/50 p-2.5 text-xs">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="truncate flex-1 font-medium text-foreground">{pdf.fileName}</span>
        {onRemove && (
          <button onClick={onRemove} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {pdf.error && <p className="mt-1.5 text-destructive">{pdf.error}</p>}

      {isTA && !pdf.loading && pdf.text && (
        <div className="mt-2 flex flex-col gap-2">
          {/* UX(6): select required for generation */}
          <select
            value={pdf.caseType}
            onChange={(e) => onCaseTypeChange(e.target.value as CaseType | "")}
            className="w-full rounded bg-background border border-input px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40 text-muted-foreground"
          >
            <option value="">Select case focus</option>
            <option value="General Strategy">General Strategy</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
            <option value="Technology">Technology</option>
            <option value="Operations">Operations</option>
            <option value="Business Case">Business case</option>
          </select>
          {/* UX(9): refine focus input */}
          <input
            type="text"
            value={pdf.refinement || ""}
            onChange={(e) => onRefinementChange(e.target.value)}
            placeholder="Refine focus (optional)"
            className="w-full rounded bg-background border border-input px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40 text-muted-foreground"
          />
          <button
            onClick={onSummarize}
            disabled={!pdf.caseType}
            className="flex items-center justify-center gap-1 rounded bg-primary/10 px-2 py-1.5 font-medium text-primary hover:bg-primary/20 transition-colors w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-3 w-3" /> {pdf.summary ? "Regenerate Summary" : "Generate Summary"}
          </button>
          {!pdf.caseType && (
            <p className="text-[11px] text-muted-foreground">Select a case focus to generate.</p>
          )}
        </div>
      )}

      {pdf.loading && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          {/* UX(3): loading helper text */}
          <Loader2 className="h-3 w-3 animate-spin" /> Generating structured discussion brief (15-30s)...
        </div>
      )}

      {pdf.summary && (
        <>
          <button
            onClick={() => { setIsPopupWindowOpen(true); setIsMinimized(false); }}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded bg-primary/10 px-2 py-1.5 font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> View Summary
          </button>

          {isPopupWindowOpen && (
            <div
              className={cn(
                "fixed z-50 border border-border shadow-2xl bg-card rounded-xl transition-all duration-300 flex flex-col overflow-hidden",
                isMinimized
                  ? "bottom-6 right-6 w-72 h-12"
                  : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl h-[85vh]"
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 cursor-default">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm truncate pr-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {pdf.fileName} - Analysis
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                    title={isMinimized ? "Maximize" : "Minimize"}
                  >
                    {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setIsPopupWindowOpen(false)}
                    className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 prose prose-sm md:prose-base dark:prose-invert max-w-none bg-background">
                  {/* UX(7): short extracted text warning */}
                  {pdf.extractedTextLength < 300 && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Limited extracted text detected (&lt; 300 chars). Output quality may be reduced.
                    </p>
                  )}
                  {/* UX(8): truncation disclosure */}
                  {pdf.truncated && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Source text was truncated to fit model limits (25,000 characters).
                    </p>
                  )}
                  <ReactMarkdown>{pdf.summary}</ReactMarkdown>
                  {/* UX(4): policy label */}
                  <p className="mt-4 text-xs text-muted-foreground">Discussion prep only, not a solver.</p>
                  {/* UX(11): summary feedback with local persistence */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setFeedback("up")}
                      disabled={feedback === "up"}
                      className="rounded border px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-60"
                    >
                      👍 Helpful
                    </button>
                    <button
                      onClick={() => setFeedback("down")}
                      disabled={feedback === "down"}
                      className="rounded border px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-60"
                    >
                      👎 Needs improvement
                    </button>
                    {feedback && <span className="text-muted-foreground">Thanks - feedback saved.</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PreReadsSidebar;
