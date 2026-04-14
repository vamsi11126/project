import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ShieldCheck, Clock, FileText, Send, CheckCircle2, User, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API } from "@/lib/api";

export default function BookAppointment() {
  const { facultyId } = useParams();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState(null);
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  
  const [formData, setFormData] = useState({
    student_name: "",
    student_email: "",
    registration_number: "",
    section: "",
    year: "",
    reason: "",
    chosen_slot: ""
  });

  const [appointmentId, setAppointmentId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");
  const [step, setStep] = useState(1); // 1: Form, 2: OTP, 3: Success
  const availableTimeSlots = Array.isArray(faculty?.available_time_slots) ? faculty.available_time_slots : [];

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const res = await axios.get(`${API}/faculty/${facultyId}`);
        setFaculty(res.data);
      } catch (err) {
        toast.error("Faculty details not found.");
      } finally {
        setLoadingFaculty(false);
      }
    };
    fetchFaculty();
  }, [facultyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInitiate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        faculty_id: facultyId,
        year: parseInt(formData.year) || 1,
        // Send null if empty string
        chosen_slot: formData.chosen_slot || null
      };
      const response = await axios.post(`${API}/appointments`, payload);
      setAppointmentId(response.data.appointment_id);
      setOtpDestination(response.data.otp_destination);
      setStep(2);
      toast.success("Security code sent to your academic email.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Request failed. Check all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    console.log("DEBUG: Verifying OTP...", otpCode);
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await axios.post(`${API}/appointments/verify-otp`, {
        appointment_id: appointmentId,
        otp_code: otpCode.trim()
      });
      console.log("DEBUG: OTP Verification Result", res.data);
      setStep(3);
      toast.success("Appointment verified successfully!");
    } catch (err) {
      console.error("DEBUG: OTP Error", err.response?.data);
      toast.error(err.response?.data?.detail || "Invalid code. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loadingFaculty) return <div className="p-20 text-center flex flex-col items-center"><Loader2 className="animate-spin h-10 w-10 text-primary mb-4" /><p className="font-medium">Loading faculty profile...</p></div>;

  return (
    <div className="page-container max-w-4xl mx-auto py-10 px-4 min-h-screen">
      <div className="mb-8">
        <Link to={`/faculty/${facultyId}`} className="flex items-center text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Faculty
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Request Appointment</h1>
        <p className="text-muted-foreground mt-2">Connect with {faculty?.name} from {faculty?.department}</p>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
          <Card className="md:col-span-2 border-none shadow-xl ring-1 ring-border/50 bg-white/80">
            <CardHeader>
              <CardTitle>Academic Details</CardTitle>
              <CardDescription>Fill out your details to request an interaction.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInitiate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input name="student_name" value={formData.student_name} onChange={handleChange} placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Register Number</Label>
                    <Input name="registration_number" value={formData.registration_number} onChange={handleChange} placeholder="22CSE101" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Academic Email</Label>
                  <Input name="student_email" type="email" value={formData.student_email} onChange={handleChange} placeholder="john.doe@college.edu" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year of Study</Label>
                    <Input name="year" type="number" min="1" max="5" value={formData.year} onChange={handleChange} placeholder="3" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Input name="section" value={formData.section} onChange={handleChange} placeholder="A" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Meeting</Label>
                  <Textarea name="reason" value={formData.reason} onChange={handleChange} placeholder="Regarding doubt clarification or project review..." required className="min-h-[100px]" />
                </div>

                <div className="border-t pt-6 bg-muted/10 p-4 rounded-xl">
                  <h3 className="font-bold mb-4 flex items-center"><Clock className="w-4 h-4 mr-2" /> Preferred Time Slot (Optional)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableTimeSlots.map((slot) => (
                      <div 
                        key={slot}
                        onClick={() => setFormData({...formData, chosen_slot: formData.chosen_slot === slot ? "" : slot})}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-sm font-medium ${
                          formData.chosen_slot === slot 
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                          : "bg-white hover:border-primary/30"
                        }`}
                      >
                        {slot}
                      </div>
                    ))}
                    {availableTimeSlots.length === 0 && (
                      <p className="col-span-2 text-center text-xs text-muted-foreground p-6 bg-white rounded-lg border-2 border-dashed">No slots listed by faculty. You can still initiate the request.</p>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Continue to Verification
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="h-fit bg-muted/20 border-none">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest font-black text-muted-foreground">Booking Path</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-medium">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-1" />
                <p>Email verification confirms your identity.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-1" />
                <p>Slot selection is optional; faculty can coordinate later.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-1" />
                <p>You'll receive a confirmation mail once accepted.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto py-20 px-4">
          <Card className="shadow-2xl border-none overflow-hidden">
            <div className="h-2 bg-primary"></div>
            <CardHeader className="text-center pt-8">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Mailbox Check</CardTitle>
              <CardDescription className="text-md">
                We've sent a 6-digit code to:<br/>
                <strong className="text-foreground">{otpDestination}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                    <Input 
                        className="text-center text-3xl tracking-[0.3em] font-mono h-16 border-2 focus:border-primary" 
                        maxLength={6} 
                        autoFocus 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                        required
                    />
                </div>
                <Button type="submit" className="w-full h-14 text-lg font-bold shadow-xl" disabled={verifyingOtp}>
                  {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Verify & Book Appointment"}
                </Button>
                <div className="text-center">
                    <Button variant="ghost" type="button" onClick={() => setStep(1)} className="text-muted-foreground hover:text-primary">
                      Wait, my email is wrong
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md mx-auto text-center py-20 px-4">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 border-4 border-white shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Success!</h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Your request has been submitted. The faculty member will review your details and you'll receive a notification on <strong>{formData.student_email}</strong>.
          </p>
          <Button onClick={() => navigate("/faculty")} className="w-full h-14 text-lg shadow-lg">
            Return to Directory
          </Button>
        </div>
      )}
    </div>
  );
}
