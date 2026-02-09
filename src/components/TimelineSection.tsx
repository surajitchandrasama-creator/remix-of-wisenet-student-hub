import { Search, ChevronDown, Inbox } from "lucide-react";

const TimelineSection = () => {
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">Timeline</h2>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors">
            Overdue <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors">
            Sort by dates <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by activity type or name"
              className="w-full rounded-md border bg-background py-1.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No activities require action</p>
        </div>
      </div>
    </div>
  );
};

export default TimelineSection;
