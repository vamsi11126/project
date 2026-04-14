import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import adminApi from "../api";

export default function AdminLayout({ children }) {
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/admin/papers", label: "Papers", icon: <FileText size={18} /> },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await adminApi.post("/auth/admin/logout");
    } catch {
      toast.error("Could not complete logout cleanly. Redirecting to login.");
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="w-full bg-gray-900 text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between md:justify-start gap-6">
        <h1 className="text-xl font-bold whitespace-nowrap">Admin Panel</h1>

        <button
          className="md:hidden ml-auto"
          onClick={() => setMobileNav(!mobileNav)}
          aria-label="Toggle admin navigation"
        >
          {mobileNav ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className="hidden md:flex items-center gap-6 ml-10">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                ${isActive(link.to)
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"}
              `}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex ml-auto">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </header>

      {mobileNav && (
        <nav className="md:hidden bg-gray-800 text-white px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileNav(false)}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm
                ${isActive(link.to)
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"}
              `}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}

          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2 mt-2"
          >
            <LogOut size={18} /> Logout
          </Button>
        </nav>
      )}

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
