import { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import axios from "axios";
import { FileText, BookOpen, Clock } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const passcode = localStorage.getItem("admin_passcode");
    const res = await axios.get(`${BACKEND}/api/admin/stats`, {
      headers: { "x-admin-passcode": passcode },
    });
    setStats(res.data);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-black tracking-tight">
          Admin Dashboard
        </h1>

        {!stats ? (
          // 🌟 Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/10 h-32 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          // 🌟 Stats Cards
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Papers"
              value={stats.papers}
              icon={<FileText size={28} />}
              gradient="from-blue-600 to-blue-400"
            />
            <StatCard
              title="Study Materials"
              value={stats.materials}
              icon={<BookOpen size={28} />}
              gradient="from-purple-600 to-purple-400"
            />
            <StatCard
              title="Pending Requests"
              value={stats.requests}
              icon={<Clock size={28} />}
              gradient="from-rose-600 to-rose-400"
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ✔️ Reusable Stat Card Component
function StatCard({ title, value, icon, gradient }) {
  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-pointer`}
    >
      <div className="flex justify-between items-center">
        <div className="text-4xl font-semibold">{value}</div>
        <div className="bg-white/20 p-3 rounded-xl">{icon}</div>
      </div>
      <p className="mt-2 text-lg opacity-90">{title}</p>
    </div>
  );
}
