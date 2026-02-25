import { useState, useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { ChevronLeft, ChevronRight, Menu, Grid, Calendar as CalendarIcon, Check, X } from "lucide-react";
import { format, addDays } from "date-fns";

// Types
type SessionStatus = "PRESENT" | "ABSENT" | "NOT_MARKED" | "NOT_CONDUCTED";

interface CalendarSession {
    id: string;
    day: number; // 0 = Mon, 6 = Sun
    date: string; // "23-Feb"
    startTime: string; // "09:00"
    endTime: string; // "10:10"
    courseCode: string; // "ML (INF530-PDM)"
    sessionType: string; // "Session"
    faculty: string; // "Dhruven Zala"
    status: SessionStatus;
    startHourFrac: number; // e.g. 9.0 for 9am, 10.66 for 10:40am
    durationHours: number; // e.g. 1.16 for 70 mins
    weekStart?: string; // "2026-02-23"
}

const START_HOUR = 7; // Calendar starts at 7am
const END_HOUR = 21; // Calendar ends at 9pm
const HOURS_COUNT = END_HOUR - START_HOUR + 1; // 15 hours
const HOUR_HEIGHT = 64; // Each hour block is 64px tall

export default function Calendar() {
    const [sessions, setSessions] = useState<CalendarSession[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const storedStartDate = sessionStorage.getItem("calendar-start-date");
        if (storedStartDate) return new Date(storedStartDate);

        // Find current Monday if no stored date
        const now = new Date();
        const processDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
        return addDays(now, -processDay);
    });

    useEffect(() => {
        // Load sessions from storage
        const storedSessions = sessionStorage.getItem("calendar-schedule");
        if (storedSessions) {
            try {
                setSessions(JSON.parse(storedSessions));
            } catch (e) {
                console.error("Failed to parse stored sessions");
            }
        }
    }, []);

    // Generate dynamic columns based on the current viewed week
    const daysHeaders = Array.from({ length: 7 }).map((_, i) => {
        const currentDay = addDays(currentWeekStart, i);
        return {
            id: i,
            label: format(currentDay, "d EEE") // "23 Mon", "24 Tue" etc.
        };
    });

    const weekEndDate = addDays(currentWeekStart, 6);
    const weekTitle = `${format(currentWeekStart, "d MMM yyyy")} - ${format(weekEndDate, "d MMM yyyy")}`;

    const handlePreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
    const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));

    const handleThisWeek = () => {
        const storedStartDate = sessionStorage.getItem("calendar-start-date");
        if (storedStartDate) {
            setCurrentWeekStart(new Date(storedStartDate));
        } else {
            const now = new Date();
            const processDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
            setCurrentWeekStart(addDays(now, -processDay));
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <DashboardHeader />

            {/* Calendar View Container */}
            <main className="flex-1 min-w-0 p-4 pb-0 flex flex-col mx-auto w-full max-w-[1400px]">
                {/* Top Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center text-primary bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
                            <button onClick={handlePreviousWeek} className="p-1 hover:bg-primary/20 rounded-md transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <CalendarIcon className="w-4 h-4 mx-2" />
                            <span className="font-semibold text-[15px]">{weekTitle}</span>
                            <button onClick={handleNextWeek} className="p-1 hover:bg-primary/20 rounded-md transition-colors ml-1">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={handleThisWeek} className="text-[13px] font-medium text-muted-foreground border border-border px-4 py-1.5 rounded bg-muted/30 hover:bg-muted transition-colors">
                            This Week
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium text-muted-foreground">
                        {/* Attendance legends removed as requested */}
                        <div className="flex items-center gap-1.5">
                            Uploaded Schedule View
                        </div>

                        <div className="flex items-center ml-2 border border-border rounded-md overflow-hidden bg-background">
                            <button className="p-1.5 hover:bg-muted text-muted-foreground"><Menu className="w-4 h-4 shrink-0" /></button>
                            <button className="p-1.5 bg-muted text-foreground"><Grid className="w-4 h-4 shrink-0" /></button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Calendar Grid */}
                <div className="flex-1 overflow-auto bg-card border rounded-b-md relative min-h-[500px] mb-6 mt-0">
                    <div className="min-w-[900px]">
                        {/* Header Row */}
                        <div className="flex border-b bg-muted/40 sticky top-0 z-20">
                            <div className="w-[60px] shrink-0 border-r flex flex-col justify-center items-center py-2 text-[10px] text-muted-foreground bg-card">
                                <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Day</span>
                                <span className="flex items-center gap-1 mt-1"><CalendarIcon className="w-3 h-3 opacity-0" /> Time</span>
                            </div>

                            <div className="flex flex-1">
                                {daysHeaders.map((day, i) => (
                                    <div
                                        key={day.id}
                                        className={`flex-1 min-w-0 border-r ${i === 0 ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
                                    >
                                        <div className="flex justify-between items-center px-3 py-2 text-[12px] font-medium text-center">
                                            <span className="w-full truncate">{day.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Time Grid Row */}
                        <div className="flex relative">
                            {/* Left Y-axis Time column */}
                            <div className="w-[60px] shrink-0 border-r bg-card relative z-10">
                                {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                                    <div key={i} className="flex gap-2 justify-end pr-2 pt-[6px]" style={{ height: `${HOUR_HEIGHT}px` }}>
                                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                            {START_HOUR + i > 12
                                                ? `${START_HOUR + i - 12} pm`
                                                : START_HOUR + i === 12
                                                    ? "12 pm"
                                                    : `${START_HOUR + i} am`}
                                        </span>
                                        <span className="text-border mt-1">-</span>
                                    </div>
                                ))}
                            </div>

                            {/* Day Columns BG and Grid Lines */}
                            <div className="flex flex-1 relative bg-[#FAFAFA]">
                                {/* Horizontal Grid lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="border-b border-border/40 w-full"
                                            style={{ height: `${HOUR_HEIGHT}px` }}
                                        />
                                    ))}
                                </div>

                                {/* Vertical columns for positioning */}
                                {daysHeaders.map((day, i) => (
                                    <div key={day.id} className="flex-1 min-w-0 border-r border-border/40 relative">
                                        {/* Render blocks for this day */}
                                        {sessions.filter(s => s.day === day.id && s.weekStart === format(currentWeekStart, "yyyy-MM-dd")).map(session => (
                                            <div
                                                key={session.id}
                                                className="absolute left-[2px] right-[2px] bg-white rounded shadow-sm border border-border/60 p-2 overflow-hidden flex flex-col transition-shadow hover:shadow-md cursor-pointer"
                                                style={{
                                                    top: `${(session.startHourFrac - START_HOUR) * HOUR_HEIGHT}px`,
                                                    height: `${session.durationHours * HOUR_HEIGHT}px`,
                                                }}
                                            >
                                                {/* Top Right Tag Triangle */}
                                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-r-[0px] border-b-[0px] border-t-primary border-l-transparent"></div>

                                                <div className="font-semibold text-[11px] text-foreground leading-tight">{session.courseCode}</div>
                                                {session.sessionType && <div className="text-[10px] text-muted-foreground/90 font-medium">({session.sessionType})</div>}
                                                <div className="text-[9px] text-muted-foreground mt-auto truncate">{session.faculty}</div>
                                                <div className="text-[9px] text-muted-foreground mt-[2px] font-mono tracking-tight">{session.startTime}-{session.endTime}</div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
