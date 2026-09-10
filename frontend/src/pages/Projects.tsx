import React, { useState, useEffect, useCallback } from 'react'
import { discoveryApi } from '../api/client'
import { useApi } from '../hooks/useApi'
import { StatusBadge } from '../components/StatusBadge'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import {
  Search,
  Plus,
  Compass,
  Sparkles,
  DollarSign,
  Tag,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface Project {
  id: string
  startupId: string
  title: string
  description: string
  category: string
  budget: number
  currency: string
  status: any
  requiredSkills: string[]
  createdAt: string
}

export const Projects: React.FC = () => {
  const navigate = useNavigate()
  const [category, setCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [matchingProjectId, setMatchingProjectId] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formCategory, setFormCategory] = useState('Web Development')
  const [budget, setBudget] = useState('')
  const [currency] = useState('USD')
  const [skillsInput, setSkillsInput] = useState('')

  const {
    data: projectsResponse,
    loading,
    execute: fetchProjects,
  } = useApi<any, [string?, string?]>(discoveryApi.getProjects)

  const loadProjects = useCallback(() => {
    if (searchQuery.trim()) {
      discoveryApi.search(searchQuery.trim()).then((res) => {
        setProjectsList(res.data?.data ?? [])
      })
    } else {
      const cat = category === 'ALL' ? undefined : category
      fetchProjects(cat, undefined)
    }
  }, [category, searchQuery, fetchProjects])

  const [projectsList, setProjectsList] = useState<Project[]>([])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (projectsResponse?.data) {
      setProjectsList(projectsResponse.data)
    }
  }, [projectsResponse])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await discoveryApi.createProject({
        title,
        description,
        category: formCategory,
        budget: parseFloat(budget),
        currency,
        requiredSkills: skills,
      })
      toast.success('Project created and indexed in Elasticsearch!')
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      setBudget('')
      setSkillsInput('')
      loadProjects()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to create project')
    }
  }

  const handleMatch = async (project: Project) => {
    setMatchingProjectId(project.id)
    try {
      const studentId = '99999999-9999-9999-9999-999999999999' // Demo student UUID
      const res = await discoveryApi.match(project.id, studentId)
      toast.success(
        res.data?.data?.message ??
          'Matched! Contract created in Escrow & Workspace initialized.',
        { duration: 5000 },
      )
      loadProjects()
    } catch (err: any) {
      console.error(err)
      toast.error('Matching failed')
    } finally {
      setMatchingProjectId(null)
    }
  }

  const categories = ['ALL', 'AI/ML', 'Web Development', 'Fintech', 'Mobile']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-400" />
            Project Discovery & Matching
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse freelance tech opportunities, search via Elasticsearch, and match in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/recommendations')}
            className="btn-secondary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            AI Match Suggestions
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Post New Project
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat)
                setSearchQuery('')
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search projects via Elasticsearch..."
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : projectsList.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try modifying your search or filter criteria, or post a new project."
          actionText="Post Project"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectsList.map((project) => (
            <div
              key={project.id}
              className="card p-6 flex flex-col justify-between hover:border-brand-500/30 transition-all group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {project.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2 group-hover:text-brand-300 transition-colors">
                      {project.title}
                    </h3>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.requiredSkills?.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-brand-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Budget
                  </span>
                  <span className="text-lg font-extrabold text-white flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-400 -mr-1" />
                    {project.budget?.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {project.currency}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {project.status === 'OPEN' ? (
                    <button
                      onClick={() => handleMatch(project)}
                      disabled={matchingProjectId === project.id}
                      className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3"
                    >
                      {matchingProjectId === project.id ? (
                        'Matching...'
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Match & Launch
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/contracts')}
                      className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
                    >
                      View Contract
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border-white/20">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Post a New Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish to Discovery and index immediately in Elasticsearch.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="label">Project Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js SaaS Authentication & Dashboard"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="AI/ML">AI/ML</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Mobile">Mobile</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>
                <div>
                  <label className="label">Budget (USD)</label>
                  <input
                    type="number"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Required Skills (comma separated)</label>
                <input
                  type="text"
                  required
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="React, TypeScript, Spring Boot, PostgreSQL"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Detailed Description & Scope</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope of work, technical requirements, and deliverable expectations..."
                  className="input py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Publish Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
