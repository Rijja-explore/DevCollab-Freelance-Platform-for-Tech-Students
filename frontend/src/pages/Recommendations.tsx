import React, { useState, useEffect } from 'react'
import { discoveryApi } from '../api/client'
import { useApi } from '../hooks/useApi'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import { Sparkles, CheckCircle, ArrowRight, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'

interface Recommendation {
  project: {
    id: string
    title: string
    description: string
    category: string
    budget: number
    currency: string
    status: string
    requiredSkills: string[]
  }
  matchScore: number
  matchingSkills: string[]
}

export const Recommendations: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = user?.profileId || user?.id || 'demo-student-id'
  const [matchingId, setMatchingId] = useState<string | null>(null)

  const {
    data: recsData,
    loading,
    execute: fetchRecommendations,
  } = useApi<any, [string]>(discoveryApi.getRecommendations)

  useEffect(() => {
    fetchRecommendations(studentId)
  }, [fetchRecommendations, studentId])

  const recommendations: Recommendation[] = recsData?.data ?? (Array.isArray(recsData) ? recsData : [])

  const handleMatch = async (projectId: string) => {
    setMatchingId(projectId)
    try {
      const res = await discoveryApi.match(projectId, studentId)
      toast.success(res.data?.data?.message ?? 'Match confirmed! Workspace and Escrow initialized.')
      fetchRecommendations(studentId)
      navigate('/workspaces')
    } catch (err: any) {
      console.error(err)
      toast.error('Matching failed')
    } finally {
      setMatchingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="AI-Powered Skill Matches"
        subtitle="Algorithmic project recommendations computed from your developer skill vector, rating history, and Elasticsearch 8.11 full-text indexes."
      />

      {/* Recommendations List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations currently available"
          description="Projects matching your skill matrix will appear here automatically as startups post new opportunities."
          actionText="Browse Open Projects"
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.project.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-500/40 transition-all group backdrop-blur-xl shadow-xl"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {rec.matchScore ? Math.round(rec.matchScore * 100) : 85}% Skill Match
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{rec.project.category}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                    {rec.project.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {rec.project.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {rec.matchingSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium"
                    >
                      <CheckCircle className="w-3 h-3 text-brand-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Escrow Value</span>
                  <div className="text-xl font-extrabold text-white flex items-center justify-end">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    {rec.project.budget?.toLocaleString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMatch(rec.project.id)}
                  disabled={matchingId === rec.project.id}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {matchingId === rec.project.id ? 'Connecting...' : 'Apply & Match'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
