import DashboardHeader from "@/components/DashboardHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, UserCheck, UserX, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Papa from "papaparse";

const getUserSession = () => {
    try {
        const session = localStorage.getItem("wisenet_session");
        const parsed = session ? JSON.parse(session) : null;
        return parsed || { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    } catch {
        return { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    }
};

// The static records have been replaced with a dynamic fetch hook inside the component.

export default function Attendance() {
    const userSession = getUserSession();
    const studentName = String(userSession?.fullName || "Surajit Chandra");
    const studentRoll = String(userSession?.rollNumber || "PGP-25-213");

    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);

        const urls = [
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_CnJbargP8J75YUkX9dS2KOEKzgKQ7QHA7wVYbUk0kVls8mlM9u9VdMIa2hDdJQ/pub?gid=97664591&single=true&output=csv",
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vSi4q-rXEa9W2ad4YF9SGmEDc24CbWf-BnhOHchjTNB0G3dCGWAs3wyRQCFGqbd5A/pub?gid=1343509215&single=true&output=csv"
        ];

        try {
            const allRecords: any[] = [];
            for (const url of urls) {
                const timestampUrl = `${url}&t=${new Date().getTime()}`;
                const response = await fetch(timestampUrl, { cache: "no-store" });
                const csvText = await response.text();
                const parsed = Papa.parse(csvText, { skipEmptyLines: true });
                const rows = parsed.data as string[][];

                if (rows.length < 4) continue;

                const coursesRow = rows[0];
                const classesRow = rows[1];

                // Check using roll number (column index 0) instead of name safely
                const studentRow = rows.find(r => r[0] && String(r[0]).trim().toLowerCase() === studentRoll.trim().toLowerCase());

                // If the student isn't found in the sheet, skip processing this sheet
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
                    const downgrade = parseInt(studentRow[i + 3]) || 0;

                    allRecords.push({
                        course: courseName,
                        code: "N/A",
                        conducted,
                        attended: present,
                        absent,
                        sanctionedLeave,
                        downgrade
                    });
                }
            }
            setAttendanceRecords(allRecords);
        } catch (err) {
            console.error("Failed to load attendance", err);
        } finally {
            setIsLoading(false);
            if (isManualRefresh) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totalConducted = attendanceRecords.reduce((acc, curr) => acc + curr.conducted, 0);
    const totalAttended = attendanceRecords.reduce((acc, curr) => acc + curr.attended, 0);
    const totalAbsent = attendanceRecords.reduce((acc, curr) => acc + curr.absent, 0);
    const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
                <DashboardHeader />
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <DashboardHeader />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header section */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">Attendance Record</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <span className="font-semibold text-primary">{studentName}</span>
                            <span>•</span>
                            <span>{studentRoll}</span>
                            <span>•</span>
                            <span>PGDM 2025-27</span>
                        </p>
                    </div>
                    <Button
                        onClick={() => loadData(true)}
                        disabled={isLoading || isRefreshing}
                        variant="outline"
                        className="flex items-center gap-2 w-full sm:w-auto"
                    >
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        Refresh Data
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="shadow-sm border-border/60">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                                <h3 className="text-2xl font-bold">{totalConducted}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/60">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                <UserCheck className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Attended</p>
                                <h3 className="text-2xl font-bold">{totalAttended}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/60">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                <UserX className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                                <h3 className="text-2xl font-bold">{totalAbsent}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/60">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-sm font-medium text-muted-foreground">Overall %</p>
                                    <span className="text-lg font-bold">{overallPercentage}%</span>
                                </div>
                                <Progress value={overallPercentage} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Course Breakdown Table */}
                <Card className="shadow-sm border-border/60 overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                        <CardTitle className="text-lg">Course-wise Breakdown</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[250px]">Course Name</TableHead>
                                    <TableHead className="text-center">Code</TableHead>
                                    <TableHead className="text-center">Conducted</TableHead>
                                    <TableHead className="text-center">Attended</TableHead>
                                    <TableHead className="text-center">Absent</TableHead>
                                    <TableHead className="text-center">Sanctioned Leave</TableHead>
                                    <TableHead className="text-center">Downgrade</TableHead>
                                    <TableHead className="text-right">Percentage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendanceRecords.map((record, index) => {
                                    const percentage = Math.round((record.attended / record.conducted) * 100);
                                    let statusColor = "text-green-600";
                                    let statusBg = "bg-green-100 dark:bg-green-900/30";
                                    if (percentage < 75) {
                                        statusColor = "text-red-600";
                                        statusBg = "bg-red-100 dark:bg-red-900/30";
                                    } else if (percentage < 85) {
                                        statusColor = "text-amber-600";
                                        statusBg = "bg-amber-100 dark:bg-amber-900/30";
                                    }

                                    let downgradeColor = record.downgrade > 0 ? "text-red-500 font-bold" : "text-green-500 font-medium";

                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium text-foreground">{record.course}</TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{record.code}</TableCell>
                                            <TableCell className="text-center">{record.conducted}</TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">{record.attended}</TableCell>
                                            <TableCell className="text-center text-red-500 font-medium">{record.absent}</TableCell>
                                            <TableCell className="text-center text-blue-500 font-medium">{record.sanctionedLeave}</TableCell>
                                            <TableCell className={`text-center ${downgradeColor}`}>
                                                {record.downgrade > 0 ? `Yes (${record.downgrade})` : "No (0)"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                    statusColor,
                                                    statusBg
                                                )}>
                                                    {percentage}%
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </main>
        </div>
    );
}
