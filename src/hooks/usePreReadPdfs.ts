import { useState, useRef, useCallback } from "react";
import { HfInference } from "@huggingface/inference";
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

      const hf = new HfInference(import.meta.env.VITE_HUGGING_FACE_TOKEN);

      const SYSTEM_PROMPT = `Act as a strategy professor at a top-tier business school. I need a comprehensive yet concise summary of the case study. Please analyze this case for MBA students who need to grasp the core dynamics quickly before class. Avoid generic summaries; focus on the strategic tensions. Structure your response using the following sections:

1. Executive Abstract (The 'Elevator Pitch')
Provide a 3-sentence summary of the core problem, the immediate decision to be made, and the stakes involved.

2. The Protagonist & The Friction
Who is the decision-maker? What are their specific pressures (internal politics, quarterly targets, career risk)?
Map the key conflict: Who or what stands in their way?

3. Theoretical Lenses (Select 2 most relevant frameworks)
Choose frameworks that fit this specific case (e.g., Porter’s 5 Forces, VRIO, CAGE Distance, Innovator's Dilemma).
Apply them briefly to reveal an insight, not just to list data.

4. The Quantitative Reality
Highlight the 3-4 critical numbers (margins, debt, churn, growth rate) that limit the decision-maker's options.

5. Perspectives & Counter-Narratives
The Optimist’s View: Why might the proposed strategy work?
The Skeptic’s View: What is the fatal flaw or 'trap' that students might overlook?

6. Synthesis & Takeaways
What is the 'meta-lesson' of this case? (e.g., alignment of incentives, the cost of inaction, etc.)`;

      // Slice the text so we don't overflow context windows, leaving room for the prompt
      const truncatedText = pdf.text.slice(0, 15000);

      const response = await hf.chatCompletion({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Please summarize the following case study:\n\n${truncatedText}` }
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });

      const summary = response.choices[0]?.message?.content || "No summary generated.";

      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        list[index] = { ...list[index], loading: false, summary: summary };
        return { ...prev, [itemKey]: list };
      });
    } catch (e: any) {
      console.error("HuggingFace summarization error:", e);
      setPdfsByItem((prev) => {
        const list = [...(prev[itemKey] || [])];
        list[index] = { ...list[index], loading: false, error: e.message || "Summarization failed." };
        return { ...prev, [itemKey]: list };
      });
    }
  }, [pdfsByItem]);

  return { pdfsByItem, fileInputRef, triggerUpload, handleFileChange, removePdf, summarizePdf };
}
