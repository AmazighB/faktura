import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { AppLayout } from '@/app/layouts/AppLayout';
import { isOnboardingComplete } from '@/utils/modules';

export function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isOnboardingComplete()) return <Navigate to="/onboarding" replace />;
  return <AppLayout />;
}