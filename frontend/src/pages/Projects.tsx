import React, { useState, useEffect, useCallback } from 'react'
import { discoveryApi } from '../api/client'
import { StatusBadge } from '../components/StatusBadge'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import {
  Search,
  Plus,
  DollarSign,
  ArrowRight,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'


interface Project {
  id: string
  startupId?: string
  title: string
  description: string
  category: string
  budget: number
  currency: string
  status: any
  requiredSkills: string[]
  createdAt: string
}

export const Projects: React.FC<{ defaultOpenModal?: boolean }> = ({ defaultOpenModal = false }) => {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [category, setCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(defaultOpenModal)
  const [loading, setLoading] = useState(true)
  const [projectsList, setProjectsList] = useState<Project[]>([])

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formCategory, setFormCategory] = useState('Web Development')
  const [budget, setBudget] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      if (searchQuery.trim()) {
        const res = await discoveryApi.search(searchQuery.trim())
        const data = res.data?.data ?? res.data ?? []
        setProjectsList(Array.isArray(data) ? data : [])
      } else {
        const cat = category === 'ALL' ? undefined : category
        const res = await discoveryApi.getProjects(cat, undefined)
        const data = res.data?.data ?? res.data ?? []
        setProjectsList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error loading projects:', err)
      setProjectsList([])
    } finally {
      setLoading(false)
    }
  }, [category, searchQuery])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !budget) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await discoveryApi.createProject({
        startupId: user?.id || 'startup-owner-1',
        title,
        description,
        category: formCategory,
        budget: parseFloat(budget),
        currency: 'USD',
        requiredSkills: skills.length > 0 ? skills : ['React', 'TypeScript'],
      })

      toast.success('Project created and indexed in Elasticsearch!')
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      setBudget('')
      setSkillsInput('')
      loadProjects()
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create project'
      toast.error(errorMsg)
      console.error('Project creation failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const categories = [
    'ALL',
    'Web Development',
    'Mobile Development',
    'AI / Machine Learning',
    'DevOps & Cloud',
    'Cybersecurity',
    'UI/UX Design',
  ]

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="Projects & Opportunities"
        subtitle="Browse, filter, and search freelance software projects indexed across PostgreSQL & Elasticsearch 8.11."
        action={
          (role === 'STARTUP' || role === 'ADMIN') ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" /> Post New Project
            </button>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, description or tech stack (e.g. Next.js, FastAPI)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-slate-900 text-white">
              {c === 'ALL' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>

      {/* Project Grid */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : projectsList.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try adjusting your search criteria or filter, or post a new project."
          actionText={role !== 'STUDENT' ? 'Post Project' : undefined}
          onAction={role !== 'STUDENT' ? () => setShowCreateModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectsList.map((project) => (
            <div
              key={project.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand-500/30 transition-all backdrop-blur-xl flex flex-col justify-between group shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {project.category}
                  </span>
                  <StatusBadge status={project.status || 'OPEN'} />
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                  {project.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(project.requiredSkills || []).slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {(project.requiredSkills || []).length > 4 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                      +{(project.requiredSkills || []).length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span>{project.budget?.toLocaleString()} {project.currency || 'USD'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-white transition-colors"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Post New Project</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js & GraphQL Freelance Dashboard"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Budget ($ USD)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1200"
                    required
                    min="50"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Detailed requirements, deliverables, and expectations..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="React, TypeScript, Spring Boot, MySQL"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
