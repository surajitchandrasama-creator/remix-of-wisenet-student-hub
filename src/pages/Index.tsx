import DashboardHeader from "@/components/DashboardHeader";
import TimelineSection from "@/components/TimelineSection";
import CourseCards from "@/components/CourseCards";
import PreReadsSidebar from "@/components/PreReadsSidebar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="flex">
        {/* Main Content - 70% */}
        <main className="flex-1 min-w-0 p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">
            Hi, Raviteja! 👋
          </h1>
          <TimelineSection />
          <CourseCards />
        </main>

        {/* Pre-reads Sidebar - 30% */}
        <div className="hidden lg:block w-[340px] flex-shrink-0">
          <PreReadsSidebar />
        </div>
      </div>
    </div>
  );
};

export default Index;
