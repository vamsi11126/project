import { Navigate, useLocation } from "react-router-dom";

/**
 * Common Protected Route for Faculty/Admin
 * Matches local storage keys for specific roles
 */
const ProtectedRoute = ({ children, role = "faculty" }) => {
    const location = useLocation();
    
    const token = localStorage.getItem(`${role}_token`);
    const id = localStorage.getItem(`${role}_id`);

    if (!token || !id) {
        // Redirect to appropriate login page based on role
        const loginPath = role === "admin" ? "/admin/login" : "/faculty/login";
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
