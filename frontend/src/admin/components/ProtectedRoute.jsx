import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import adminApi from "../api";

export default function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        await adminApi.get("/auth/admin/me");
        if (isMounted) {
          setStatus("authorized");
        }
      } catch {
        if (isMounted) {
          setStatus("unauthorized");
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">
        Checking admin session...
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
