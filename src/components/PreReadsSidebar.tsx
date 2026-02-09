import { Sparkles, X, Upload, FileText, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePreReadPdfs } from "@/hooks/usePreReadPdfs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
                      <button
                        onClick={() => triggerUpload(itemKey)}
                        className="mt-1 flex-shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Upload PDFs"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Uploaded PDF cards */}
                    {pdfs.length > 0 && (
                      <div className="ml-2 mr-2 mt-1 space-y-1.5">
                        {pdfs.map((pdf, idx) => (
                          <PdfCard
                            key={`${pdf.file.name}-${idx}`}
                            pdf={pdf}
                            onRemove={() => removePdf(itemKey, idx)}
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
  pdf: { file: File; summary: string; loading: boolean; error: string; text: string };
  onRemove: () => void;
  onSummarize: () => void;
}

const PdfCard = ({ pdf, onRemove, onSummarize }: PdfCardProps) => {
  return (
    <div className="rounded-md border bg-secondary/50 p-2.5 text-xs">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="truncate flex-1 font-medium text-foreground">{pdf.file.name}</span>
        <button onClick={onRemove} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {pdf.error && (
        <p className="mt-1.5 text-destructive">{pdf.error}</p>
      )}

      {!pdf.summary && !pdf.loading && pdf.text && (
        <button
          onClick={onSummarize}
          className="mt-2 flex items-center gap-1 rounded bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="h-3 w-3" /> Summarize
        </button>
      )}

      {pdf.loading && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Summarizing…
        </div>
      )}

      {pdf.summary && (
        <Collapsible defaultOpen className="mt-2">
          <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-primary hover:underline">
            <ChevronDown className="h-3 w-3" /> Summary
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-1 leading-relaxed text-foreground">{pdf.summary}</p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default PreReadsSidebar;
