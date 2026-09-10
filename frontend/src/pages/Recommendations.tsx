import React, { useState, useEffect } from 'react'
import { discoveryApi } from '../api/client'
import { useApi } from '../hooks/useApi'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import { Sparkles, CheckCircle, ArrowRight, Zap, Trophy, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

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
  const studentId = '99999999-9999-9999-9999-999999999999' // Demo senior student
  const [matchingId, setMatchingId] = useState<string | null>(null)

  const {
    data: recsData,
    loading,
    execute: fetchRecommendations,
  } = useApi<any, [string]>(discoveryApi.getRecommendations)

  useEffect(() => {
    fetchRecommendations(studentId)
  }, [fetchRecommendations, studentId])

  const recommendations: Recommendation[] = recsData?.data ?? []

  const handleMatch = async (projectId: string) => {
    setMatchingId(projectId)
    try {
      const res = await discoveryApi.match(projectId, studentId)
      toast.success(res.data?.data?.message ?? 'Match confirmed! Workspace and Escrow initialized.')
      fetchRecommendations(studentId)
    } catch (err: any) {
      console.error(err)
      toast.error('Matching failed')
    } finally {
      setMatchingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card p-6 bg-gradient-to-r from-brand-900/40 via-purple-900/20 to-slate-900 border-brand-500/20 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            Algorithmic Matching Engine
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Personalized Project Matches
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Recommendations scored by skill vector overlap, student feedback ratings, and project category demand.
          </p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400 font-medium">Rank Algorithm</span>
            <div className="text-lg font-bold text-white">Jaccard Weighted</div>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations currently available"
          description="All open projects have either been matched or new projects are being published."
          actionText="Browse Projects"
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.project.id}
              className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-500/40 transition-all group"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    {rec.matchScore}% Match Score
                  </span>
                  <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                    {rec.project.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                  {rec.project.title}
                </h3>

                <p className="text-sm text-slate-300 line-clamp-2 max-w-3xl">
                  {rec.project.description}
                </p>

                {/* Matching Skills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-semibold">Matching:</span>
                  {rec.matchingSkills?.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3 text-brand-400" />
                      {skill}
                    </span>
                  ))}
                  {rec.project.requiredSkills?.filter(
                    (s) => !rec.matchingSkills?.map((m) => m.toLowerCase()).includes(s.toLowerCase()),
                  ).map((otherSkill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5"
                    >
                      {otherSkill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget & Action */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Escrow Budget
                  </span>
                  <span className="text-xl font-extrabold text-white flex items-center gap-0.5">
                    <DollarSign className="w-4 h-4 text-emerald-400 -mr-1" />
                    {rec.project.budget?.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {rec.project.currency}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => handleMatch(rec.project.id)}
                  disabled={matchingId === rec.project.id}
                  className="btn-primary text-xs flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                >
                  {matchingId === rec.project.id ? (
                    'Processing Match...'
                  ) : (
                    <>
                      Apply & Launch Escrow
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
