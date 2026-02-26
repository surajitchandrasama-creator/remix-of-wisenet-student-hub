import { Bell, MessageCircle, ToggleLeft, ToggleRight, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleUploadModal } from "./ScheduleUploadModal";
import { cn } from "@/lib/utils";

const DashboardHeader = () => {
  const [editMode, setEditMode] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "My courses", path: "#" },
    { label: "Timetable", path: "/timetable" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-6">
          <span
            className="text-xl font-bold wisenet-gradient-text tracking-tight cursor-pointer"
            onClick={() => navigate("/")}
          >
            WiseNet
          </span>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.path !== "#") navigate(item.path);
                }}
                href="#"
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md hover:bg-secondary transition-colors",
                  location.pathname === item.path
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {role && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {role.toUpperCase()}
            </span>
          )}

          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:bg-secondary/50 p-1 pr-2 rounded-full transition-colors focus:outline-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-semibold border border-border/50">
                  {initials}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-sm text-foreground space-y-0.5">
              <DropdownMenuItem className="cursor-pointer py-2">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2">Grades</DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer py-2"
                onSelect={(e) => {
                  e.preventDefault();
                  navigate("/calendar");
                }}
              >
                Calendar
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2">Messages</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2">Private files</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2">Reports</DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem className="cursor-pointer py-2">Preferences</DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              {role === "ta" && (
                <DropdownMenuItem
                  className="cursor-pointer py-2 font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsScheduleModalOpen(true);
                  }}
                >
                  Edit Schedule
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer py-2 font-medium text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setEditMode(!editMode)}
            className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-2"
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

      <ScheduleUploadModal open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen} />
    </>
  );
};

export default DashboardHeader;
