import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");

  const login = async () => {
    try {
      const res = await axios.post(
        `${BACKEND}/api/admin/verify`,
        {},
        { headers: { "x-admin-passcode": passcode } }
      );

      if (res.data.status === "success") {
        localStorage.setItem("admin_passcode", passcode);
        toast.success("Admin login successful");
        window.location.href = "/admin/dashboard";
      }
    } catch {
      toast.error("Invalid admin passcode");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">

      {/* GLASS CARD */}
      <Card className="w-[380px] backdrop-blur-lg bg-white/10 border-white/20 shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-extrabold text-white">
            Admin Access
          </CardTitle>
          <p className="text-gray-300 text-sm mt-1">
            Enter the secure admin passcode
          </p>
        </CardHeader>

        <CardContent className="flex flex-col space-y-4 mt-2">
          <Input
            type="password"
            placeholder="Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="bg-white/20 text-white placeholder:text-gray-300 border-white/30 focus:border-white focus:ring-white"
          />

          <Button
            className="w-full py-2 text-md font-semibold bg-blue-600 hover:bg-blue-700"
            onClick={login}
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
