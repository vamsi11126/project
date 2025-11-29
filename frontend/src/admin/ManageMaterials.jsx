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

  const [form, setForm] = useState({
    title: "",
    subject: "",
    type: "",
    description: "",
    url: "",
  });

  const passcode = localStorage.getItem("admin_passcode");

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/material-subjects`);
      setSubjects(res.data.subjects || []);
    } catch {
      toast.error("Failed to load subjects");
    }
  };

  // Fetch materials
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

  // Add Material
  const handleSubmit = async () => {
    if (!form.title || !form.subject || !form.type || !form.url) {
      toast.error("All fields are required!");
      return;
    }

    try {
      await axios.post(`${BACKEND}/api/materials`, form, {
        headers: { "x-admin-passcode": passcode },
      });

      toast.success("Study material added");
      setForm({ title: "", subject: "", type: "", description: "", url: "" });
      fetchMaterials();
    } catch {
      toast.error("Failed to add material (Unauthorized or server error)");
    }
  };

  // Delete Material
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

  return (
    <AdminLayout>
      <h2 className="text-3xl font-bold mb-6">Manage Study Materials</h2>

      {/* Add Material Form */}
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

        <Button className="w-full md:col-span-1" onClick={handleSubmit}>
          Add Material
        </Button>
      </div>

      {/* Loading */}
      {loading && <p className="text-gray-600">Loading materials...</p>}

      {/* Empty State */}
      {!loading && materials.length === 0 && (
        <p className="text-gray-500 text-center py-10">No study materials added yet.</p>
      )}

      {/* Materials List */}
      <div className="space-y-5">
        {materials.map((m) => (
          <div
            key={m.id}
            className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{m.title}</h3>

                {/* Subject + Type Badges */}
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded">
                    {m.subject}
                  </span>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    {m.type.toUpperCase()}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-700 mt-3">{m.description}</p>

                {/* URL */}
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm mt-2 inline-block"
                >
                  Open Resource →
                </a>
              </div>

              <Button
                variant="destructive"
                onClick={() => deleteMaterial(m.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
