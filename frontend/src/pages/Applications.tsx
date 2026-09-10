import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import { discoveryApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'

interface ApplicationItem {
  id: string
  projectId: string
  studentId: string
  startupId: string
  matchScore: number
  status: string
  matchedAt: string
}

export const Applications: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = user?.profileId || user?.id || 'demo-student-id'

  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true)
      try {
        const res = await discoveryApi.getStudentMatches(studentId)
        const data = res.data?.data ?? []
        setApplications(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load applications', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [studentId])

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="My Applications & Matches"
        subtitle="Track the status of projects you have matched or applied to, view match ratings, and jump into live collaboration workspaces."
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No Project Applications Found"
          description="You haven't matched or applied to any projects yet. Discover exciting open gigs matching your skills in the catalog!"
          actionText="Discover Open Projects"
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    {app.matchScore ? (app.matchScore > 1 ? Math.round(app.matchScore) : Math.round(app.matchScore * 100)) : 90}% Match Score
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {app.status || 'MATCHED'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                    Project Application #{app.projectId.substring(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Application ID: <span className="font-mono text-slate-300">{app.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <Link
                  to={`/projects/${app.projectId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors border border-white/10"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  View Project
                </Link>
                <Link
                  to="/workspaces"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Open Workspace
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
