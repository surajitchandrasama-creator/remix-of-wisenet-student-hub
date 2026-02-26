import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ChevronDown, Loader2, FileText, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SessionWithPreReads {
  id: string;
  session_number: number;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  course_name: string;
  course_id: string;
  pre_reads: {
    id: string;
    title: string;
    file_name: string;
    file_path: string;
    summary_status: string;
    summary_text: string | null;
  }[];
}

const PreReadsSidebar = () => {
  const { role } = useAuth();
  const isTA = role === "ta";
  const [sessions, setSessions] = useState<SessionWithPreReads[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingPreReads();
  }, []);

  const fetchUpcomingPreReads = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch today's sessions with course info
    const { data: sessionData, error } = await supabase
      .from("timetable_sessions")
      .select("id, session_number, session_date, start_time, end_time, course_id, courses(name)")
      .eq("session_date", today)
      .order("start_time", { ascending: true });

    if (error || !sessionData || sessionData.length === 0) {
      // If no sessions today, fetch next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { data: upcomingData } = await supabase
        .from("timetable_sessions")
        .select("id, session_number, session_date, start_time, end_time, course_id, courses(name)")
        .gte("session_date", today)
        .lte("session_date", nextWeek.toISOString().split("T")[0])
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(10);

      if (upcomingData && upcomingData.length > 0) {
        await loadPreReads(upcomingData);
      } else {
        setSessions([]);
      }
      setLoading(false);
      return;
    }

    await loadPreReads(sessionData);
    setLoading(false);
  };

  const loadPreReads = async (sessionData: any[]) => {
    const sessionIds = sessionData.map((s) => s.id);
    const { data: preReadData } = await supabase
      .from("pre_reads")
      .select("id, title, file_name, file_path, summary_status, summary_text, session_id")
      .in("session_id", sessionIds);

    const preReadsBySession: Record<string, any[]> = {};
    (preReadData || []).forEach((pr: any) => {
      if (!preReadsBySession[pr.session_id]) preReadsBySession[pr.session_id] = [];
      preReadsBySession[pr.session_id].push(pr);
    });

    const mapped: SessionWithPreReads[] = sessionData
      .filter((s) => {
        const prs = preReadsBySession[s.id] || [];
        // Students only see sessions that have pre-reads
        return isTA || prs.length > 0;
      })
      .map((s) => ({
        id: s.id,
        session_number: s.session_number,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        course_name: (s.courses as any)?.name || "Unknown",
        course_id: s.course_id,
        pre_reads: preReadsBySession[s.id] || [],
      }));

    setSessions(mapped);
  };

  const handleOpenPdf = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("pre-reads")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Could not open file");
    }
  };

  if (loading) {
    return (
      <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-full border-l bg-card shadow-elevated flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </aside>
    );
  }

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-full overflow-y-auto border-l bg-card shadow-elevated">
      <div className="border-b px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">Upcoming Pre-reads</h2>
      </div>
      <div className="p-4 space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming pre-reads found.
          </p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="space-y-2">
              <div className="bg-secondary/50 rounded-md px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{session.course_name}</p>
                <p className="text-xs text-muted-foreground">
                  Session {session.session_number} · {session.session_date}
                  {session.start_time && ` · ${session.start_time}`}
                </p>
              </div>

              {session.pre_reads.length > 0 ? (
                session.pre_reads.map((pr) => (
                  <PreReadCard
                    key={pr.id}
                    preRead={pr}
                    isTA={isTA}
                    onOpenPdf={() => handleOpenPdf(pr.file_path)}
                    onRefresh={fetchUpcomingPreReads}
                  />
                ))
              ) : isTA ? (
                <p className="text-xs text-muted-foreground italic px-2">
                  No pre-reads uploaded for this session.
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

interface PreReadCardProps {
  preRead: {
    id: string;
    title: string;
    file_name: string;
    file_path: string;
    summary_status: string;
    summary_text: string | null;
  };
  isTA: boolean;
  onOpenPdf: () => void;
  onRefresh: () => void;
}

const PreReadCard = ({ preRead, isTA, onOpenPdf, onRefresh }: PreReadCardProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-pre-read", {
        body: { pre_read_id: preRead.id, prompt: prompt.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Summary generated!");
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{preRead.title}</p>
          <p className="text-xs text-muted-foreground truncate">{preRead.file_name}</p>
        </div>
        <button
          onClick={onOpenPdf}
          className="flex-shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Open
        </button>
      </div>

      {/* TA: Generate Summary */}
      {isTA && preRead.summary_status !== "ready" && !generating && (
        <div className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Custom prompt (optional)"
            className="text-xs min-h-[60px]"
          />
          <button
            onClick={handleGenerateSummary}
            className="flex items-center gap-1.5 rounded bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="h-3 w-3" /> Generate Summary
          </button>
        </div>
      )}

      {generating && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Summarizing…
        </div>
      )}

      {preRead.summary_status === "generating" && !generating && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Summary in progress…
        </div>
      )}

      {preRead.summary_status === "error" && (
        <p className="text-xs text-destructive">
          Summary failed.{" "}
          {isTA && (
            <button onClick={handleGenerateSummary} className="underline">
              Retry
            </button>
          )}
        </p>
      )}

      {/* Summary display */}
      {preRead.summary_status === "ready" && preRead.summary_text && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <ChevronDown className="h-3 w-3" /> AI Summary
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 prose prose-sm max-w-none text-xs text-foreground leading-relaxed">
              <ReactMarkdown>{preRead.summary_text}</ReactMarkdown>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default PreReadsSidebar;
