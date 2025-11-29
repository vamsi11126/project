import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Book,
  Inbox,
  LogOut,
} from "lucide-react";

export default function AdminLayout({ children }) {
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/admin/papers", label: "Papers", icon: <FileText size={18} /> },
    { to: "/admin/materials", label: "Materials", icon: <Book size={18} /> },
    { to: "/admin/requests", label: "Requests", icon: <Inbox size={18} /> },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem("admin_passcode");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      {/* 🔷 MAIN NAVBAR (Desktop + Mobile) */}
      <header className="w-full bg-gray-900 text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between md:justify-start gap-6">

        {/* LEFT: Admin Panel Heading */}
        <h1 className="text-xl font-bold whitespace-nowrap">Admin Panel</h1>

        {/* MOBILE MENU ICON */}
        <button
          className="md:hidden ml-auto"
          onClick={() => setMobileNav(!mobileNav)}
        >
          {mobileNav ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* DESKTOP NAV LINKS */}
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

        {/* DESKTOP LOGOUT BUTTON */}
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

      {/* 🔷 MOBILE DROPDOWN */}
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

          {/* MOBILE LOGOUT */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2 mt-2"
          >
            <LogOut size={18} /> Logout
          </Button>
        </nav>
      )}

      {/* 🔷 MAIN CONTENT */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
