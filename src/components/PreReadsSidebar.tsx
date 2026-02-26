import { Sparkles, X, Upload, FileText, ChevronDown, Loader2, Minus, Maximize2, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { usePreReadPdfs, CaseType } from "@/hooks/usePreReadPdfs";
interface PreReadItem {
  time: string;
  className: string;
  task: string;
}

interface DayGroup {
  date: string;
  items: PreReadItem[];
}

const preReadsData: DayGroup[] = [
  {
    date: "9th Feb",
    items: [
      { time: "10:40 AM", className: "Managerial Economics", task: "Read Chapter 4" },
      { time: "12:00 PM", className: "Business Analytics", task: "Review case study on clustering" },
      { time: "2:30 PM", className: "Marketing Management", task: "Read HBR article on positioning" },
    ],
  },
  {
    date: "10th Feb",
    items: [
      { time: "9:00 AM", className: "Financial Accounting", task: "Read Chapter 7 - Cash Flows" },
      { time: "11:15 AM", className: "Organizational Behaviour", task: "Watch pre-lecture video" },
      { time: "3:00 PM", className: "Business Intelligence", task: "Complete SQL worksheet" },
    ],
  },
  {
    date: "11th Feb",
    items: [
      { time: "10:00 AM", className: "Managerial Economics", task: "Read Chapter 5 - Elasticity" },
      { time: "1:00 PM", className: "Operations Management", task: "Review supply chain diagrams" },
    ],
  },
];

const PreReadsSidebar = () => {
  const { pdfsByItem, fileInputRef, triggerUpload, handleFileChange, removePdf, summarizePdf } = usePreReadPdfs();

  const userSession = JSON.parse(localStorage.getItem("wisenet_session") || "{}");
  const isTA = userSession.role === "TA";

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-full overflow-y-auto border-l bg-card shadow-elevated">
      <div className="border-b px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">Upcoming Pre-reads</h2>
      </div>
      <div className="p-4 space-y-5">
        {preReadsData.map((group) => (
          <div key={group.date}>
            <div className="sticky top-0 z-10 mb-2 bg-card pb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.date}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const itemKey = `${group.date}-${item.time}-${item.task}`;
                const pdfs = pdfsByItem[itemKey] || [];
                return (
                  <div key={itemKey}>
                    <div className="group flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-secondary">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                        <p className="text-sm font-semibold text-foreground leading-snug">{item.className}</p>
                        <p className="text-sm text-muted-foreground leading-snug">{item.task}</p>
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

                    {/* Uploaded PDF cards */}
                    {pdfs.length > 0 && (
                      <div className="ml-2 mr-2 mt-1 space-y-1.5">
                        {pdfs.map((pdf, idx) => (
                          <PdfCard
                            key={`${pdf.fileName}-${idx}`}
                            pdf={pdf}
                            onRemove={isTA ? () => removePdf(itemKey, idx) : undefined}
                            onSummarize={(caseType) => summarizePdf(itemKey, idx, caseType)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
  pdf: { fileName: string; summary: string; loading: boolean; error: string; text: string };
  onRemove?: () => void;
  onSummarize: (caseType: CaseType) => void;
}

const PdfCard = ({ pdf, onRemove, onSummarize }: PdfCardProps) => {
  const [caseType, setCaseType] = useState<CaseType>("General Strategy");
  const [isPopupWindowOpen, setIsPopupWindowOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-open logic when summary successfully finishes generating
  const prevLoading = useRef(pdf.loading);
  useEffect(() => {
    if (prevLoading.current && !pdf.loading && pdf.summary) {
      setIsPopupWindowOpen(true);
      setIsMinimized(false);
    }
    prevLoading.current = pdf.loading;
  }, [pdf.loading, pdf.summary]);

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

      {pdf.error && (
        <p className="mt-1.5 text-destructive">{pdf.error}</p>
      )}

      {!pdf.summary && !pdf.loading && pdf.text && (
        <div className="mt-2 flex flex-col gap-2">
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as CaseType)}
            className="w-full rounded bg-background border border-input px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40 text-muted-foreground"
          >
            <option value="General Strategy">General Strategy</option>
            <option value="Marketing">Marketing (4Ps)</option>
            <option value="Tech/Startup">Tech/Startup (PMF)</option>
            <option value="Crisis">Crisis Analysis</option>
          </select>
          <button
            onClick={() => onSummarize(caseType)}
            className="flex items-center justify-center gap-1 rounded bg-primary/10 px-2 py-1.5 font-medium text-primary hover:bg-primary/20 transition-colors w-full"
          >
            <Sparkles className="h-3 w-3" /> Summarize
          </button>
        </div>
      )}

      {pdf.loading && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Summarizing…
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
                  <ReactMarkdown>{pdf.summary}</ReactMarkdown>
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
