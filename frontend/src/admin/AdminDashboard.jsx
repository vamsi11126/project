import { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import axios from "axios";
import { FileText, Clock } from "lucide-react";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const passcode = localStorage.getItem("admin_passcode");
    const candidateUrls = [
      `${BACKEND}/api/admin/stats`,
      `${BACKEND}/admin/stats`,
      "/api/admin/stats",
    ];

    setLoading(true);
    for (const url of candidateUrls) {
      try {
        const res = await axios.get(url, {
          headers: { "x-admin-passcode": passcode },
        });
        setStats(res.data);
        setLoading(false);
        return;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          continue;
        }
        setLoading(false);
        toast.error(err?.response?.data?.detail || "Failed to load admin stats.");
        return;
      }
    }

    setLoading(false);
    toast.error("Admin stats endpoint not found. Check backend URL configuration.");
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-black tracking-tight">
          Admin Dashboard
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white/10 h-32 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : !stats ? (
          <div className="text-red-300">Unable to fetch dashboard stats.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Total Papers"
              value={stats.papers_count}
              icon={<FileText size={28} />}
              gradient="from-blue-600 to-blue-400"
            />
            <StatCard
              title="Pending Requests"
              value={stats.requests_count}
              icon={<Clock size={28} />}
              gradient="from-rose-600 to-rose-400"
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

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
