import React from 'react'
import { Link } from 'react-router-dom'
import { XCircle, ArrowLeft } from 'lucide-react'

export const PaymentCancel: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20">
        <XCircle className="w-10 h-10" />
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Payment Authorization Cancelled
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          The PayPal checkout window was closed or cancelled. No charges were made to your account.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/milestones"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Milestones
        </Link>
        <Link
          to="/dashboard"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
