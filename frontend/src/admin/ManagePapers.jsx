import { useState, useEffect } from "react";
import AdminLayout from "./components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    year: "",
    subject: "",
    department: "",
    title: "",
    type: "",
    pdfUrl: ""
  });

  const passcode = localStorage.getItem("admin_passcode");

  // Fetch papers
  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/papers`);
      setPapers(res.data);
    } catch {
      toast.error("Failed to load papers");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  // Add paper
  const handleSubmit = async () => {
    if (!form.title || !form.year || !form.pdfUrl) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      await axios.post(`${BACKEND}/api/papers`, form, {
        headers: { "x-admin-passcode": passcode }
      });

      toast.success("Paper added");
      setForm({
        year: "",
        subject: "",
        department: "",
        title: "",
        type: "",
        pdfUrl: ""
      });
      fetchPapers();
    } catch {
      toast.error("Unauthorized / Failed");
    }
  };

  // Delete paper
  const deletePaper = async (id) => {
    try {
      await axios.delete(`${BACKEND}/api/papers/${id}`, {
        headers: { "x-admin-passcode": passcode }
      });
      toast.success("Deleted successfully");
      fetchPapers();
    } catch {
      toast.error("Unauthorized action");
    }
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Manage Exam Papers</h2>

      {/* 🔷 Paper Form Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow mb-8">
        {Object.keys(form).map((key) => (
          <Input
            key={key}
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}

        <Button onClick={handleSubmit} className="md:col-span-3">
          Add Paper
        </Button>
      </div>

      {/* 🔷 List of Papers */}
      <div className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : papers.length === 0 ? (
          <p className="text-gray-500">No papers found.</p>
        ) : (
          papers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-white p-4 rounded-lg shadow"
            >
              <div>
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-gray-600 text-sm">
                  Year: {p.year} • Department: {p.department} • Subject: {p.subject}
                </p>
              </div>

              <Button variant="destructive" onClick={() => deletePaper(p.id)}>
                Delete
              </Button>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
