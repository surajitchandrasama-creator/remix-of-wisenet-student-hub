import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import localforage from "localforage";
import { HfInference } from "@huggingface/inference";
import {
  CaseType,
  buildFormatRepairUserPrompt,
  buildSystemPrompt,
  FORMAT_REPAIR_SYSTEM_PROMPT,
  isValidSummary,
} from "@/lib/preReadPrompt";

interface UploadedPdf {
  id?: string;
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
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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

  const [pdfsByItem, setPdfsByItem] = useState<Record<string, UploadedPdf[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from Supabase
  useEffect(() => {
    const fetchPdfs = async () => {
      const { data, error } = await (supabase.from("pre_read_pdfs") as any).select("*");
      if (error) {
        console.error("Failed to load pdfs", error);
      } else if (data) {
        const normalized: Record<string, UploadedPdf[]> = {};
        for (const row of data) {
          const itemKey = row.session_id;
          if (!normalized[itemKey]) normalized[itemKey] = [];
          normalized[itemKey].push({
            id: row.id,
            fileName: row.file_name,
            text: row.text_content || "",
            summary: row.summary || "",
            caseType: (row.case_type as CaseType) || "",
            refinement: row.refinement || "",
            extractedTextLength: row.extracted_text_length || 0,
            truncated: row.truncated || false,
            loading: row.loading || false,
            error: row.error || "",
            lastUpdated: row.last_updated || new Date().toISOString(),
          });
        }
        setPdfsByItem(normalized);
      }
      setIsLoaded(true);
    };

    fetchPdfs();

    // Clean up bloated local storage if it exists to free quota for user auth
    try {
      localStorage.removeItem("wisenet_pdfs");
    } catch (e) { }
  }, []);

  // Optional: Auto fetch periodically or on window focus if multiple users edit
  // Save changes to localforage removed as we manage db state per action now.

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
        } catch (err: any) {
          console.error("PDF extraction error:", err);
          error = err.message || "Failed to read this PDF.";
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

      const newRecords = [];
      for (const pdf of newPdfs) {
        const record = {
          session_id: activeUploadKey,
          file_name: pdf.fileName,
          text_content: pdf.text,
          summary: pdf.summary,
          case_type: pdf.caseType,
          refinement: pdf.refinement,
          extracted_text_length: pdf.extractedTextLength,
          truncated: pdf.truncated,
          loading: pdf.loading,
          error: pdf.error,
          last_updated: pdf.lastUpdated,
        };
        newRecords.push(record);
      }

      const { data, error } = await (supabase.from("pre_read_pdfs") as any).insert(newRecords).select();

      if (!error && data) {
        const dbPdfs: UploadedPdf[] = (data as any[]).map(row => ({
          id: row.id,
          fileName: row.file_name,
          text: row.text_content || "",
          summary: row.summary || "",
          caseType: (row.case_type as CaseType) || "",
          refinement: row.refinement || "",
          extractedTextLength: row.extracted_text_length || 0,
          truncated: row.truncated || false,
          loading: row.loading || false,
          error: row.error || "",
          lastUpdated: row.last_updated || new Date().toISOString(),
        }));

        setPdfsByItem((prev) => ({
          ...prev,
          [activeUploadKey]: [...(prev[activeUploadKey] || []), ...dbPdfs],
        }));
      } else {
        console.error("Supabase insert error:", error);
        // fallback if insert fails
        setPdfsByItem((prev) => ({
          ...prev,
          [activeUploadKey]: [...(prev[activeUploadKey] || []), ...(newPdfs.map(p => ({ ...p, error: error?.message || p.error, caseType: p.caseType as CaseType | "" })))],
        }));
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveUploadKey(null);
    },
    [activeUploadKey]
  );

  const removePdf = useCallback(async (itemKey: string, index: number) => {
    const pdfToRemove = pdfsByItem[itemKey]?.[index];

    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list.splice(index, 1);
      return { ...prev, [itemKey]: list };
    });

    if (pdfToRemove && pdfToRemove.id) {
      await (supabase.from("pre_read_pdfs") as any).delete().eq("id", pdfToRemove.id);
    }
  }, [pdfsByItem]);

  const updatePdfCaseType = useCallback(async (itemKey: string, index: number, caseType: CaseType | "") => {
    const pdfToUpdate = pdfsByItem[itemKey]?.[index];
    if (!pdfToUpdate) return;
    const lastUpdated = new Date().toISOString();

    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list[index] = { ...list[index], caseType, lastUpdated };
      return { ...prev, [itemKey]: list };
    });

    if (pdfToUpdate.id) {
      await (supabase.from("pre_read_pdfs") as any).update({ case_type: caseType, last_updated: lastUpdated }).eq("id", pdfToUpdate.id);
    }
  }, [pdfsByItem]);

  const updatePdfRefinement = useCallback(async (itemKey: string, index: number, refinement: string) => {
    const pdfToUpdate = pdfsByItem[itemKey]?.[index];
    if (!pdfToUpdate) return;
    const lastUpdated = new Date().toISOString();

    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list[index] = { ...list[index], refinement, lastUpdated };
      return { ...prev, [itemKey]: list };
    });

    if (pdfToUpdate.id) {
      await (supabase.from("pre_read_pdfs") as any).update({ refinement: refinement, last_updated: lastUpdated }).eq("id", pdfToUpdate.id);
    }
  }, [pdfsByItem]);

  const updatePdfSummary = useCallback(async (itemKey: string, index: number, newSummary: string) => {
    const pdfToUpdate = pdfsByItem[itemKey]?.[index];
    if (!pdfToUpdate) return;
    const lastUpdated = new Date().toISOString();

    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list[index] = { ...list[index], summary: newSummary, lastUpdated };
      return { ...prev, [itemKey]: list };
    });

    if (pdfToUpdate.id) {
      await (supabase.from("pre_read_pdfs") as any).update({ summary: newSummary, last_updated: lastUpdated }).eq("id", pdfToUpdate.id);
    }
  }, [pdfsByItem]);

  const summarizePdf = useCallback(
    async (itemKey: string, index: number) => {
      const pdfToUpdate = pdfsByItem[itemKey]?.[index];
      if (!pdfToUpdate) return;

      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        list[index] = { ...list[index], loading: true, error: "", summary: "" };
        return { ...prev, [itemKey]: list };
      });

      if (pdfToUpdate.id) {
        await (supabase.from("pre_read_pdfs") as any).update({ loading: true, error: "", summary: "" }).eq("id", pdfToUpdate.id);
      }

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

        const lastUpdated = new Date().toISOString();

        setPdfsByItem((prev) => {
          const list = [...(prev[itemKey] || [])];
          list[index] = {
            ...list[index],
            loading: false,
            summary,
            truncated: wasTruncated,
            lastUpdated,
          };
          return { ...prev, [itemKey]: list };
        });

        if (pdf.id) {
          await (supabase.from("pre_read_pdfs") as any).update({
            summary,
            truncated: wasTruncated,
            loading: false,
            last_updated: lastUpdated
          }).eq("id", pdf.id);
        }

      } catch (e: any) {
        console.error("HuggingFace summarization error:", e);
        const errorMsg = e.message || "Summarization failed.";
        const lastUpdated = new Date().toISOString();
        setPdfsByItem((prev) => {
          const list = [...(prev[itemKey] || [])];
          list[index] = {
            ...list[index],
            loading: false,
            error: errorMsg,
            lastUpdated,
          };
          return { ...prev, [itemKey]: list };
        });

        const pdf = pdfsByItem[itemKey]?.[index];
        if (pdf && pdf.id) {
          await (supabase.from("pre_read_pdfs") as any).update({
            error: errorMsg,
            loading: false,
            last_updated: lastUpdated
          }).eq("id", pdf.id);
        }
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
    updatePdfSummary,
  };
}
