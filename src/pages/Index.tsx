import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import TimelineSection from "@/components/TimelineSection";
import CourseCards from "@/components/CourseCards";
import PreReadsSidebar from "@/components/PreReadsSidebar";
import CourseOverview from "@/components/CourseOverview";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem("wisenet_session");
    if (!session) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="flex">
        {/* Main Content - 70% */}
        <main className="flex-1 min-w-0 p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Wisenet Student Portal
          </h1>
          <TimelineSection />
          <CourseCards />
          <CourseOverview />
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
