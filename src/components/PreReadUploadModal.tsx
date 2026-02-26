import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PreReadUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sessionId: string;
  sessionNumber: number;
  onSuccess: () => void;
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

const PreReadUploadModal = ({
  open,
  onOpenChange,
  courseId,
  sessionId,
  sessionNumber,
  onSuccess,
}: PreReadUploadModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Extract text
      let sourceText = "";
      let sourceTextStatus = "none";
      try {
        sourceText = await extractTextFromPdf(file);
        sourceTextStatus = sourceText.trim() ? "extracted" : "empty";
      } catch {
        sourceTextStatus = "error";
      }

      // 2. Upload to storage
      const timestamp = Date.now();
      const filePath = `${courseId}/${sessionNumber}/${timestamp}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pre-reads")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      // 3. Insert DB record
      const { error: dbError } = await supabase.from("pre_reads").insert({
        course_id: courseId,
        session_id: sessionId,
        title: title.trim(),
        description: description.trim() || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        source_text: sourceText || null,
        source_text_status: sourceTextStatus,
      });

      if (dbError) throw dbError;

      toast.success("Pre-read uploaded successfully!");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setFile(null);
      onSuccess();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Upload Pre-read — Session {sessionNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Reading"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">PDF File *</label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-4 hover:border-primary/40 transition-colors">
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <>
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-primary/60" />
                  <p className="text-sm text-muted-foreground">
                    Click to select PDF (max 15MB)
                  </p>
                </>
              )}
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim() || !file}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Extracting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Upload Pre-read
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreReadUploadModal;
