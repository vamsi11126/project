import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function FacultyDashboard() {
  const { facultyId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meetingTimes, setMeetingTimes] = useState({});
  const [actingId, setActingId] = useState("");

  const fetchAppointments = async () => {
    if (!facultyId) {
      setError("Faculty ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API}/faculty/${facultyId}/appointments`);
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load appointment requests right now."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [facultyId]);

  const handleReject = async (appointmentId) => {
    setActingId(appointmentId);
    try {
      await axios.patch(`${API}/appointments/${appointmentId}/status`, {
        faculty_id: facultyId,
        appointment_status: "rejected",
      });
      toast.success("Appointment rejected.");
      fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject appointment.");
    } finally {
      setActingId("");
    }
  };

  const handleAccept = async (appointmentId) => {
    const pickedTime = meetingTimes[appointmentId];
    if (!pickedTime) {
      toast.error("Select meeting time before accepting.");
      return;
    }

    setActingId(appointmentId);
    try {
      await axios.patch(`${API}/appointments/${appointmentId}/status`, {
        faculty_id: facultyId,
        appointment_status: "accepted",
        meeting_time: new Date(pickedTime).toISOString(),
      });
      toast.success("Appointment accepted.");
      fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to accept appointment.");
    } finally {
      setActingId("");
    }
  };

  const statusClass = (status) => {
    if (status === "accepted") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <Link
          to={`/faculty/${facultyId || ""}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Faculty Details
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Faculty Dashboard</h1>
        <p className="page-description">
          Manage appointment requests. New requests start with status <strong>Pending</strong>.
        </p>
      </div>

      {loading && <div className="loading">Loading appointment requests...</div>}
      {!loading && error && (
        <div className="no-results" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && appointments.length === 0 && (
        <div className="no-results">No appointment requests available.</div>
      )}

      {!loading && !error && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const isPending = appt.appointment_status === "pending";
            return (
              <Card key={appt.id} className="border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-lg text-slate-900">
                      {appt.student_name}
                    </CardTitle>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClass(
                        appt.appointment_status
                      )}`}
                    >
                      {appt.appointment_status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-slate-900">Registration:</span>{" "}
                      {appt.registration_number}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Section:</span> {appt.section}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Year:</span> {appt.year}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Requested Meeting:</span>{" "}
                      {formatDateTime(appt.requested_time)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Meeting Time:</span>{" "}
                      {formatDateTime(appt.meeting_time)}
                    </p>
                  </div>

                  {isPending ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                        <div>
                          <Label htmlFor={`meeting-time-${appt.id}`}>
                            Select Meeting Time
                          </Label>
                          <Input
                            id={`meeting-time-${appt.id}`}
                            type="datetime-local"
                            value={meetingTimes[appt.id] || ""}
                            onChange={(event) =>
                              setMeetingTimes((prev) => ({
                                ...prev,
                                [appt.id]: event.target.value,
                              }))
                            }
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>

                        <Button
                          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => handleAccept(appt.id)}
                          disabled={actingId === appt.id}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </Button>

                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={() => handleReject(appt.id)}
                          disabled={actingId === appt.id}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <CalendarClock className="h-4 w-4" />
                      Request already processed.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
