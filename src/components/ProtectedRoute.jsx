import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const hasAccess = allowedRoles.some(role => user.roles.includes(role));
  return hasAccess ? children : <Navigate to="/404" replace />;
}
