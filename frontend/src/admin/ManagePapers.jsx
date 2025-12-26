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

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    year: "",
    subject: "",
    department: "",
    title: "",
    type: "",
    pdfUrl: "",
  });

  const passcode = localStorage.getItem("admin_passcode");

  /* ---------------- Fetch Papers ---------------- */
  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/papers`);
      setPapers(res.data);
    } catch {
      toast.error("Failed to load papers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  /* ---------------- Add / Update Paper ---------------- */
  const handleSubmit = async () => {
    if (!form.title || !form.year || !form.pdfUrl) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      if (editingId) {
        // UPDATE
        await axios.put(
          `${BACKEND}/api/papers/${editingId}`,
          form,
          { headers: { "x-admin-passcode": passcode } }
        );
        toast.success("Paper updated successfully");
      } else {
        // ADD
        await axios.post(`${BACKEND}/api/papers`, form, {
          headers: { "x-admin-passcode": passcode },
        });
        toast.success("Paper added successfully");
      }

      resetForm();
      fetchPapers();
    } catch {
      toast.error("Unauthorized / Failed");
    }
  };

  /* ---------------- Edit Paper ---------------- */
  const handleEdit = (paper) => {
    setEditingId(paper.id);
    console.log("Editing ID:", editingId);

    setForm({
      year: paper.year || "",
      subject: paper.subject || "",
      department: paper.department || "",
      title: paper.title || "",
      type: paper.type || "",
      pdfUrl: paper.pdfUrl || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- Delete Paper ---------------- */
  const deletePaper = async (id) => {
    try {
      await axios.delete(`${BACKEND}/api/papers/${id}`, {
        headers: { "x-admin-passcode": passcode },
      });
      toast.success("Deleted successfully");
      fetchPapers();
    } catch {
      toast.error("Unauthorized action");
    }
  };

  /* ---------------- Reset Form ---------------- */
  const resetForm = () => {
    setForm({
      year: "",
      subject: "",
      department: "",
      title: "",
      type: "",
      pdfUrl: "",
    });
    setEditingId(null);
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Manage Exam Papers</h2>

      {/* ---------- Add / Edit Form ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow mb-8">

        <Input
          placeholder="Year"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />

        <Input
          placeholder="Department"
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />

        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />

        <Input
          placeholder="Paper Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="md:col-span-2"
        />

        <Input
          placeholder="Type (Mid / Sem / Supply)"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />

        <Input
          placeholder="PDF / Drive URL"
          value={form.pdfUrl}
          onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
          className="md:col-span-3"
        />

        <Button onClick={handleSubmit} className="md:col-span-2">
          {editingId ? "Update Paper" : "Add Paper"}
        </Button>

        {editingId && (
          <Button variant="outline" onClick={resetForm}>
            Cancel Edit
          </Button>
        )}
      </div>

      {/* ---------- Papers List ---------- */}
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
                  Year: {p.year} • Dept: {p.department} • Subject: {p.subject} • Type: {p.type}
                </p>
                <a
                  href={p.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Open Paper →
                </a>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEdit(p)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deletePaper(p.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
