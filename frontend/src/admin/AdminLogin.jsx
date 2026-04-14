import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import adminApi from "./api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await adminApi.get("/auth/admin/me");
        navigate("/admin/dashboard", { replace: true });
      } catch {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await adminApi.post("/auth/admin/login", {
        email,
        password,
      });
      toast.success("Admin login successful");
      const destination = location.state?.from?.pathname || "/admin/dashboard";
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-white text-sm tracking-wide">Checking admin session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <Card className="w-[420px] backdrop-blur-lg bg-white/10 border-white/20 shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-extrabold text-white">
            Admin Access
          </CardTitle>
          <p className="text-gray-300 text-sm mt-1">
            Sign in with your admin email and password
          </p>
        </CardHeader>

        <CardContent className="mt-2">
          <form className="flex flex-col space-y-4" onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-white/20 text-white placeholder:text-gray-300 border-white/30 focus:border-white focus:ring-white"
              autoComplete="email"
              required
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-white/20 text-white placeholder:text-gray-300 border-white/30 focus:border-white focus:ring-white"
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              className="w-full py-2 text-md font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
