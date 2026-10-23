import React from 'react'
import { BookOpen, CheckCircle2, CircleAlert, ExternalLink, X } from 'lucide-react'

export interface SkillGapAnalysis {
  projectTitle: string
  studentSkills: string[]
  requiredSkills: string[]
  matchedSkills: string[]
  missingSkills: string[]
  coverage: number
  severity: string
  explanations: string[]
  recommendations: Array<{
    courseId: string
    title: string
    skill: string
    provider: string
    durationHours: number
    price: number
    currency: string
    difficulty: string
    url: string
    reason: string
    resourceType: string
    viewCount: number
    itemCount: number
  }>
}

interface SkillGapPanelProps {
  analysis: SkillGapAnalysis
  onClose: () => void
}

const severityStyles: Record<string, string> = {
  NONE: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  LOW: 'text-lime-300 bg-lime-500/10 border-lime-500/20',
  MEDIUM: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  HIGH: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

export const SkillGapPanel: React.FC<SkillGapPanelProps> = ({ analysis, onClose }) => {
  const coveragePercent = Math.round(analysis.coverage * 100)
  const severityClass = severityStyles[analysis.severity] ?? severityStyles.MEDIUM

  return (
    <section className="border-t border-white/10 pt-6 space-y-5" aria-labelledby="skill-gap-title">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-300 mb-2">
            <CircleAlert className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Skill gap analysis</span>
          </div>
          <h2 id="skill-gap-title" className="text-lg font-bold text-white">Your readiness for {analysis.projectTitle}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close skill gap analysis" className="self-end sm:self-start p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Coverage</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{coveragePercent}%</p>
        </div>
        <div className={`rounded-xl border p-4 ${severityClass}`}>
          <p className="text-[10px] uppercase tracking-wider opacity-70">Severity</p>
          <p className="mt-1 text-2xl font-extrabold">{analysis.severity}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Missing skills</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{analysis.missingSkills.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your current skills</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {analysis.studentSkills.length === 0 ? (
                <p className="text-xs text-slate-500">No skills are saved on your student profile yet.</p>
              ) : analysis.studentSkills.map((skill) => {
                const matched = analysis.matchedSkills.some((required) => required.toLowerCase() === skill.toLowerCase())
                return (
                  <span key={skill} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${matched ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-slate-300'}`}>
                    {matched && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {skill}
                  </span>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Project requirements</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {analysis.requiredSkills.map((skill) => {
                const matched = analysis.matchedSkills.includes(skill)
                return (
                  <span key={skill} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${matched ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}`}>
                    {matched && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {skill}
                  </span>
                )
              })}
            </div>
          </div>

          {analysis.explanations.length > 0 && (
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">Learning priorities</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Focus next on <span className="font-semibold text-slate-200">{analysis.missingSkills.join(', ')}</span> to meet this project&apos;s requirements.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommended learning</h3>
          {analysis.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">No learning resources match the missing skills yet.</p>
          ) : (
            <div className="space-y-2">
              {analysis.recommendations.map((course) => (
                <a key={course.courseId} href={course.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-brand-500/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-brand-300" />
                        <h4 className="text-xs font-bold text-white">{course.title}</h4>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{course.provider} · {course.resourceType} · {course.difficulty} · {course.price === 0 ? 'Free' : `${course.currency} ${course.price}`}</p>
                      <p className="mt-1 text-[11px] text-brand-300/80">Covers: {course.skill}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}