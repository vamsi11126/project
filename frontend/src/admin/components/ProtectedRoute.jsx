import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const passcode = localStorage.getItem("admin_passcode");
  return passcode ? children : <Navigate to="/admin/login" />;
}
