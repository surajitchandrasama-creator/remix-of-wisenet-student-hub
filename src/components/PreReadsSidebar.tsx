import { Sparkles, X, Upload, FileText } from "lucide-react";
import { useState, useRef } from "react";

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

const mockSummaries: Record<string, string> = {
  "Read Chapter 4":
    "Chapter 4 covers demand analysis and estimation. Key topics: determinants of demand, elasticity concepts, and demand forecasting methods using regression analysis.",
  "Review case study on clustering":
    "This case study explores K-means and hierarchical clustering applied to customer segmentation in retail. Focus on interpreting dendrograms and choosing optimal K.",
  "Read HBR article on positioning":
    "The article discusses the importance of positioning strategy in competitive markets. Key framework: the positioning statement and perceptual mapping.",
  "Read Chapter 7 - Cash Flows":
    "Chapter 7 explains the statement of cash flows — operating, investing, and financing activities. Focus on indirect method preparation.",
  "Watch pre-lecture video":
    "Pre-lecture covers Maslow's hierarchy and Herzberg's two-factor theory of motivation in organizational settings.",
  "Complete SQL worksheet":
    "Worksheet covers JOINs, GROUP BY, HAVING clauses, and subqueries with practical business intelligence scenarios.",
  "Read Chapter 5 - Elasticity":
    "Chapter 5 dives into price, income, and cross elasticity of demand. Includes real-world applications and calculation practice.",
  "Review supply chain diagrams":
    "Review focuses on end-to-end supply chain flows, bullwhip effect, and inventory management strategies.",
};

const PreReadsSidebar = () => {
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<string | null>(null);

  const handleSparkle = (task: string) => {
    if (activeSummary === task) {
      setActiveSummary(null);
      return;
    }
    setActiveSummary(task);
    setLoading(true);
    setSummaryText("");
    setTimeout(() => {
      setLoading(false);
      setSummaryText(mockSummaries[task] || "Summary not available for this item.");
    }, 1200);
  };

  const handleUploadClick = (key: string) => {
    setActiveUploadKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadKey) {
      setUploadedFiles((prev) => ({ ...prev, [activeUploadKey]: file }));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveUploadKey(null);
  };

  const handleRemoveFile = (key: string) => {
    setUploadedFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-full overflow-y-auto border-l bg-card shadow-elevated">
      <div className="border-b px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">
          Upcoming Pre-reads
        </h2>
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
                const uploadedFile = uploadedFiles[itemKey];
                return (
                <div key={item.time + item.task}>
                  <div className="group flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-secondary">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {item.className}
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.task}
                      </p>
                      {uploadedFile && (
                        <div className="mt-1.5 flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{uploadedFile.name}</span>
                          <button
                            onClick={() => handleRemoveFile(itemKey)}
                            className="ml-auto flex-shrink-0 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 mt-1 flex-shrink-0">
                      <button
                        onClick={() => handleUploadClick(itemKey)}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Upload PDF"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSparkle(item.task)}
                        className={`rounded-full p-1.5 transition-colors ${
                          activeSummary === item.task
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                        title="Generate AI Summary"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {activeSummary === item.task && (
                    <div className="mx-2 mt-1 mb-1 rounded-md border bg-secondary p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI Summary
                        </span>
                        <button
                          onClick={() => setActiveSummary(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Generating Summary...
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed text-foreground">
                          {summaryText}
                        </p>
                      )}
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
        onChange={handleFileChange}
        className="hidden"
      />
    </aside>
  );
};

export default PreReadsSidebar;
