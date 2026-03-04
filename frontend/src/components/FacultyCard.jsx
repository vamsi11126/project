import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80";

export default function FacultyCard({
  faculty,
  to,
  className,
  imageClassName,
  contentClassName,
}) {
  const facultyId = faculty?.id ?? "";
  const detailPath = to ?? `/faculty/${facultyId}`;

  return (
    <Link to={detailPath} className="block w-full">
      <Card
        className={cn(
          "group h-full overflow-hidden border-slate-200 bg-white/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-slate-300",
          className
        )}
      >
        <div className={cn("aspect-[4/3] w-full overflow-hidden bg-slate-100", imageClassName)}>
          <img
            src={faculty?.image || DEFAULT_IMAGE}
            alt={faculty?.name ? `${faculty.name} profile` : "Faculty profile"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        <CardContent className={cn("space-y-1 p-4 sm:p-5", contentClassName)}>
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900 sm:text-lg">
            {faculty?.name || "Unknown Faculty"}
          </h3>
          <p className="text-sm text-slate-600 sm:text-base">
            Cabin: {faculty?.cabin_number || "Not assigned"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
