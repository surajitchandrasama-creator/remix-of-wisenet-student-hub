import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import * as xlsx from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UploadCloud, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const dayMap: Record<string, number> = {
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6
};

// Helper function to convert excel time (which might be decimal) to float hours
const parseExcelTime = (timeRaw: string | number) => {
    if (typeof timeRaw === "number") {
        // Excel stores time as fractional days sometimes
        const totalMinutes = Math.round(timeRaw * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return {
            str: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
            frac: hours + mins / 60
        };
    }

    // String like "09:00"
    if (typeof timeRaw === "string" && timeRaw.includes(":")) {
        const parts = timeRaw.split(":");
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return {
            str: timeRaw,
            frac: h + m / 60
        };
    }

    return { str: "00:00", frac: 0 };
};

export function ScheduleUploadModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const navigate = useNavigate();
    const [date, setDate] = useState<Date>();
    const [file, setFile] = useState<File | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const processExcelData = (buffer: ArrayBuffer) => {
        try {
            const workbook = xlsx.read(buffer, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Expected headers: Day, Date, Start Time, End Time, Course Code, Session Type, Faculty
            const json = xlsx.utils.sheet_to_json<any>(worksheet);

            const fallbackDate = date || new Date();
            const fallbackWeekStart = format(
                addDays(fallbackDate, -(fallbackDate.getDay() === 0 ? 6 : fallbackDate.getDay() - 1)),
                "yyyy-MM-dd"
            );

            // Parser for "Date" column
            const getWeekStart = (dateRaw: any) => {
                let d: Date | null = null;
                if (typeof dateRaw === "number") {
                    d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
                } else if (typeof dateRaw === "string" && dateRaw.trim() !== "") {
                    // Normalize dashes and slashes
                    const str = dateRaw.replace(/-/g, '/');
                    const temp = new Date(str);
                    if (!isNaN(temp.getTime())) {
                        d = temp;
                    } else {
                        const parts = dateRaw.split(/[-/]/);
                        if (parts.length >= 2) {
                            const day = parseInt(parts[0], 10);
                            const monthStr = parts[1];
                            const year = parts.length === 3 ? parseInt(parts[2], 10) : fallbackDate.getFullYear();
                            const parsed = new Date(`${monthStr} ${day}, ${year}`);
                            if (!isNaN(parsed.getTime())) d = parsed;
                        }
                    }
                }

                if (!d || isNaN(d.getTime())) return fallbackWeekStart;

                const processDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
                return format(addDays(d, -processDay), "yyyy-MM-dd");
            };

            const sessions = json.map((row, idx) => {
                const dayStr = (row["Day"] || "").toString().toLowerCase().substring(0, 3);
                const dayOffset = dayMap[dayStr] ?? 0;

                const start = parseExcelTime(row["Start Time"]);
                const end = parseExcelTime(row["End Time"]);

                let duration = end.frac - start.frac;
                if (duration <= 0) duration = 1; // Default 1 hour if invalid

                const weekStartForSession = getWeekStart(row["Date"]);

                return {
                    id: `uploaded-${Math.random().toString(36).substring(7)}-${idx}`,
                    day: dayOffset,
                    date: row["Date"]?.toString() || "",
                    startTime: start.str,
                    endTime: end.str,
                    courseCode: row["Course Code"] || "",
                    sessionType: row["Session Type"] || "",
                    faculty: row["Faculty"] || "",
                    status: "NOT_MARKED", // We ignore status since it's just schedule
                    startHourFrac: start.frac,
                    durationHours: duration,
                    weekStart: weekStartForSession
                };
            });

            // Remove completely empty/invalid rows looking for Course Code
            const validSessions = sessions.filter(s => s.courseCode && s.startTime !== "00:00");

            if (validSessions.length > 0) {
                // Determine all unique weeks involved in this upload
                const updatedWeeks = new Set(validSessions.map(s => s.weekStart));

                const existingRaw = localStorage.getItem("calendar-schedule");
                let existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];

                // Clear out existing sessions ONLY for the weeks we just uploaded (to cleanly replace them)
                existing = existing.filter((s: any) => !updatedWeeks.has(s.weekStart));

                const combined = [...existing, ...validSessions];
                localStorage.setItem("calendar-schedule", JSON.stringify(combined));

                if (date) {
                    localStorage.setItem("calendar-start-date", date.toISOString());
                }
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !date) {
            toast.error("Please provide both a week starting date and a file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result;
            if (buffer && processExcelData(buffer as ArrayBuffer)) {
                toast.success("Schedule processed successfully!");
                onOpenChange(false);
                setFile(null);
                setDate(undefined);
            } else {
                toast.error("Failed to parse the schedule file. Please check format.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                        Upload Schedule
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    {/* Week Selector */}
                    <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-medium text-foreground">Week Starting Date</label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full flex items-center justify-start text-left rounded-md border border-input bg-background py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? (
                                        `${format(date, "MMM dd, yyyy")} - ${format(addDays(date, 6), "MMM dd, yyyy")}`
                                    ) : (
                                        <span>Pick the starting Monday of the week</span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                        setDate(d);
                                    }}
                                    disabled={(d) => d.getDay() !== 1} /* 1 is Monday */
                                    initialFocus
                                />
                                <div className="p-2 border-t flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsCalendarOpen(false)}
                                        className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                                    >
                                        OK
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-[11px] text-muted-foreground mt-1">Select the starting date of the week this schedule applies to.</p>
                    </div>

                    {/* File Upload Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Schedule File (.xlsx, .csv)</label>
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-primary/20 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center bg-primary/5 cursor-pointer group"
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setFile(e.target.files[0]);
                                    }
                                }}
                            />

                            {file ? (
                                <>
                                    <FileSpreadsheet className="h-10 w-10 text-emerald-500 mb-3" />
                                    <p className="font-semibold text-sm text-foreground">{file.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="h-10 w-10 text-primary/60 mb-3 group-hover:text-primary transition-colors" />
                                    <p className="font-semibold text-sm text-foreground">Click to upload or drag and drop</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Excel or CSV files only</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={!file || !date}
                            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Process Schedule
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
