import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/candidate'} replace />;
  }

  return children;
}
