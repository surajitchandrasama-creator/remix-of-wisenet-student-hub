import Papa from "papaparse";
import { format, isAfter, startOfDay, parseISO, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Get user session info safely
const getUserSession = () => {
    try {
        const session = localStorage.getItem("wisenet_session");
        const parsed = session ? JSON.parse(session) : null;
        return parsed || { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    } catch {
        return { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    }
};

export const fetchUpcomingAssignments = async () => {
    try {
        const { data, error } = await supabase.from("timeline_activities").select("*");

        let activities: any[] = [];
        if (data && !error) {
            activities = data.map((a: any) => {
                const rawDatePart = (a.due_date || "").split("T")[0] || format(new Date(), "yyyy-MM-dd");
                return { ...a, dueDate: new Date(`${rawDatePart}T23:59:59`) };
            });
        }

        const today = startOfDay(new Date());

        // Return all timeline activities that are upcoming (assignments, submissions, events, etc)
        const upcoming = activities.filter((a: any) =>
            isAfter(a.dueDate, today) || a.dueDate.getTime() === today.getTime()
        ).sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime());

        if (upcoming.length === 0) {
            return "You have no upcoming timeline activities (assignments, submissions, etc).";
        }

        return upcoming.map((a: any) => ({
            title: a.title,
            description: a.description,
            type: a.type || 'Activity',
            dueDate: format(a.dueDate, "yyyy-MM-dd"),
            time: a.time
        }));
    } catch (e) {
        console.error(e);
        return "Failed to fetch assignments from Supabase.";
    }
};

export const fetchSchedule = async () => {
    try {
        const { data, error } = await supabase.from("schedules").select("*");
        if (error || !data || data.length === 0) {
            return "No schedule found attached to the current layout.";
        }

        // Sort chronologically by week_start, day, then time
        const sortedData = data.sort((a: any, b: any) => {
            if (a.week_start !== b.week_start) return (a.week_start || "").localeCompare(b.week_start || "");
            if (a.day !== b.day) return (a.day || 0) - (b.day || 0);
            return (a.start_time || "").localeCompare(b.start_time || "");
        });

        // Return up to 100 combined condensed schedules, to easily accommodate multiple weeks without exceeding LLM context limits
        return sortedData.slice(0, 100).map((s: any) => {
            let readableDate = s.date;
            try {
                if (s.week_start && s.day !== undefined) {
                    const ws = parseISO(s.week_start);
                    readableDate = format(addDays(ws, s.day), "yyyy-MM-dd (EEEE)");
                }
            } catch (err) { }

            return {
                course: s.course_code,
                type: s.session_type,
                date: readableDate,
                time: `${s.start_time}-${s.end_time}`
            };
        });
    } catch (e) {
        console.error(e);
        return "Failed to fetch schedules from local prototype data.";
    }
};

export const fetchAttendanceFromSheets = async () => {
    const urls = [
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_CnJbargP8J75YUkX9dS2KOEKzgKQ7QHA7wVYbUk0kVls8mlM9u9VdMIa2hDdJQ/pub?gid=97664591&single=true&output=csv",
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSi4q-rXEa9W2ad4YF9SGmEDc24CbWf-BnhOHchjTNB0G3dCGWAs3wyRQCFGqbd5A/pub?gid=1343509215&single=true&output=csv"
    ];

    const session = getUserSession();
    const studentRoll = String(session?.rollNumber || "PGP-25-213");

    let totalConducted = 0;
    let totalAttended = 0;

    const records = [];

    try {
        for (const url of urls) {
            const timestampUrl = `${url}&t=${new Date().getTime()}`;
            const response = await fetch(timestampUrl, { cache: "no-store", method: "GET" }).catch(() => null);
            if (!response) continue;

            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { skipEmptyLines: true });
            const rows = parsed.data as string[][];

            if (rows.length < 4) continue;
            const coursesRow = rows[0];
            const classesRow = rows[1];
            const studentRow = rows.find(r => r[0] && String(r[0]).trim().toLowerCase() === studentRoll.trim().toLowerCase());

            if (!studentRow) continue;

            for (let i = 2; i < coursesRow.length; i += 4) {
                const courseName = coursesRow[i]?.trim();
                if (!courseName) continue;

                const conductedStr = classesRow[i + 1];
                let conductedArr = conductedStr ? conductedStr.match(/\d+/) : null;
                const conducted = conductedArr ? parseInt(conductedArr[0]) : 0;

                if (conducted === 0) continue;

                const present = parseInt(studentRow[i]) || 0;
                const absent = parseInt(studentRow[i + 1]) || 0;
                const sanctionedLeave = parseInt(studentRow[i + 2]) || 0;

                totalConducted += conducted;
                totalAttended += present;

                records.push({
                    course: courseName,
                    conducted,
                    attended: present,
                    absent,
                    sanctionedLeave
                });
            }
        }

        const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0;

        return {
            message: `Fetched attendance from sheets for ${studentRoll}`,
            overallPercentage,
            totalConducted,
            totalAttended,
            records,
        };
    } catch (err) {
        console.error(err);
        return { error: "Failed to connect to spreadsheet to check attendance." };
    }
};
