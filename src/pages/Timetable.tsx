import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Plus, Trash2, Loader2 } from "lucide-react";
import * as xlsx from "xlsx";
import PreReadUploadModal from "@/components/PreReadUploadModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  id: string;
  name: string;
  term: number;
  program: string;
}

interface TimetableSession {
  id: string;
  course_id: string;
  session_number: number;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

interface PreRead {
  id: string;
  title: string;
  file_name: string;
  summary_status: string;
}

const Timetable = () => {
  const { role } = useAuth();
  const isTA = role === "ta";

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [preReads, setPreReads] = useState<Record<string, PreRead[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // New course form
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseTerm, setNewCourseTerm] = useState("1");
  const [newCourseProgram, setNewCourseProgram] = useState("");

  // Pre-read upload modal
  const [preReadModalOpen, setPreReadModalOpen] = useState(false);
  const [preReadSessionId, setPreReadSessionId] = useState<string>("");
  const [preReadSessionNumber, setPreReadSessionNumber] = useState<number>(0);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchSessions(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load courses");
      return;
    }
    setCourses(data || []);
    if (data && data.length > 0 && !selectedCourseId) {
      setSelectedCourseId(data[0].id);
    }
    setLoading(false);
  };

  const fetchSessions = async (courseId: string) => {
    const { data, error } = await supabase
      .from("timetable_sessions")
      .select("*")
      .eq("course_id", courseId)
      .order("session_number", { ascending: true });
    if (error) {
      toast.error("Failed to load sessions");
      return;
    }
    setSessions(data || []);
    // Fetch pre-reads for these sessions
    if (data && data.length > 0) {
      const sessionIds = data.map((s) => s.id);
      const { data: prData } = await supabase
        .from("pre_reads")
        .select("id, title, file_name, summary_status, session_id")
        .in("session_id", sessionIds);
      const grouped: Record<string, PreRead[]> = {};
      (prData || []).forEach((pr: any) => {
        if (!grouped[pr.session_id]) grouped[pr.session_id] = [];
        grouped[pr.session_id].push(pr);
      });
      setPreReads(grouped);
    } else {
      setPreReads({});
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) {
      toast.error("Course name is required");
      return;
    }
    const { error } = await supabase.from("courses").insert({
      name: newCourseName.trim(),
      term: parseInt(newCourseTerm),
      program: newCourseProgram.trim(),
    });
    if (error) {
      toast.error("Failed to create course: " + error.message);
      return;
    }
    toast.success("Course created with 18 sessions!");
    setNewCourseName("");
    setNewCourseProgram("");
    setShowNewCourse(false);
    fetchCourses();
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId) return;
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Only .xlsx files are accepted");
      return;
    }

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json<any>(sheet);

      // Expected columns: Session, Date, Start Time, End Time, Location
      for (const row of rows) {
        const sessionNum = parseInt(row["Session"] || row["session_number"]);
        if (!sessionNum || sessionNum < 1 || sessionNum > 18) continue;

        const matchingSession = sessions.find(
          (s) => s.session_number === sessionNum
        );
        if (!matchingSession) continue;

        const updateData: any = {};

        // Parse date
        const dateRaw = row["Date"] || row["session_date"];
        if (dateRaw) {
          if (typeof dateRaw === "number") {
            // Excel serial date
            const d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
            updateData.session_date = d.toISOString().split("T")[0];
          } else {
            updateData.session_date = dateRaw;
          }
        }

        // Parse times
        const parseTime = (val: any): string | null => {
          if (!val) return null;
          if (typeof val === "number") {
            const totalMinutes = Math.round(val * 24 * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          }
          return String(val);
        };

        const startTime = parseTime(row["Start Time"] || row["start_time"]);
        const endTime = parseTime(row["End Time"] || row["end_time"]);
        if (startTime) updateData.start_time = startTime;
        if (endTime) updateData.end_time = endTime;

        const location = row["Location"] || row["location"];
        if (location) updateData.location = location;

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("timetable_sessions")
            .update(updateData)
            .eq("id", matchingSession.id);
        }
      }

      toast.success("Timetable updated from Excel!");
      fetchSessions(selectedCourseId);
    } catch (err: any) {
      toast.error("Failed to parse Excel: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePreRead = async (preReadId: string, filePath: string) => {
    // Delete file from storage
    await supabase.storage.from("pre-reads").remove([filePath]);
    // Delete DB record
    await supabase.from("pre_reads").delete().eq("id", preReadId);
    toast.success("Pre-read deleted");
    fetchSessions(selectedCourseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
          {isTA && (
            <button
              onClick={() => setShowNewCourse(!showNewCourse)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> New Course
            </button>
          )}
        </div>

        {/* New Course Form */}
        {showNewCourse && isTA && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Create Course</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course Name"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={newCourseTerm}
                onChange={(e) => setNewCourseTerm(e.target.value)}
                placeholder="Term (1-6)"
                type="number"
                min="1"
                max="6"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={newCourseProgram}
                onChange={(e) => setNewCourseProgram(e.target.value)}
                placeholder="Program"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleCreateCourse}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create (auto-generates 18 sessions)
            </button>
          </div>
        )}

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">Course:</label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (Term {c.term})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isTA && (
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        )}

        {courses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {isTA
              ? "No courses yet. Create one to get started."
              : "No courses available yet."}
          </div>
        )}

        {/* Sessions Table */}
        {sessions.length > 0 && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Pre-reads</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const sessionPreReads = preReads[s.id] || [];
                  return (
                    <tr key={s.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.session_number}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.session_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.start_time && s.end_time
                          ? `${s.start_time} – ${s.end_time}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.location || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {sessionPreReads.map((pr) => (
                            <div
                              key={pr.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-foreground font-medium truncate max-w-[150px]">
                                {pr.title}
                              </span>
                              <span className="text-muted-foreground">
                                ({pr.file_name})
                              </span>
                              {pr.summary_status === "ready" && (
                                <span className="text-xs text-teal font-medium">✓ Summary</span>
                              )}
                            </div>
                          ))}
                          {isTA && (
                            <button
                              onClick={() => {
                                setPreReadSessionId(s.id);
                                setPreReadSessionNumber(s.session_number);
                                setPreReadModalOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Upload className="h-3 w-3" /> Upload Pre-read
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {preReadModalOpen && selectedCourseId && (
        <PreReadUploadModal
          open={preReadModalOpen}
          onOpenChange={setPreReadModalOpen}
          courseId={selectedCourseId}
          sessionId={preReadSessionId}
          sessionNumber={preReadSessionNumber}
          onSuccess={() => fetchSessions(selectedCourseId)}
        />
      )}
    </div>
  );
};

export default Timetable;
