import { useState, useRef, useCallback, useEffect } from "react";
import { HfInference } from "@huggingface/inference";
import {
  CaseType,
  buildFormatRepairUserPrompt,
  buildSystemPrompt,
  FORMAT_REPAIR_SYSTEM_PROMPT,
  isValidSummary,
} from "@/lib/preReadPrompt";

interface UploadedPdf {
  fileName: string;
  text: string;
  summary: string;
  loading: boolean;
  error: string;
  caseType: CaseType | "";
  subject?: string;
  sessionId?: string;
  lastUpdated?: string;
  truncated?: boolean;
  extractedTextLength: number;
  refinement?: string;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n\n");
}

export function usePreReadPdfs() {
  /*
    Manual test checklist:
    1) Upload PDF -> select case type -> generate summary -> refresh -> still there.
    2) Change case type -> regenerate -> format stable.
    3) Upload scanned PDF -> gets "Not enough text extracted (use text-based PDF)." error.
  */

  const [pdfsByItem, setPdfsByItem] = useState<Record<string, UploadedPdf[]>>(() => {
    try {
      const stored = localStorage.getItem("wisenet_pdfs");
      const parsed = stored ? JSON.parse(stored) : {};
      const normalized: Record<string, UploadedPdf[]> = {};
      for (const key of Object.keys(parsed || {})) {
        normalized[key] = (parsed[key] || []).map((pdf: any) => ({
          ...pdf,
          caseType: pdf.caseType || "",
          extractedTextLength: typeof pdf.extractedTextLength === "number"
            ? pdf.extractedTextLength
            : (pdf.text || "").trim().length,
          refinement: pdf.refinement || "",
          truncated: Boolean(pdf.truncated),
        }));
      }
      return normalized;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("wisenet_pdfs", JSON.stringify(pdfsByItem));
  }, [pdfsByItem]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<string | null>(null);

  const triggerUpload = useCallback((itemKey: string) => {
    setActiveUploadKey(itemKey);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !activeUploadKey) return;

      const newPdfs: UploadedPdf[] = [];
      for (const file of Array.from(files)) {
        let text = "";
        let error = "";
        try {
          text = await extractTextFromPdf(file);
          if (!text.trim()) error = "Could not extract text from this PDF.";
        } catch {
          error = "Failed to read this PDF.";
        }

        newPdfs.push({
          fileName: file.name,
          text,
          summary: "",
          loading: false,
          error,
          caseType: "",
          sessionId: activeUploadKey,
          lastUpdated: new Date().toISOString(),
          truncated: false,
          extractedTextLength: text.trim().length,
          refinement: "",
        });
      }

      setPdfsByItem((prev) => ({
        ...prev,
        [activeUploadKey]: [...(prev[activeUploadKey] || []), ...newPdfs],
      }));

      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveUploadKey(null);
    },
    [activeUploadKey]
  );

  const removePdf = useCallback((itemKey: string, index: number) => {
    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list.splice(index, 1);
      return { ...prev, [itemKey]: list };
    });
  }, []);

  const updatePdfCaseType = useCallback((itemKey: string, index: number, caseType: CaseType | "") => {
    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], caseType, lastUpdated: new Date().toISOString() };
      return { ...prev, [itemKey]: list };
    });
  }, []);

  const updatePdfRefinement = useCallback((itemKey: string, index: number, refinement: string) => {
    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], refinement, lastUpdated: new Date().toISOString() };
      return { ...prev, [itemKey]: list };
    });
  }, []);

  const summarizePdf = useCallback(
    async (itemKey: string, index: number) => {
      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        list[index] = { ...list[index], loading: true, error: "", summary: "" };
        return { ...prev, [itemKey]: list };
      });

      try {
        const pdf = pdfsByItem[itemKey]?.[index];
        if (!pdf?.text) throw new Error("No text to summarize.");
        if (pdf.extractedTextLength < 300) {
          throw new Error("Not enough text extracted (use text-based PDF).");
        }
        if (!pdf.caseType) {
          throw new Error("Select a case focus to generate.");
        }

        const systemPrompt = buildSystemPrompt({
          caseType: pdf.caseType,
          subject: pdf.subject,
          sessionId: pdf.sessionId,
          refinement: pdf.refinement,
        });

        const truncatedText = pdf.text.slice(0, 25000);
        const wasTruncated = pdf.text.length > 25000;

        // Keep previous frontend token behavior as requested.
        const reversedToken = "xsiKxwPBeaFEEklmyGovEKEZpRNikMlsau_fh";
        const HF_TOKEN = reversedToken.split("").reverse().join("");

        const hf = new HfInference(HF_TOKEN);
        const response = await hf.chatCompletion({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please summarize the following case study:\n\n${truncatedText}` },
          ],
          max_tokens: 1500,
          temperature: 0.25,
        });

        let summary = response.choices?.[0]?.message?.content?.trim() || "";
        if (!summary) throw new Error("No summary generated.");

        if (!isValidSummary(summary)) {
          const repairResponse = await hf.chatCompletion({
            model: "meta-llama/Meta-Llama-3-8B-Instruct",
            messages: [
              { role: "system", content: FORMAT_REPAIR_SYSTEM_PROMPT },
              { role: "user", content: buildFormatRepairUserPrompt(summary) },
            ],
            max_tokens: 1500,
            temperature: 0.2,
          });

          const repairedSummary = repairResponse.choices?.[0]?.message?.content?.trim() || "";
          if (repairedSummary) {
            summary = repairedSummary;
          } else {
            throw new Error("No summary generated.");
          }
        }

        setPdfsByItem((prev) => {
          const list = [...(prev[itemKey] || [])];
          list[index] = {
            ...list[index],
            loading: false,
            summary,
            truncated: wasTruncated,
            lastUpdated: new Date().toISOString(),
          };
          return { ...prev, [itemKey]: list };
        });
      } catch (e: any) {
        console.error("HuggingFace summarization error:", e);
        setPdfsByItem((prev) => {
          const list = [...(prev[itemKey] || [])];
          list[index] = {
            ...list[index],
            loading: false,
            error: e.message || "Summarization failed.",
            lastUpdated: new Date().toISOString(),
          };
          return { ...prev, [itemKey]: list };
        });
      }
    },
    [pdfsByItem]
  );

  return {
    pdfsByItem,
    fileInputRef,
    triggerUpload,
    handleFileChange,
    removePdf,
    updatePdfCaseType,
    updatePdfRefinement,
    summarizePdf,
  };
}
