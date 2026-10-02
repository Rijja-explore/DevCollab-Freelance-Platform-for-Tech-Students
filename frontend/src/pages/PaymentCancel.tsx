import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { milestonesApi } from '../api/client'

export const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [retrying, setRetrying] = useState(false)
  
  const milestoneId = searchParams.get('milestoneId')
  const milestoneTitle = searchParams.get('title')
  const amount = searchParams.get('amount')

  const handleRetry = async () => {
    if (!milestoneId) {
      toast.error('Milestone ID not found. Please go back to Milestones.')
      return
    }

    setRetrying(true)
    try {
      // Refetch the milestone to get latest payment status
      const res = await milestonesApi.getById(milestoneId)
      const milestone = res.data?.data || res.data
      
      if (!milestone) {
        toast.error('Milestone not found')
        return
      }

      // Redirect back to milestones page with success message
      toast.success('Ready to retry payment. Going back to Milestones...')
      window.location.href = '/milestones'
    } catch (err: any) {
      console.error('Error retrying payment:', err)
      toast.error(err.response?.data?.message || 'Failed to retry payment')
    } finally {
      setRetrying(false)
    }
  }

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
        
        {milestoneTitle && amount && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-slate-400">Milestone:</p>
            <p className="text-sm font-semibold text-white">{milestoneTitle}</p>
            <p className="text-xs text-brand-400 mt-1">${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleRetry}
          disabled={retrying || !milestoneId}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/20"
        >
          <RotateCcw className="w-4 h-4" /> 
          {retrying ? 'Retrying...' : 'Try Payment Again'}
        </button>
        <Link
          to="/milestones"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-500/20 border border-slate-500/30 text-white text-xs font-bold hover:bg-slate-500/30 transition-all"
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
