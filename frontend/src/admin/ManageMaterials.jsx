import { useState, useEffect } from "react";
import AdminLayout from "./components/AdminLayout";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageMaterials() {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    type: "",
    description: "",
    url: "",
  });

  const passcode = localStorage.getItem("admin_passcode");

  /* ---------------- Fetch Subjects ---------------- */
  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/material-subjects`);
      setSubjects(res.data.subjects || []);
    } catch {
      toast.error("Failed to load subjects");
    }
  };

  /* ---------------- Fetch Materials ---------------- */
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND}/api/materials`);
      setMaterials(res.data);
    } catch {
      toast.error("Failed to load study materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, []);

  /* ---------------- Add / Update ---------------- */
  const handleSubmit = async () => {
    if (!form.title || !form.subject || !form.type || !form.url) {
      toast.error("All fields are required!");
      return;
    }

    try {
      if (editingId) {
        // UPDATE
        await axios.put(
          `${BACKEND}/api/materials/${editingId}`,
          form,
          { headers: { "x-admin-passcode": passcode } }
        );
        toast.success("Material updated successfully");
      } else {
        // ADD
        await axios.post(`${BACKEND}/api/materials`, form, {
          headers: { "x-admin-passcode": passcode },
        });
        toast.success("Material added successfully");
      }

      resetForm();
      fetchMaterials();
    } catch {
      toast.error("Unauthorized or server error");
    }
  };

  /* ---------------- Edit ---------------- */
  const handleEdit = (material) => {
    setEditingId(material.id);
    setForm({
      title: material.title,
      subject: material.subject,
      type: material.type,
      description: material.description || "",
      url: material.url,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- Delete ---------------- */
  const deleteMaterial = async (id) => {
    try {
      await axios.delete(`${BACKEND}/api/materials/${id}`, {
        headers: { "x-admin-passcode": passcode },
      });
      toast.success("Material deleted");
      fetchMaterials();
    } catch {
      toast.error("Unauthorized or failed to delete");
    }
  };

  /* ---------------- Reset Form ---------------- */
  const resetForm = () => {
    setForm({
      title: "",
      subject: "",
      type: "",
      description: "",
      url: "",
    });
    setEditingId(null);
  };

  return (
    <AdminLayout>
      <h2 className="text-3xl font-bold mb-6">Manage Study Materials</h2>

      {/* ---------- Add / Edit Form ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow mb-10">

        <Input
          placeholder="Material Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <Select
          value={form.subject}
          onValueChange={(value) => setForm({ ...form, subject: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((sub) => (
              <SelectItem key={sub} value={sub}>
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={form.type}
          onValueChange={(value) => setForm({ ...form, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Material Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="drive">Google Drive</SelectItem>
            <SelectItem value="link">External Link</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Short Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="md:col-span-3"
        />

        <Input
          placeholder="URL (PDF / Drive / External)"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          className="md:col-span-2"
        />

        <Button onClick={handleSubmit}>
          {editingId ? "Update Material" : "Add Material"}
        </Button>

        {editingId && (
          <Button variant="outline" onClick={resetForm}>
            Cancel Edit
          </Button>
        )}
      </div>

      {/* ---------- Loading ---------- */}
      {loading && <p className="text-gray-600">Loading materials...</p>}

      {/* ---------- Empty ---------- */}
      {!loading && materials.length === 0 && (
        <p className="text-gray-500 text-center py-10">
          No study materials added yet.
        </p>
      )}

      {/* ---------- Materials List ---------- */}
      <div className="space-y-5">
        {materials.map((m) => (
          <div
            key={m.id}
            className="bg-white p-5 rounded-lg shadow border hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{m.title}</h3>

                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded">
                    {m.subject}
                  </span>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    {m.type.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mt-3">{m.description} </p>

                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm mt-2 inline-block"
                >
                  Open Resource →
                </a>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleEdit(m)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMaterial(m.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
