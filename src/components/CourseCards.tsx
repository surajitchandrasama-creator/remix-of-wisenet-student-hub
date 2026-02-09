import courseBgTeal from "@/assets/course-bg-teal.jpg";
import courseBgBlue from "@/assets/course-bg-blue.jpg";
import courseBgPurple from "@/assets/course-bg-purple.jpg";

const courses = [
  {
    title: "PGDM 2025-27 - Abhyudaya Ment...",
    image: courseBgTeal,
  },
  {
    title: "Managerial Economics II",
    image: courseBgBlue,
  },
  {
    title: "Business Intelligence & Analytics",
    image: courseBgPurple,
  },
];

const CourseCards = () => {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-foreground">
        Recently accessed courses
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {courses.map((course) => (
          <div
            key={course.title}
            className="group min-w-[220px] max-w-[260px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-card transition-shadow hover:shadow-elevated"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={course.image}
                alt={course.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground leading-snug truncate">
                {course.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseCards;
