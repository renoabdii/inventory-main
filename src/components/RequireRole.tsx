import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: string[];
}

const RequireRole = ({ children, allowedRoles }: RequireRoleProps) => {
  const location = useLocation();

  let userRole: string | null = null;
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      userRole = parsed?.role ?? null;
    }
  } catch {
    userRole = null;
  }

  if (!userRole) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(userRole)) {
    if (userRole === "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === "kasir") {
      return <Navigate to="/kasir" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
