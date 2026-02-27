import { useState, useMemo, useEffect } from "react";
import { format, isBefore, addDays, startOfDay } from "date-fns";
import { ChevronDown, FileUp, Check, Plus, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const RAW_ACTIVITIES = [
  { id: 1, title: "Managerial Accounting", description: "Quiz is due · 2026-02-09 to 2026-02-15", time: "23:59", dueDate: new Date("2026-02-15T23:59:59") },
  { id: 2, title: "Managerial Accounting", description: "Mid Term is due · 2026-02-09 to 2026-02-15", time: "23:59", dueDate: new Date("2026-02-15T23:59:59") },
  { id: 3, title: "Marketing Research", description: "Quiz is due · 2026-02-09 to 2026-02-15", time: "23:59", dueDate: new Date("2026-02-15T23:59:59") },
  { id: 4, title: "Human Resource Management", description: "End Term is due · 2026-02-16 to 2026-02-22", time: "23:59", dueDate: new Date("2026-02-22T23:59:59") },
  { id: 5, title: "ANA522-PDM-46-G01", description: "Assignment is due · Business Intelligence & Analytics", time: "23:59", dueDate: new Date("2026-03-01T23:59:59") },
  { id: 6, title: "INF530-PDM-46-G01", description: "Assignment is due · Maker Lab", time: "23:59", dueDate: new Date("2026-03-02T23:59:59") },
  { id: 7, title: "NCL503-PDM-46-I27", description: "Assignment is due · PGDM 2025-27 - Abhyudaya Mentorship - NCL503-PDM", time: "23:59", dueDate: new Date("2026-03-04T23:59:59") },
  { id: 8, title: "NCL503-PDM-46-I28", description: "Assignment is due · PGDM 2025-27 - Abhyudaya Mentorship - NCL503-PDM", time: "23:59", dueDate: new Date("2026-03-04T23:59:59") },
  { id: 9, title: "Business Problem Solving", description: "Quiz is due · 2026-03-02 to 2026-03-08", time: "23:59", dueDate: new Date("2026-03-08T23:59:59") },
  { id: 10, title: "Managerial Accounting", description: "Quiz is due · 2026-03-02 to 2026-03-08", time: "23:59", dueDate: new Date("2026-03-08T23:59:59") },
  { id: 11, title: "INF522-PDM-46-G03", description: "Assignment is due · Digital Product Management", time: "23:59", dueDate: new Date("2026-03-15T23:59:59") },
  { id: 12, title: "Consumer Behavior", description: "End Term is due · 2026-03-09 to 2026-03-15", time: "23:59", dueDate: new Date("2026-03-15T23:59:59") },
  { id: 13, title: "Marketing Research", description: "End Term is due · 2026-03-16 to 2026-03-22", time: "23:59", dueDate: new Date("2026-03-22T23:59:59") },
];

const EXAM_CODES = [
  { code: "ACC506-PDM-46-I01", type: "Quiz 1", subject: "Management Accounting" },
  { code: "ACC506-PDM-46-I02", type: "Quiz 2", subject: "Management Accounting" },
  { code: "ACC506-PDM-46-I03", type: "Quiz 3", subject: "Management Accounting" },
  { code: "ACC506-PDM-46-I04", type: "Quiz 4", subject: "Management Accounting" },
  { code: "ACC506-PDM-46-I05", type: "Mid Term", subject: "Management Accounting" },
  { code: "ACC506-PDM-46-I06", type: "End Term", subject: "Management Accounting" },

  { code: "INF522-PDM-46-G01", type: "Assignment", subject: "Digital Product Management" },
  { code: "INF522-PDM-46-G02", type: "Assignment", subject: "Digital Product Management" },
  { code: "INF522-PDM-46-G03", type: "Assignment", subject: "Digital Product Management" },
  { code: "INF522-PDM-46-G04", type: "Assignment", subject: "Digital Product Management" },
  { code: "INF522-PDM-46-I01", type: "Assignment", subject: "Digital Product Management" },
  { code: "INF522-PDM-46-I02", type: "Quiz", subject: "Digital Product Management" },

  { code: "ECO503-PBM-04-I01", type: "Individual Quiz", subject: "Managerial Economics" },
  { code: "ECO503-PBM-04-I02", type: "Individual Quiz", subject: "Managerial Economics" },
  { code: "ECO503-PBM-04-I03", type: "Individual Quiz", subject: "Managerial Economics" },
  { code: "ECO503-PBM-04-I04", type: "Individual Quiz", subject: "Managerial Economics" },
  { code: "ECO503-PBM-04-I05", type: "Mid-term Exam", subject: "Managerial Economics" },
  { code: "ECO503-PBM-04-I06", type: "End-term Exam", subject: "Managerial Economics" },

  { code: "QTM522-PDM-46-I01", type: "Quiz 1", subject: "Quantitative Methods II" },
  { code: "QTM522-PDM-46-I02", type: "Mid-term", subject: "Quantitative Methods II" },
  { code: "QTM522-PDM-46-G01", type: "Assignment (in class)", subject: "Quantitative Methods II" },
  { code: "QTM522-PDM-46-I03", type: "End-term", subject: "Quantitative Methods II" },
];

type FilterRange = "all" | "overdue" | "next-7" | "next-30" | "next-3m" | "next-6m";
type SortMode = "dates" | "courses";

const FILTER_LABELS: Record<FilterRange, string> = {
  "all": "All",
  "overdue": "Overdue",
  "next-7": "Next 7 days",
  "next-30": "Next 30 days",
  "next-3m": "Next 3 months",
  "next-6m": "Next 6 months",
};

const SORT_LABELS: Record<SortMode, string> = {
  "dates": "Sort by dates",
  "courses": "Sort by courses",
};

const TimelineSection = () => {
  const [filter, setFilter] = useState<FilterRange>("next-30");
  const [sortMode, setSortMode] = useState<SortMode>("dates");
  const [editMode, setEditMode] = useState(() => localStorage.getItem("wisenet_edit_mode") === "true");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem("wisenet_timeline_activities");
      if (saved) {
        return JSON.parse(saved).map((a: any) => ({ ...a, dueDate: new Date(a.dueDate) }));
      }
    } catch { }
    return RAW_ACTIVITIES;
  });

  const [newActivity, setNewActivity] = useState({
    code: "",
    type: "",
    subject: "",
    dueDate: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    const handleEditMode = () => setEditMode(localStorage.getItem("wisenet_edit_mode") === "true");
    window.addEventListener("wisenet_edit_mode_changed", handleEditMode);
    return () => window.removeEventListener("wisenet_edit_mode_changed", handleEditMode);
  }, []);

  useEffect(() => {
    localStorage.setItem("wisenet_timeline_activities", JSON.stringify(activities));
  }, [activities]);

  const userSession = JSON.parse(localStorage.getItem("wisenet_session") || "{}");
  const isTA = userSession.role === "TA";

  const handleCodeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = EXAM_CODES.find(c => c.code === e.target.value);
    if (selected) {
      setNewActivity({
        ...newActivity,
        code: selected.code,
        type: selected.type,
        subject: selected.subject
      });
    } else {
      setNewActivity({ ...newActivity, code: "", type: "", subject: "" });
    }
  };

  const handleSave = () => {
    if (!newActivity.code || !newActivity.dueDate) return;

    if (editingId) {
      setActivities(prev => prev.map(a =>
        a.id === editingId
          ? {
            ...a,
            title: newActivity.code,
            description: `${newActivity.type} is due · ${newActivity.subject}`,
            dueDate: new Date(`${newActivity.dueDate}T23:59:59`)
          }
          : a
      ));
    } else {
      const newEntry = {
        id: Date.now(),
        title: newActivity.code,
        description: `${newActivity.type} is due · ${newActivity.subject}`,
        time: "23:59",
        dueDate: new Date(`${newActivity.dueDate}T23:59:59`)
      };
      setActivities(prev => [...prev, newEntry]);
    }

    setIsFormOpen(false);
    setEditingId(null);
    setNewActivity({ code: "", type: "", subject: "", dueDate: format(new Date(), "yyyy-MM-dd") });
  };

  const handleEditSetup = (activity: any) => {
    const matchedCode = EXAM_CODES.find(c => c.code === activity.title);
    setNewActivity({
      code: activity.title,
      type: matchedCode?.type || activity.description.split(" is due")[0] || "",
      subject: matchedCode?.subject || activity.description.split(" · ")[1] || "",
      dueDate: format(activity.dueDate, "yyyy-MM-dd")
    });
    setEditingId(activity.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number | string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const displayData = useMemo(() => {
    const today = startOfDay(new Date());

    // 1. Filter out activities
    let filtered = activities.filter(activity => {
      const due = activity.dueDate;
      const isPast = isBefore(due, today);

      if (filter === "overdue") return isPast;
      if (isPast) return false; // Filter out system date older if not "overdue" Mode

      switch (filter) {
        case "next-7":
          return isBefore(due, addDays(today, 7));
        case "next-30":
          return isBefore(due, addDays(today, 30));
        case "next-3m":
          return isBefore(due, addDays(today, 90));
        case "next-6m":
          return isBefore(due, addDays(today, 180));
        case "all":
        default:
          return true;
      }
    });

    // 2. Sort and Group
    if (sortMode === "courses") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));

      const groups: Record<string, typeof filtered> = {};
      filtered.forEach(item => {
        if (!groups[item.title]) groups[item.title] = [];
        groups[item.title].push(item);
      });

      return Object.entries(groups).map(([title, activities]) => ({
        groupTitle: title,
        activities
      }));
    } else {
      // Default dates sort
      filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      const groups: Record<string, typeof filtered> = {};
      filtered.forEach(item => {
        const dateKey = format(item.dueDate, "EEEE, d MMMM yyyy");
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
      });

      return Object.entries(groups).map(([date, activities]) => ({
        groupTitle: date,
        activities
      }));
    }
  }, [filter, sortMode, activities]);

  return (
    <div className="rounded-lg border bg-card shadow-sm mb-6">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-foreground tracking-tight">Timeline</h2>
        {isTA && editMode && !isFormOpen && (
          <button
            onClick={() => {
              setEditingId(null);
              setNewActivity({ code: "", type: "", subject: "", dueDate: format(new Date(), "yyyy-MM-dd") });
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        )}
      </div>

      <div className="px-6 pb-6 pt-2 flex flex-col gap-6">
        {/* Filters Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                  {FILTER_LABELS[filter]} <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={() => setFilter("all")} className="flex items-center justify-between cursor-pointer">
                  All {filter === "all" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("overdue")} className="flex items-center justify-between cursor-pointer">
                  Overdue {filter === "overdue" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground pt-2 pb-1">Due date</DropdownMenuLabel>

                <DropdownMenuItem onClick={() => setFilter("next-7")} className="flex items-center justify-between cursor-pointer">
                  Next 7 days {filter === "next-7" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("next-30")} className="flex items-center justify-between cursor-pointer">
                  Next 30 days {filter === "next-30" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("next-3m")} className="flex items-center justify-between cursor-pointer">
                  Next 3 months {filter === "next-3m" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("next-6m")} className="flex items-center justify-between cursor-pointer">
                  Next 6 months {filter === "next-6m" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                  {SORT_LABELS[sortMode]} <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={() => setSortMode("dates")} className="flex items-center justify-between cursor-pointer">
                  Sort by dates {sortMode === "dates" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("courses")} className="flex items-center justify-between cursor-pointer">
                  Sort by courses {sortMode === "courses" && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
          <div className="relative w-full sm:w-[320px]">
            <input
              type="text"
              placeholder="Search by activity type or name"
              className="w-full rounded-md border border-input bg-background py-1.5 px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
        </div>

        {/* Create Activity Form */}
        {isFormOpen && (
          <div className="bg-muted p-4 rounded-lg flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pointer-events-none mb-1">
              <h3 className="font-semibold text-sm text-foreground">{editingId ? "Edit Activity" : "Create New Activity"}</h3>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Exam Code</label>
              <select
                onChange={handleCodeSelect}
                value={newActivity.code}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none"
              >
                <option value="">Select an Exam Code...</option>
                {EXAM_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>

            {newActivity.code && (
              <div className="grid grid-cols-2 gap-4 bg-background/50 p-3 rounded-md border border-border/50 text-sm">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium mb-0.5 uppercase tracking-wider">Type</span>
                  <span className="font-semibold">{newActivity.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium mb-0.5 uppercase tracking-wider">Subject</span>
                  <span className="font-semibold">{newActivity.subject}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Due Date</label>
              <input
                type="date"
                value={newActivity.dueDate}
                onChange={e => setNewActivity({ ...newActivity, dueDate: e.target.value })}
                className="w-full sm:max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40 mt-1">
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
                className="px-4 py-1.5 rounded-md border border-input text-xs font-semibold hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newActivity.code}
                className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? "Save Changes" : "Add Activity"}
              </button>
            </div>
          </div>
        )}

        {/* Timeline Items */}
        <div className="space-y-6">
          {displayData.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No current activities matching the filters criteria.
            </div>
          ) : (
            displayData.map((group, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="font-semibold text-foreground text-[14px]">
                  {group.groupTitle}
                </h3>
                <div className="space-y-0">
                  {group.activities.map((activity, index) => (
                    <div key={activity.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3">
                        <div className="flex items-center gap-4 min-w-[120px]">
                          {/* When sorted by Course, we probably still want to see the date it's actually due on */}
                          <span className={cn(
                            "text-xs font-medium text-foreground/80",
                            sortMode === "courses" && "text-[11px] truncate"
                          )}>
                            {sortMode === "courses" ? format(activity.dueDate, "d MMM") : activity.time}
                          </span>

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#E46B9A] text-white">
                            <FileUp className="h-5 w-5 opacity-90" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <a href="#" className="font-medium text-[#7C3AED] hover:text-[#6D28D9] hover:underline block truncate text-[14px]">
                            {activity.title}
                          </a>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {activity.description}
                          </p>
                        </div>

                        {isTA && editMode ? (
                          <div className="mt-2 sm:mt-0 flex items-center justify-end gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditSetup(activity)}
                              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors transition-transform active:scale-95"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors transition-transform active:scale-95"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : activity.description.includes("Assignment") ? (
                          <div className="mt-2 sm:mt-0 sm:text-right">
                            <button className="text-xs font-semibold text-[#3B82F6] hover:text-[#2563EB] hover:underline whitespace-nowrap">
                              Add submission
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {/* Inter-item subtle border */}
                      {index < group.activities.length - 1 && (
                        <div className="h-px bg-border/40 w-full" />
                      )}
                    </div>
                  ))}
                </div>
                {/* Border under entire date group unless last */}
                {idx < displayData.length - 1 && (
                  <div className="h-px bg-border/60 w-full mt-2" />
                )}
              </div>
            ))
          )}
        </div>

        {displayData.length > 0 && (
          <div className="pt-2">
            <button className="rounded text-xs bg-secondary px-3 py-1.5 font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border/50">
              Show more activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineSection;
