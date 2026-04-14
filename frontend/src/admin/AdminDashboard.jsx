import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, Clock3, Users } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "@/admin/components/AdminLayout";
import adminApi from "./api";

const statCards = [
  {
    key: "papers_count",
    title: "Total Papers",
    icon: BookOpen,
    gradient: "from-blue-600 to-sky-400",
  },
  {
    key: "faculty_count",
    title: "Faculty Profiles",
    icon: Users,
    gradient: "from-emerald-600 to-teal-400",
  },
  {
    key: "appointments_count",
    title: "Verified Appointments",
    icon: CalendarClock,
    gradient: "from-amber-500 to-orange-400",
  },
  {
    key: "pending_appointments_count",
    title: "Pending Appointments",
    icon: Clock3,
    gradient: "from-rose-600 to-pink-400",
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.get("/admin/stats");
        setStats(response.data);
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to load admin stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-black tracking-tight">
          Admin Dashboard
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {statCards.map((card) => (
              <div
                key={card.key}
                className="bg-white/10 h-32 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !stats ? (
          <div className="text-red-400">Unable to fetch dashboard stats.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <StatCard
                  key={card.key}
                  title={card.title}
                  value={stats[card.key] ?? 0}
                  icon={<Icon size={28} />}
                  gradient={card.gradient}
                />
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, gradient }) {
  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl hover:scale-[1.03] transition-all duration-300`}
    >
      <div className="flex justify-between items-center">
        <div className="text-4xl font-semibold">{value}</div>
        <div className="bg-white/20 p-3 rounded-xl">{icon}</div>
      </div>
      <p className="mt-2 text-lg opacity-90">{title}</p>
    </div>
  );
}
