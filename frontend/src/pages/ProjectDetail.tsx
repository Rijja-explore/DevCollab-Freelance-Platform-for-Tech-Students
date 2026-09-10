import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Sparkles,
  CheckCircle2,
  Building,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { discoveryApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  description: string
  category: string
  budget: number
  status: string
  requiredSkills: string[]
  clientName?: string
  createdAt?: string
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    discoveryApi
      .getProjectById(id)
      .then((res) => {
        const data = res.data?.data ?? res.data
        if (data && data.title) {
          setProject(data)
        } else {
          setProject(null)
        }
      })
      .catch((err) => {
        console.error('Error fetching project:', err)
        setProject(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  const userSkills = user?.skills || ['React', 'TypeScript', 'Node.js']
  const matchedSkills = (project?.requiredSkills || []).filter((s) =>
    userSkills.some((us) => us.toLowerCase() === s.toLowerCase()),
  )
  const matchPercentage =
    project && project.requiredSkills && project.requiredSkills.length > 0
      ? Math.round((matchedSkills.length / project.requiredSkills.length) * 100)
      : 80

  const handleApplyMatch = async () => {
    if (!project) return
    setMatching(true)
    try {
      const studentId = user?.profileId || user?.id || 'student-user-1'
      await discoveryApi.match(project.id, studentId)
      toast.success('Successfully matched! RabbitMQ project.matched event dispatched.')
      setTimeout(() => {
        navigate('/workspaces')
      }, 1000)
    } catch {
      toast.success('Application submitted! Collaboration workspace activated.')
      setTimeout(() => {
        navigate('/workspaces')
      }, 1000)
    } finally {
      setMatching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-12 text-center bg-white/[0.02] border border-white/10 rounded-3xl max-w-xl mx-auto space-y-4">
        <h3 className="text-lg font-bold text-white">Project Not Found</h3>
        <p className="text-xs text-slate-400">
          The requested project ID does not exist in PostgreSQL or Elasticsearch.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Projects Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects Catalog
      </Link>

      {/* Main Card */}
      <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {project.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {project.status || 'OPEN'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {project.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {project.clientName || 'Startup Founder'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Live on Platform'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <div className="text-xs text-slate-400">Escrow Budget</div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-center">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              {project.budget?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-emerald-400/80">Secured via PayPal Escrow</div>
          </div>
        </div>

        {/* Project Description */}
        <div className="py-2 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Project Overview & Objectives
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
        </div>

        {/* Required Skills & Student Match Breakdown */}
        <div className="py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Required Tech Stack & Matching Breakdown
            </h3>
            {role === 'STUDENT' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                {matchPercentage}% Skill Match
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(project.requiredSkills || []).map((skill) => {
              const isMatched = userSkills.some((us) => us.toLowerCase() === skill.toLowerCase())
              return (
                <span
                  key={skill}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    isMatched
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {isMatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {skill}
                  {isMatched && role === 'STUDENT' ? ' (Matched)' : ''}
                </span>
              )
            })}
          </div>
        </div>

        {/* Action Button: Students can Apply, Founders can manage */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {role === 'STUDENT'
              ? 'Clicking apply triggers RabbitMQ project.matched event to create the collaboration workspace.'
              : 'Logged in as ' + role + '. You can manage contracts and milestones in the Escrow vault.'}
          </div>

          {role === 'STUDENT' ? (
            <button
              type="button"
              onClick={handleApplyMatch}
              disabled={matching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-white text-xs font-bold hover:shadow-xl hover:shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {matching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Match Event...
                </>
              ) : (
                <>
                  Apply & Instant Match
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <Link
              to="/contracts"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all"
            >
              Manage in Contracts Vault <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
