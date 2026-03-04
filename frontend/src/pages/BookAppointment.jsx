import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BookAppointment() {
  const { facultyId } = useParams();

  const [facultyName, setFacultyName] = useState("");
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  const [facultyError, setFacultyError] = useState("");

  const [formData, setFormData] = useState({
    student_name: "",
    registration_number: "",
    section: "",
    year: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [appointmentId, setAppointmentId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpHint, setOtpHint] = useState("");

  const otpStepActive = useMemo(() => Boolean(appointmentId), [appointmentId]);

  useEffect(() => {
    let mounted = true;

    const fetchFaculty = async () => {
      if (!facultyId) {
        setLoadingFaculty(false);
        setFacultyError("Faculty ID is missing.");
        return;
      }

      setLoadingFaculty(true);
      setFacultyError("");

      try {
        const response = await axios.get(`${API}/faculty/${facultyId}`);
        if (mounted) {
          setFacultyName(response?.data?.name || "");
        }
      } catch (err) {
        if (mounted) {
          setFacultyError(
            err?.response?.data?.detail || "Unable to load faculty details."
          );
        }
      } finally {
        if (mounted) {
          setLoadingFaculty(false);
        }
      }
    };

    fetchFaculty();

    return () => {
      mounted = false;
    };
  }, [facultyId]);

  const validateForm = () => {
    const nextErrors = {};
    const studentName = formData.student_name.trim();
    const regNo = formData.registration_number.trim().toUpperCase();
    const section = formData.section.trim().toUpperCase();
    const yearNum = Number(formData.year);

    if (studentName.length < 2) {
      nextErrors.student_name = "Enter at least 2 characters.";
    }

    if (!/^[A-Z0-9-]{4,20}$/.test(regNo)) {
      nextErrors.registration_number = "Use 4-20 chars (A-Z, 0-9, hyphen).";
    }

    if (!/^[A-Z0-9]{1,10}$/.test(section)) {
      nextErrors.section = "Use 1-10 alphanumeric characters.";
    }

    if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 6) {
      nextErrors.year = "Year must be between 1 and 6.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        faculty_id: facultyId,
        student_name: formData.student_name.trim(),
        registration_number: formData.registration_number.trim().toUpperCase(),
        section: formData.section.trim().toUpperCase(),
        year: Number(formData.year),
      };

      const response = await axios.post(`${API}/appointments`, payload);
      setAppointmentId(response?.data?.appointment_id || "");
      setOtpHint(response?.data?.otp_code || "");
      toast.success("Appointment request submitted. Enter OTP to verify.");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Failed to submit appointment request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      await axios.post(`${API}/appointments/verify-otp`, {
        appointment_id: appointmentId,
        otp_code: otpCode.trim(),
      });
      toast.success("OTP verified. Appointment booked successfully.");
      setOtpCode("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "OTP verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
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
        <h1 className="page-title">Book Appointment</h1>
        <p className="page-description">
          {loadingFaculty
            ? "Loading faculty information..."
            : facultyError
            ? facultyError
            : `Submit your request to meet ${facultyName || "the faculty member"}.`}
        </p>
      </div>

      <div className="request-section">
        <Card className="request-card">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>
              Fill all fields correctly to request an appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-group">
                <Label htmlFor="student_name">Student Name</Label>
                <Input
                  id="student_name"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  disabled={otpStepActive}
                  required
                />
                {errors.student_name ? <p className="text-sm text-red-600">{errors.student_name}</p> : null}
              </div>

              <div className="form-group">
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="Example: 22CSE1234"
                  disabled={otpStepActive}
                  required
                />
                {errors.registration_number ? (
                  <p className="text-sm text-red-600">{errors.registration_number}</p>
                ) : null}
              </div>

              <div className="form-group">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="Example: A1"
                  disabled={otpStepActive}
                  required
                />
                {errors.section ? <p className="text-sm text-red-600">{errors.section}</p> : null}
              </div>

              <div className="form-group">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min="1"
                  max="6"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="1 to 6"
                  disabled={otpStepActive}
                  required
                />
                {errors.year ? <p className="text-sm text-red-600">{errors.year}</p> : null}
              </div>

              {!otpStepActive ? (
                <Button type="submit" className="submit-btn" disabled={submitting || Boolean(facultyError)}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {otpStepActive ? (
          <Card className="request-card mt-6">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                OTP Verification
              </CardTitle>
              <CardDescription>
                Enter the 6-digit OTP to confirm your appointment request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {otpHint ? (
                <p className="mb-4 text-sm text-slate-600">
                  Dev OTP: <span className="font-semibold text-slate-800">{otpHint}</span>
                </p>
              ) : null}

              <form onSubmit={handleVerifyOtp} className="request-form">
                <div className="form-group">
                  <Label htmlFor="otp_code">OTP Code</Label>
                  <Input
                    id="otp_code"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    required
                  />
                </div>

                <Button type="submit" className="submit-btn" disabled={verifyingOtp}>
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
