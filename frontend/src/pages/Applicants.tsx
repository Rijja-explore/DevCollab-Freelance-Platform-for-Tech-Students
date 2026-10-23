import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  MessageSquare,
  FileText,
  Check,
  X,
  Lock,
} from 'lucide-react'
import { discoveryApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import toast from 'react-hot-toast'

interface ApplicantItem {
  id: string
  projectId: string
  project?: {
    title: string
    description: string
  }
  studentId: string
  student?: {
    fullName: string
  }
  startupId: string
  matchScore: number
  status: string
  matchedAt: string
}

interface StudentProfile {
  id: string
  userId?: string
  fullName?: string
}

export const Applicants: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const startupId = user?.profileId || user?.id || 'demo-startup-id'

  const [applicants, setApplicants] = useState<ApplicantItem[]>([])
  const [studentNames, setStudentNames] = useState<Record<string, string>>({})
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true)
      try {
        const res = await discoveryApi.getAllMatches()
        const data = res.data?.data ?? []
        const apps = Array.isArray(data) ? data : []
        setApplicants(apps)

        // Fetch student names for each applicant
        const names: Record<string, string> = {}
        const projNames: Record<string, string> = {}

        await Promise.all(
          apps.map(async (app) => {
            try {
              // Fetch student profile
              const studentRes = await discoveryApi.getStudentProfiles()
              const students: StudentProfile[] = Array.isArray(studentRes.data?.data)
                ? studentRes.data.data
                : []

              const student = students.find(
  (s: StudentProfile) =>
    s.id === app.studentId || s.userId === app.studentId
)

names[app.studentId] =
  student?.fullName ||
  `Student ${app.studentId.substring(0, 8)}`
            } catch (err) {
              console.error(
                `Failed to fetch student ${app.studentId}:`,
                err
              )
              names[app.studentId] =
                `Student ${app.studentId.substring(0, 8)}`
            }

            try {
              // Fetch project details
              const projRes = await discoveryApi.getProjectById(app.projectId)
              const project = projRes.data?.data ?? projRes.data ?? {}

              projNames[app.projectId] =
                project.title ||
                project.name ||
                `Project ${app.projectId.substring(0, 8)}`
            } catch (err) {
              console.error(
                `Failed to fetch project ${app.projectId}:`,
                err
              )
              projNames[app.projectId] =
                `Project ${app.projectId.substring(0, 8)}`
            }
          })
        )

        setStudentNames(names)
        setProjectNames(projNames)
      } catch (err) {
        console.error('Failed to load applicants', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApplicants()
  }, [startupId])

  const handleApprove = async (matchId: string) => {
    try {
      const res = await discoveryApi.approveMatch(matchId, startupId)
      toast.success(res.data?.data?.message || 'Application approved! Workspace and Escrow initialized.')
      setApplicants((prev) =>
        prev.map((app) => (app.id === matchId ? { ...app, status: 'ACCEPTED' } : app))
      )
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve application')
    }
  }

  const handleReject = async (matchId: string) => {
    try {
      const res = await discoveryApi.rejectMatch(matchId, startupId)
      toast.success(res.data?.data?.message || 'Application declined.')
      setApplicants((prev) =>
        prev.map((app) => (app.id === matchId ? { ...app, status: 'REJECTED' } : app))
      )
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject application')
    }
  }

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
                    {Number(app.matchScore).toFixed(0)}% Fit Score
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      app.status === 'ACCEPTED' || app.status === 'MATCHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : app.status === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {app.status === 'ACCEPTED' || app.status === 'MATCHED'
                      ? 'APPROVED'
                      : app.status === 'REJECTED'
                      ? 'DECLINED'
                      : 'PENDING APPROVAL'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                    {studentNames[app.studentId] ||
                      `Student ${app.studentId.substring(0, 8)}`}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2">
                    Applied for:{' '}
                    <span className="font-semibold text-slate-300">
                      {projectNames[app.projectId] ||
                        `Project ${app.projectId.substring(0, 8)}`}
                    </span>
                  </p>

                  <div className="mt-1 text-[10px] text-slate-500 font-mono">
                    Student ID: {app.studentId.substring(0, 8)}...

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(app.studentId)
                        toast.success('Student ID copied to clipboard')
                      }}
                      className="ml-2 px-1.5 py-0.5 text-[9px] bg-brand-500/20 hover:bg-brand-500/30 rounded border border-brand-500/30"
                    >
                      Copy
                    </button>

                    <div className="mt-1">
                      Project ID: {app.projectId.substring(0, 8)}...

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(app.projectId)
                          toast.success('Project ID copied to clipboard')
                        }}
                        className="ml-2 px-1.5 py-0.5 text-[9px] bg-indigo-500/20 hover:bg-indigo-500/30 rounded border border-indigo-500/30"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status-Gated Actions */}
              {app.status === 'ACCEPTED' || app.status === 'MATCHED' ? (
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <Link
                    to={`/workspaces/${app.projectId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat with Approved Candidate
                  </Link>

                  <Link
                    to="/contracts"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all border border-white/10"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Contract
                  </Link>
                </div>
              ) : app.status === 'REJECTED' ? (
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
                  <span>Application declined</span>
                  <button
                    type="button"
                    onClick={() => handleApprove(app.id)}
                    className="text-indigo-400 hover:underline text-[11px] font-semibold"
                  >
                    Re-approve
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(app.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(app.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>Direct messaging locked. Approving activates workspace & escrow.</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}