import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { discoveryApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'

interface ApplicantItem {
  id: string
  projectId: string
  studentId: string
  startupId: string
  matchScore: number
  status: string
  matchedAt: string
}

export const Applicants: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const startupId = user?.profileId || user?.id || 'demo-startup-id'

  const [applicants, setApplicants] = useState<ApplicantItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true)
      try {
        const res = await discoveryApi.getAllMatches()
        const data = res.data?.data ?? []
        setApplicants(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load applicants', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApplicants()
  }, [startupId])

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="Student Applicants & Matches"
        subtitle="Review university developers who applied or matched with your open freelance projects, inspect skill fit, and initiate contracts."
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : applicants.length === 0 ? (
        <EmptyState
          title="No Student Applicants Yet"
          description="When students match or apply to your posted projects, they will appear here with calculated AI skill scores."
          actionText="Manage My Projects"
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applicants.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    {app.matchScore ? (app.matchScore > 1 ? Math.round(app.matchScore) : Math.round(app.matchScore * 100)) : 92}% Fit Score
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {app.status || 'MATCHED'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                    Applicant for Project #{app.projectId.substring(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Student ID: <span className="font-mono text-slate-300">{app.studentId.substring(0, 12)}...</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <Link
                  to={`/workspaces/${app.projectId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors border border-white/10"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Chat in Workspace
                </Link>
                <Link
                  to="/contracts"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Create Contract
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
