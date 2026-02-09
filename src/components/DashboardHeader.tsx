import { Bell, MessageCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";

const DashboardHeader = () => {
  const [editMode, setEditMode] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold wisenet-gradient-text tracking-tight">
          WiseNet
        </span>
        <nav className="hidden md:flex items-center gap-1">
          <a
            href="#"
            className="px-3 py-1.5 text-sm font-medium text-foreground rounded-md hover:bg-secondary transition-colors"
          >
            Dashboard
          </a>
          <a
            href="#"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md hover:bg-secondary transition-colors"
          >
            My courses
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          RG
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {editMode ? (
            <ToggleRight className="h-5 w-5 text-primary" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
          <span>Edit mode</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
