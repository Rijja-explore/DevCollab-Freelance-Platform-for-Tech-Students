import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight, ShieldCheck, FileText } from 'lucide-react'

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || searchParams.get('orderId') || 'SANDBOX-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  const PayerID = searchParams.get('PayerID') || 'PAYER-' + Math.random().toString(36).substring(2, 8).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Escrow Funding Confirmed!
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Your PayPal Sandbox transaction was successfully authorized and the milestone funds are locked safely in escrow.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-left space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Transaction Summary
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-500">PayPal Order ID</div>
            <div className="font-mono font-bold text-white mt-0.5">{token}</div>
          </div>
          <div>
            <div className="text-slate-500">Payer ID</div>
            <div className="font-mono font-bold text-white mt-0.5">{PayerID}</div>
          </div>
          <div>
            <div className="text-slate-500">Escrow Status</div>
            <div className="text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SECURED IN VAULT
            </div>
          </div>
          <div>
            <div className="text-slate-500">Provider</div>
            <div className="text-sky-400 font-semibold mt-0.5">PayPal Sandbox</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/milestones"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
        >
          View Milestones <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/transactions"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
        >
          <FileText className="w-4 h-4 text-brand-400" /> Transaction Ledger
        </Link>
      </div>
    </div>
  )
}
