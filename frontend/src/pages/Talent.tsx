import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  DollarSign,
  Search,
  MessageSquare,
} from 'lucide-react'
import { discoveryApi } from '../api/client'
import { ServiceHeader } from '../components/ServiceHeader'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'

interface StudentProfile {
  id: string
  userId: string
  name: string
  headline?: string
  bio?: string
  hourlyRate?: number
  rating?: number
  skills?: string[]
}

export const Talent: React.FC = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true)
      try {
        const res = await discoveryApi.getStudentProfiles()
        const data = res.data?.data ?? []
        setProfiles(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load talent profiles', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  const filteredTalent = profiles.filter((p) => {
    const term = search.toLowerCase()
    const nameMatch = p.name?.toLowerCase().includes(term)
    const headlineMatch = p.headline?.toLowerCase().includes(term)
    const skillMatch = p.skills?.some((s) => s.toLowerCase().includes(term))
    return nameMatch || headlineMatch || skillMatch
  })

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="Find Top Student Talent"
        subtitle="Discover vetted computer science students, filter by technology skill matrices, and invite developers to collaborate."
      />

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, headline or skill (e.g. React, Spring Boot, Python)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : filteredTalent.length === 0 ? (
        <EmptyState
          title="No Student Developers Found"
          description="Try broadening your search query or check back as more students join DevCollab."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTalent.map((student) => (
            <div
              key={student.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-brand-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-indigo-600/20">
                    {student.name
                      ? student.name.split(' ').map((n) => n[0]).join('').toUpperCase()
                      : 'ST'}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {student.rating || 4.9}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {student.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {student.headline || 'Student Full-Stack Developer'}
                  </p>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {student.bio || 'Passionate university student building scalable web applications.'}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(student.skills || ['React', 'TypeScript', 'Node.js', 'PostgreSQL']).slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 text-slate-300 border border-white/5"
                    >
                      {skill}
                    </span>
                  ))}
                  {(student.skills?.length || 0) > 4 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 text-slate-400">
                      +{(student.skills?.length || 0) - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {student.hourlyRate || 35}/hr
                </div>
                <Link
                  to="/workspaces"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                >
                  <MessageSquare className="w-3 h-3" />
                  Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
