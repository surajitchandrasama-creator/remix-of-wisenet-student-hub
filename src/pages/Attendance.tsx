import DashboardHeader from "@/components/DashboardHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, UserCheck, UserX, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mocked Attendance Data
const studentData = {
    name: "Surajit Chandra",
    rollNumber: "PGP-25-213",
    program: "PGDM 2025-27",
};

const attendanceRecords = [
    { course: "Managerial Accounting", code: "ACC506-PDM", conducted: 14, attended: 12, absent: 2 },
    { course: "Business Intelligence & Analytics", code: "ANA522-PDM", conducted: 12, attended: 12, absent: 0 },
    { course: "Marketing Research", code: "STR507-PDM", conducted: 10, attended: 8, absent: 2 },
    { course: "Human Resource Management", code: "HRM501-PDM", conducted: 15, attended: 14, absent: 1 },
    { course: "Digital Product Management", code: "INF522-PDM", conducted: 8, attended: 8, absent: 0 },
    { course: "Maker Lab", code: "INF530-PDM", conducted: 6, attended: 6, absent: 0 },
    { course: "Managerial Economics", code: "ECO501-PDM", conducted: 16, attended: 13, absent: 3 },
    { course: "Consumer Behavior", code: "CB501-PDM", conducted: 10, attended: 9, absent: 1 },
];

export default function Attendance() {
    const totalConducted = attendanceRecords.reduce((acc, curr) => acc + curr.conducted, 0);
    const totalAttended = attendanceRecords.reduce((acc, curr) => acc + curr.attended, 0);
    const totalAbsent = attendanceRecords.reduce((acc, curr) => acc + curr.absent, 0);
    const overallPercentage = Math.round((totalAttended / totalConducted) * 100);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <DashboardHeader />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header section */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">Attendance Record</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <span className="font-semibold text-primary">{studentData.name}</span>
                        <span>•</span>
                        <span>{studentData.rollNumber}</span>
                        <span>•</span>
                        <span>{studentData.program}</span>
                    </p>
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
                                    <TableHead className="w-[300px]">Course Name</TableHead>
                                    <TableHead className="text-center">Code</TableHead>
                                    <TableHead className="text-center">Conducted</TableHead>
                                    <TableHead className="text-center">Attended</TableHead>
                                    <TableHead className="text-center">Absent</TableHead>
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

                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium text-foreground">{record.course}</TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{record.code}</TableCell>
                                            <TableCell className="text-center">{record.conducted}</TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">{record.attended}</TableCell>
                                            <TableCell className="text-center text-red-500 font-medium">{record.absent}</TableCell>
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
