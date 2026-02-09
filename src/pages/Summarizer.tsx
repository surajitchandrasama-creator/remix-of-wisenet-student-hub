import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, Sparkles, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

const Summarizer = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSummary("");
    setError("");
    setExtracting(true);

    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setError("Could not extract text from this PDF. It may be image-based.");
        setExtractedText("");
      } else {
        setExtractedText(text);
      }
    } catch {
      setError("Failed to read the PDF file. Please try a different file.");
      setExtractedText("");
    } finally {
      setExtracting(false);
    }
  };

  const handleSummarize = async () => {
    if (!extractedText) return;
    setLoading(true);
    setError("");
    setSummary("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("summarize", {
        body: { text: extractedText },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-6">
        <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-xl font-bold wisenet-gradient-text tracking-tight">WiseNet</span>
        <span className="text-sm font-medium text-muted-foreground">/ PDF Summarizer</span>
      </header>

      <main className="mx-auto max-w-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            PDF Summarizer
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a PDF and get an AI-powered summary using facebook/bart-large-cnn.
          </p>
        </div>

        {/* Upload Area */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center hover:border-primary/40 hover:bg-secondary/60 transition-colors"
        >
          {extracting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Extracting text…</span>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-foreground">{fileName}</span>
              <span className="text-xs text-muted-foreground">Click to change file</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Click to upload a PDF</span>
              <span className="text-xs text-muted-foreground">Supports .pdf files</span>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Extracted text preview */}
        {extractedText && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Extracted Text Preview</h3>
            <p className="text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {extractedText.slice(0, 1000)}
              {extractedText.length > 1000 && "…"}
            </p>
            <p className="text-xs text-muted-foreground">{extractedText.length.toLocaleString()} characters extracted</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Summarize Button */}
        <button
          onClick={handleSummarize}
          disabled={!extractedText || loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Summarizing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Summarize
            </>
          )}
        </button>

        {/* Summary Result */}
        {summary && (
          <div className="rounded-xl border bg-card p-5 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              AI Summary
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{summary}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Summarizer;
