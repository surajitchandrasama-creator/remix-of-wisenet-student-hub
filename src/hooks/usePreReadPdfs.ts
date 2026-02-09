import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UploadedPdf {
  file: File;
  text: string;
  summary: string;
  loading: boolean;
  error: string;
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
  // Map of itemKey -> array of uploaded PDFs
  const [pdfsByItem, setPdfsByItem] = useState<Record<string, UploadedPdf[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<string | null>(null);

  const triggerUpload = useCallback((itemKey: string) => {
    setActiveUploadKey(itemKey);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      newPdfs.push({ file, text, summary: "", loading: false, error });
    }

    setPdfsByItem((prev) => ({
      ...prev,
      [activeUploadKey]: [...(prev[activeUploadKey] || []), ...newPdfs],
    }));

    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveUploadKey(null);
  }, [activeUploadKey]);

  const removePdf = useCallback((itemKey: string, index: number) => {
    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list.splice(index, 1);
      return { ...prev, [itemKey]: list };
    });
  }, []);

  const summarizePdf = useCallback(async (itemKey: string, index: number) => {
    setPdfsByItem((prev) => {
      const list = [...(prev[itemKey] || [])];
      list[index] = { ...list[index], loading: true, error: "", summary: "" };
      return { ...prev, [itemKey]: list };
    });

    try {
      const pdf = pdfsByItem[itemKey]?.[index];
      if (!pdf?.text) throw new Error("No text to summarize.");

      const { data, error: fnError } = await supabase.functions.invoke("summarize-pdf", {
        body: { text: pdf.text },
      });

      if (fnError) throw fnError;

      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        if (data?.error) {
          list[index] = { ...list[index], loading: false, error: data.error };
        } else {
          list[index] = { ...list[index], loading: false, summary: data.summary };
        }
        return { ...prev, [itemKey]: list };
      });
    } catch (e: any) {
      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        list[index] = { ...list[index], loading: false, error: e.message || "Summarization failed." };
        return { ...prev, [itemKey]: list };
      });
    }
  }, [pdfsByItem]);

  return { pdfsByItem, fileInputRef, triggerUpload, handleFileChange, removePdf, summarizePdf };
}
