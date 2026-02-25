import { useState, useEffect } from "react";
import { ChevronDown, MoreVertical, Plus, Minus } from "lucide-react";
import courseBgTeal from "@/assets/course-bg-teal.jpg";
import courseBgBlue from "@/assets/course-bg-blue.jpg";
import courseBgPurple from "@/assets/course-bg-purple.jpg";

const MOCK_TERMS = [
    {
        id: "term-3",
        name: "Term 3",
        isActive: true,
        subjects: [
            {
                id: "sub-1",
                title: "Decision Science PGDM Term III - Q...",
                code: "Core Courses - PGDM 2025-27",
                faculty: "Dr. Smith",
                attendance: 95,
                image: courseBgTeal,
            },
            {
                id: "sub-2",
                title: "Management Accounting - ACC506-...",
                code: "Core Courses - PGDM 2025-27",
                faculty: "Prof. Johnson",
                attendance: 89,
                image: courseBgBlue,
            },
            {
                id: "sub-3",
                title: "Managerial Economics - I - ECO502-...",
                code: "PGDM 2025-27 - Term I",
                faculty: "Dr. Clark",
                attendance: 91,
                image: courseBgPurple,
            },
        ],
    },
    {
        id: "term-2",
        name: "Term 2",
        isActive: false,
        subjects: [
            {
                id: "sub-4",
                title: "Business in Digital Age",
                code: "PGDM 2025-27 - Term II",
                faculty: "Dr. Brown",
                attendance: 92,
                image: courseBgPurple,
            },
            {
                id: "sub-5",
                title: "Corporate Finance",
                code: "PGDM 2025-27 - Term II",
                faculty: "Dr. Davis",
                attendance: 88,
                image: courseBgTeal,
            },
            {
                id: "sub-6",
                title: "Data Visualisation for Decision Making",
                code: "PGDM 2025-27 - Term II",
                faculty: "Prof. Wilson",
                attendance: 100,
                image: courseBgBlue,
            }
        ],
    },
    {
        id: "term-1",
        name: "Term 1",
        isActive: false,
        subjects: [
            {
                id: "sub-7",
                title: "Business Communication - I",
                code: "PGDM 2025-27 - Term I",
                faculty: "Dr. Smith",
                attendance: 85,
                image: courseBgTeal,
            },
            {
                id: "sub-8",
                title: "Business Policy & Strategy - I",
                code: "PGDM 2025-27 - Term I",
                faculty: "Prof. Johnson",
                attendance: 90,
                image: courseBgBlue,
            },
            {
                id: "sub-9",
                title: "Business Intelligence & Analytics",
                code: "Information Management & Analytics",
                faculty: "Dr. Lee",
                attendance: 83,
                image: courseBgPurple,
            }
        ],
    },
];

const CourseCard = ({ subject }: { subject: any }) => (
    <div className="flex flex-col rounded-xl border border-border/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 bg-card">
        <div className="relative h-[130px] w-full">
            <img
                src={subject.image}
                alt={subject.title}
                className="h-full w-full object-cover"
            />
        </div>
        <div className="p-4 flex flex-col flex-1">
            <h4 className="font-semibold text-[14px] text-foreground mb-1 leading-tight">
                {subject.title}
            </h4>
            <p className="text-[12px] text-muted-foreground mb-6">
                {subject.code}
            </p>
            <div className="mt-auto flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">{subject.attendance}% complete</span>
                <button className="text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-md transition-colors">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

const CourseOverview = () => {
    // We'll initialize from sessionStorage if it exists
    const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>(() => {
        try {
            const saved = sessionStorage.getItem("course-overview-expanded");
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error(error);
        }

        return {};
    });

    // Save to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem("course-overview-expanded", JSON.stringify(expandedTerms));
    }, [expandedTerms]);

    const toggleTerm = (termId: string) => {
        setExpandedTerms(prev => ({
            ...prev,
            [termId]: !prev[termId]
        }));
    };

    return (
        <div className="mt-10 mb-20 animate-in fade-in zoom-in-95 duration-500">
            <h2 className="mb-4 text-[17px] font-bold text-foreground">
                Course overview
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
                <input
                    type="text"
                    placeholder="Search"
                    className="rounded-md border border-input px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 w-full sm:w-[200px]"
                />
                <button className="rounded-md border border-input px-3 py-1.5 text-sm bg-background text-foreground flex items-center gap-1.5 hover:bg-accent transition-colors">
                    Sort by course name <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
                <button className="rounded-md border border-input px-3 py-1.5 text-sm bg-background text-foreground flex items-center gap-1.5 hover:bg-accent transition-colors">
                    Card <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {MOCK_TERMS.map((term) => {
                    const isExpanded = !!expandedTerms[term.id];

                    if (term.isActive) {
                        return (
                            <div key={term.id} className="flex flex-col mb-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {term.subjects.map(subject => (
                                        <CourseCard key={subject.id} subject={subject} />
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={term.id} className="flex flex-col">
                            <button
                                onClick={() => toggleTerm(term.id)}
                                className="flex items-center gap-3 text-foreground hover:text-primary transition-colors text-left py-2 w-max group"
                            >
                                <div className="border border-border/80 rounded-[4px] bg-background flex items-center justify-center w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:border-primary transition-colors">
                                    {isExpanded ? <Minus className="w-[14px] h-[14px]" /> : <Plus className="w-[14px] h-[14px]" />}
                                </div>
                                <span className="text-[16px] font-semibold">{term.name}</span>
                            </button>

                            {isExpanded && (
                                <div className="pl-6 border-l-2 border-border/60 ml-[9px] mt-4 mb-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {term.subjects.map(subject => (
                                            <CourseCard key={subject.id} subject={subject} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CourseOverview;
