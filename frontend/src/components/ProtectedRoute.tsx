import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, UserRole } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Verifying Session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const currentRole = ((role || user?.role || 'STUDENT') as string).toUpperCase()
  if (allowedRoles && !allowedRoles.map((r) => r.toUpperCase()).includes(currentRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
