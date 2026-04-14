import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function FacultyCard({
  faculty,
  to,
  className,
  imageClassName,
  contentClassName,
}) {
  const facultyId = faculty?.id ?? "";
  const detailPath = to ?? `/faculty/${facultyId}`;
  const hasImage = Boolean(faculty?.image);

  return (
    <Link to={detailPath} className="block w-full">
      <Card
        className={cn(
          "paper-card group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-slate-300",
          className
        )}
      >
        <div className="flex min-h-[176px]">
          <div
            className={cn(
              "w-[112px] shrink-0 border-r border-slate-200 bg-slate-100 sm:w-[128px]",
              imageClassName
            )}
          >
            {hasImage ? (
              <img
                src={faculty.image}
                alt={faculty?.name ? `${faculty.name} profile` : "Faculty profile"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : null}
          </div>

          <CardContent className={cn("flex flex-1 flex-col justify-center gap-2 p-4 sm:p-5", contentClassName)}>
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">
              {faculty?.name || "Unknown Faculty"}
            </h3>

            <p className="text-sm text-slate-600">
              Department: {faculty?.department || "Not assigned"}
            </p>

            <p className="text-sm text-slate-600">
              Cabin: {faculty?.cabin_number || "Not assigned"}
            </p>

            <p className="pt-1 text-sm font-medium text-sky-700">
              View profile
            </p>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
