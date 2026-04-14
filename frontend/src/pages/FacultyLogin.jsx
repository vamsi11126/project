import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Mail, Key, ArrowRight, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";

const FacultyLogin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Password, 4: Set Password
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [otpId, setOtpId] = useState("");
    const [loading, setLoading] = useState(false);

    // Stage 1: Check Email
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setEmailError("");
        try {
            const response = await axios.post(`${API}/auth/faculty/login`, { email });
            const { status } = response.data;
            
            if (status === "needs_password") {
                setStep(3);
                toast.info("Account found. Please enter your password.");
            } else if (status === "needs_otp") {
                setOtpId(response.data.otp_id);
                setStep(2);
                toast.success("Login code sent to your academic email.");
            }
        } catch (err) {
            const message =
                err.response?.data?.detail || "Use your college email address to continue.";
            setEmailError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Stage 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API}/auth/faculty/verify`, {
                otp_id: otpId,
                otp_code: otp
            });

            const { access_token, faculty_id, needs_password } = response.data;
            localStorage.setItem("faculty_token", access_token);
            localStorage.setItem("faculty_id", faculty_id);
            
            if (needs_password) {
                setStep(4);
                toast.success("Email verified! Please set your login password.");
            } else {
                toast.success("Successfully logged in!");
                navigate("/faculty/dashboard");
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Stage 3: Login with Password
    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API}/auth/faculty/password-login`, {
                email,
                password
            });

            localStorage.setItem("faculty_token", response.data.access_token);
            localStorage.setItem("faculty_id", response.data.faculty_id);
            
            toast.success("Login successful!");
            navigate("/faculty/dashboard");
        } catch (err) {
            toast.error("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    // Stage 4: Set New Password (Post-Registration)
    const handleSetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem("faculty_token");
            await axios.post(`${API}/auth/faculty/set-password`, 
                { password },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            toast.success("Password set successfully! Redirecting...");
            setTimeout(() => navigate("/faculty/dashboard"), 1500);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to set password. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container flex items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
                        <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Faculty Portal</h1>
                </div>

                <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">
                            {step === 1 && "Welcome Back"}
                            {step === 2 && "Email Verification"}
                            {step === 3 && "Professor Login"}
                            {step === 4 && "Set Password"}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {step === 1 && "Enter your college email to begin"}
                            {step === 2 && `Enter the code sent to ${email}`}
                            {step === 3 && "Secure access to your dashboard"}
                            {step === 4 && "Choose a strong password for future logins"}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="grid gap-4">
                        {step === 1 && (
                            <form onSubmit={handleCheckEmail} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Institute Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="profc@college.edu" 
                                            type="email" 
                                            className="pl-10"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailError) {
                                                    setEmailError("");
                                                }
                                            }}
                                            required 
                                        />
                                    </div>
                                    {emailError ? (
                                        <p className="text-sm font-medium text-red-600">{emailError}</p>
                                    ) : null}
                                </div>
                                <Button className="w-full h-11" type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Security Code</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="123456" 
                                            maxLength={6}
                                            className="pl-10 tracking-[0.5em] font-mono text-center"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button className="w-full h-11" type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
                                </Button>
                                <Button variant="ghost" className="w-full text-xs" onClick={() => setStep(1)}>Go Back</Button>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="••••••••" 
                                            type="password" 
                                            className="pl-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button className="w-full h-11" type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                                </Button>
                                <Button variant="ghost" className="w-full text-xs" onClick={() => setStep(1)}>Wait, use OTP instead</Button>
                            </form>
                        )}

                        {step === 4 && (
                            <form onSubmit={handleSetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Minimum 8 characters" 
                                            type="password" 
                                            className="pl-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button className="w-full h-11" type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Registration"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    
                    <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/20">
                        <div className="text-xs text-center text-muted-foreground uppercase font-bold tracking-widest">
                            Authorized Faculty Access Only
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default FacultyLogin;
