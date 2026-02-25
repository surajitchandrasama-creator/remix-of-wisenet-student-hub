import { ChevronDown, FileUp } from "lucide-react";

const timelineData = [
  {
    date: "Thursday, 26 February 2026",
    activities: [
      {
        id: 1,
        time: "23:59",
        title: "INF530-PDM-46-G01",
        description: "Assignment is due · Maker Lab",
      }
    ]
  },
  {
    date: "Saturday, 28 February 2026",
    activities: [
      {
        id: 2,
        time: "23:59",
        title: "NCL503-PDM-46-I27",
        description: "Assignment is due · PGDM 2025-27 - Abhyudaya Mentorship - NCL503-PDM",
      },
      {
        id: 3,
        time: "23:59",
        title: "NCL503-PDM-46-I28",
        description: "Assignment is due · PGDM 2025-27 - Abhyudaya Mentorship - NCL503-PDM",
      }
    ]
  },
  {
    date: "Sunday, 1 March 2026",
    activities: [
      {
        id: 4,
        time: "23:59",
        title: "ANA522-PDM-46-G01",
        description: "Assignment is due · Business Intelligence & Analytics",
      }
    ]
  },
  {
    date: "Saturday, 14 March 2026",
    activities: [
      {
        id: 5,
        time: "23:59",
        title: "INF522-PDM-46-G03",
        description: "Assignment is due · Digital Product Management",
      }
    ]
  }
];

const TimelineSection = () => {
  return (
    <div className="rounded-lg border bg-card shadow-sm mb-6">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-[17px] font-bold text-foreground tracking-tight">Timeline</h2>
      </div>

      <div className="px-6 pb-6 pt-2 flex flex-col gap-6">
        {/* Filters Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors">
              Next 6 months <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors">
              Sort by dates <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="relative w-full sm:w-[320px]">
            <input
              type="text"
              placeholder="Search by activity type or name"
              className="w-full rounded-md border border-input bg-background py-1.5 px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
        </div>

        {/* Timeline Items */}
        <div className="space-y-6">
          {timelineData.map((day, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="font-semibold text-foreground text-[14px]">{day.date}</h3>
              <div className="space-y-0">
                {day.activities.map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3">
                      <div className="flex items-center gap-4 min-w-[120px]">
                        <span className="text-xs font-medium text-foreground/80">{activity.time}</span>
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

                      <div className="mt-2 sm:mt-0 sm:text-right">
                        <button className="text-xs font-semibold text-[#3B82F6] hover:text-[#2563EB] hover:underline whitespace-nowrap">
                          Add submission
                        </button>
                      </div>
                    </div>
                    {/* Inter-item subtle border */}
                    {index < day.activities.length - 1 && (
                      <div className="h-px bg-border/40 w-full" />
                    )}
                  </div>
                ))}
              </div>
              {/* Border under entire date group unless last */}
              {idx < timelineData.length - 1 && (
                <div className="h-px bg-border/60 w-full mt-2" />
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button className="rounded text-xs bg-secondary px-3 py-1.5 font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border/50">
            Show more activities
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineSection;
