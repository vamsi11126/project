import { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { Button } from "@/components/ui/button";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const passcode = localStorage.getItem("admin_passcode");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND}/api/requests`);
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteReq = async (id) => {
    await axios.delete(`${BACKEND}/api/requests/${id}`, {
      headers: { "x-admin-passcode": passcode },
    });
    fetchRequests();
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <AdminLayout>
      <h2 className="text-3xl font-bold mb-6">Student Requests</h2>

      {/* Loading State */}
      {loading && <p className="text-gray-600">Loading requests...</p>}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <p>No student requests found.</p>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-5">
        {requests.map((r) => (
          <div
            key={r.id}
            className="p-5 bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {r.name}{" "}
                  <span className="text-gray-500 text-sm">({r.email})</span>
                </h3>

                {/* Department Badge */}
                <span className="inline-block mt-1 text-xs bg-gray-800 text-white px-2 py-1 rounded">
                  {r.department}
                </span>

                {/* Message */}
                <p className="mt-3 text-gray-700">{r.details}</p>

                {/* Timestamp */}
                {r.timestamp && (
                  <p className="text-gray-400 text-xs mt-2">
                    Submitted on:{" "}
                    {new Date(r.timestamp).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>

              <Button variant="destructive" onClick={() => deleteReq(r.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
