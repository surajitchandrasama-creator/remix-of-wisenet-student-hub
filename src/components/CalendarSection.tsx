import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";

interface CalendarSession {
  id: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  sessionType: string;
  faculty: string;
  status: string;
  startHourFrac: number;
  durationHours: number;
  weekStart?: string;
}

const CalendarSection = () => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const stored = localStorage.getItem("calendar-start-date");
    if (stored) return new Date(stored);
    const now = new Date();
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    return addDays(now, -day);
  });

  const loadSessions = useCallback(() => {
    const stored = localStorage.getItem("calendar-schedule");
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch {
        setSessions([]);
      }
    } else {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const weekStartKey = format(currentWeekStart, "yyyy-MM-dd");
  const weekEnd = addDays(currentWeekStart, 6);
  const weekTitle = `${format(currentWeekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;

  const weekSessions = sessions.filter((s) => s.weekStart === weekStartKey);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      id: i,
      label: format(date, "EEE, d MMM"),
      sessions: weekSessions
        .filter((s) => s.day === i)
        .sort((a, b) => a.startHourFrac - b.startHourFrac),
    };
  }).filter((d) => d.sessions.length > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Calendar</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentWeekStart((prev) => addDays(prev, -7))}
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground px-1">{weekTitle}</span>
          <button
            onClick={() => setCurrentWeekStart((prev) => addDays(prev, 7))}
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="Next week"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={loadSessions}
            className="p-1.5 rounded hover:bg-secondary transition-colors ml-1"
            title="Reload schedule"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No sessions scheduled for this week.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.id}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {day.label}
              </div>
              <div className="space-y-1.5">
                {day.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-background px-3 py-2"
                  >
                    <div className="text-xs font-mono text-muted-foreground pt-0.5 whitespace-nowrap">
                      {session.startTime}–{session.endTime}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {session.courseCode}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.sessionType} · {session.faculty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarSection;
