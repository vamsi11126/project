import { useEffect, useState } from "react";
import axios from "axios";
import FacultyCard from "@/components/FacultyCard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FindFaculty() {
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchFaculty = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${API}/faculty`);
        if (mounted) {
          setFacultyList(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.detail ||
              "Unable to load faculty members right now. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchFaculty();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="faculty-title">
          Find Faculty
        </h1>
        <p className="page-description" data-testid="faculty-description">
          Browse faculty members and find their cabin details.
        </p>
      </div>

      {loading && <div className="loading">Loading faculty members...</div>}

      {!loading && error && (
        <div className="no-results" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && facultyList.length === 0 && (
        <div className="no-results">No faculty members available yet.</div>
      )}

      {!loading && !error && facultyList.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {facultyList.map((faculty) => (
            <FacultyCard key={faculty.id} faculty={faculty} />
          ))}
        </div>
      )}
    </div>
  );
}
