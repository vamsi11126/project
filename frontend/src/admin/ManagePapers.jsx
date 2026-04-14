import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import AdminLayout from "@/admin/components/AdminLayout";
import adminApi from "./api";

export default function ManagePapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pdfUrlError, setPdfUrlError] = useState("");
  const [form, setForm] = useState({
    year: "",
    subject: "",
    department: "",
    title: "",
    type: "",
    pdfUrl: "",
  });

  const isDriveUrl = (value) => {
    try {
      const parsed = new URL(value.trim());
      const host = parsed.hostname.toLowerCase();
      return host === "drive.google.com" || host === "docs.google.com";
    } catch {
      return false;
    }
  };

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get("/papers");
      setPapers(response.data);
    } catch {
      toast.error("Failed to load papers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleSubmit = async () => {
    if (!form.title || !form.year || !form.pdfUrl) {
      toast.error("Please fill required fields");
      return;
    }

    if (!isDriveUrl(form.pdfUrl)) {
      const message = "PDF link must be a Google Drive URL.";
      setPdfUrlError(message);
      toast.error(message);
      return;
    }

    try {
      if (editingId) {
        await adminApi.put(`/papers/${editingId}`, form);
        toast.success("Paper updated successfully");
      } else {
        await adminApi.post("/papers", form);
        toast.success("Paper added successfully");
      }

      resetForm();
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save paper");
    }
  };

  const handleEdit = (paper) => {
    setEditingId(paper.id);
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

  const deletePaper = async (id) => {
    try {
      await adminApi.delete(`/papers/${id}`);
      toast.success("Deleted successfully");
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete paper");
    }
  };

  const resetForm = () => {
    setForm({
      year: "",
      subject: "",
      department: "",
      title: "",
      type: "",
      pdfUrl: "",
    });
    setPdfUrlError("");
    setEditingId(null);
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Manage Exam Papers</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow mb-8">
        <Input
          placeholder="Year"
          value={form.year}
          onChange={(event) => setForm({ ...form, year: event.target.value })}
        />

        <Input
          placeholder="Department"
          value={form.department}
          onChange={(event) => setForm({ ...form, department: event.target.value })}
        />

        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
        />

        <Input
          placeholder="Paper Title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          className="md:col-span-2"
        />

        <Input
          placeholder="Type (Mid / Sem / Supply)"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
        />

        <Input
          placeholder="Google Drive PDF URL"
          value={form.pdfUrl}
          onChange={(event) => {
            setForm({ ...form, pdfUrl: event.target.value });
            if (pdfUrlError) {
              setPdfUrlError("");
            }
          }}
          className="md:col-span-3"
        />
        {pdfUrlError ? (
          <p className="md:col-span-3 text-sm font-medium text-red-600">{pdfUrlError}</p>
        ) : null}

        <Button onClick={handleSubmit} className="md:col-span-2">
          {editingId ? "Update Paper" : "Add Paper"}
        </Button>

        {editingId && (
          <Button variant="outline" onClick={resetForm}>
            Cancel Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : papers.length === 0 ? (
          <p className="text-gray-500">No papers found.</p>
        ) : (
          papers.map((paper) => (
            <div
              key={paper.id}
              className="flex items-center justify-between bg-white p-4 rounded-lg shadow"
            >
              <div>
                <h3 className="font-semibold text-lg">{paper.title}</h3>
                <p className="text-gray-600 text-sm">
                  Year: {paper.year} | Dept: {paper.department} | Subject: {paper.subject} | Type: {paper.type}
                </p>
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Open Paper
                </a>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEdit(paper)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deletePaper(paper.id)}
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
