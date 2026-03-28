import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requireManager }) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  // no token = not logged in = back to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // manager-only pages
  if (requireManager && role !== "manager") {
    return <Navigate to="/pos" />;
  }

  return children;
}

export default ProtectedRoute;