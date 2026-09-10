import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth, UserRole } from '../contexts/AuthContext'
import { ShieldAlert, LayoutDashboard } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth()
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

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.03] border border-rose-500/30 backdrop-blur-xl text-center space-y-5 shadow-2xl shadow-rose-500/5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Access Restricted</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This area is restricted to <span className="text-brand-300 font-semibold">{allowedRoles.join(' or ')}</span> accounts.
              Your active role is <span className="text-rose-400 font-semibold">{role}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
            >
              <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
