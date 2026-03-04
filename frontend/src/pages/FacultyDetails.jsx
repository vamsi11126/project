import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CalendarCheck2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=1000&q=80";

export default function FacultyDetails() {
  const { facultyId } = useParams();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchFacultyDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${API}/faculty/${facultyId}`);
        if (mounted) {
          setFaculty(response.data || null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.detail ||
              "Unable to load faculty details right now. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (facultyId) {
      fetchFacultyDetails();
    } else {
      setLoading(false);
      setError("Faculty ID is missing.");
    }

    return () => {
      mounted = false;
    };
  }, [facultyId]);

  return (
    <div className="page-container">
      <div className="mb-6">
        <Link to="/faculty" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Faculty
        </Link>
      </div>

      {loading && <div className="loading">Loading faculty details...</div>}

      {!loading && error && (
        <div className="no-results" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && faculty && (
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              <div className="h-full min-h-[280px] bg-slate-100 md:min-h-[420px]">
                <img
                  src={faculty.image || DEFAULT_IMAGE}
                  alt={faculty.name ? `${faculty.name} profile` : "Faculty profile"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {faculty.name}
                  </h1>
                  <p className="inline-flex items-center gap-2 text-base text-slate-700">
                    <MapPin className="h-4 w-4" />
                    Cabin: {faculty.cabin_number || "Not assigned"}
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Available Free Time Slots
                  </h2>

                  {Array.isArray(faculty.available_time_slots) &&
                  faculty.available_time_slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {faculty.available_time_slots.map((slot, index) => (
                        <span
                          key={`${slot}-${index}`}
                          className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      No free time slots available currently.
                    </p>
                  )}
                </div>

                <Link to={`/faculty/${facultyId}/book`}>
                  <Button className="h-11 w-full gap-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 sm:w-auto">
                    <CalendarCheck2 className="h-4 w-4" />
                    Book Appointment
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
