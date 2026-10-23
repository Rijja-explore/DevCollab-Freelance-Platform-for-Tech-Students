import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, MapPin, SlidersHorizontal, X, Sparkles, DollarSign } from 'lucide-react'
import { discoveryApi, TalentSearchParams } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { ServiceHeader } from '../components/ServiceHeader'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import { RatingBadge } from '../components/StarRating'
import {
  StudentProfileModal,
  StudentProfileData,
  AvailabilityPill,
  AVAILABILITY_LABELS,
  displayName,
} from '../components/StudentProfileModal'
import { getViewedProfiles, recordProfileView } from '../utils/viewedProfiles'

interface SimilarStudent {
  student: StudentProfileData
  similarityScore: number
  sharedSkills: string[]
}

const QUICK_SKILLS = ['React', 'TypeScript', 'Node.js', 'Python', 'Java', 'Spring Boot', 'PostgreSQL', 'AWS', 'Docker', 'Machine Learning']
const PAGE_SIZE = 12

/** Delays updates of fast-changing inputs (typing) before they hit the API. */
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export const Talent: React.FC = () => {
  const { user } = useAuth()

  // Filters
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [allSkills, setAllSkills] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [availability, setAvailability] = useState<string[]>([])
  const [sort, setSort] = useState('rating:desc')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)

  // Results
  const [profiles, setProfiles] = useState<StudentProfileData[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<StudentProfileData | null>(null)
  const [viewedIds, setViewedIds] = useState<string[]>(() => getViewedProfiles(user?.id))
  const [fromViews, setFromViews] = useState<SimilarStudent[]>([])

  const debouncedSearch = useDebounced(search)
  const debouncedLocation = useDebounced(location)
  const debouncedMinRate = useDebounced(minRate)
  const debouncedMaxRate = useDebounced(maxRate)

  const params: TalentSearchParams = useMemo(() => {
    const [sortBy, sortDirection] = sort.split(':') as [TalentSearchParams['sortBy'], 'asc' | 'desc']
    return {
      q: debouncedSearch.trim() || undefined,
      location: debouncedLocation.trim() || undefined,
      skills: skills.length ? skills : undefined,
      allSkills: skills.length > 1 ? allSkills : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      minHourlyRate: debouncedMinRate ? Number(debouncedMinRate) : undefined,
      maxHourlyRate: debouncedMaxRate ? Number(debouncedMaxRate) : undefined,
      availability: availability.length ? availability : undefined,
      sortBy,
      sortDirection,
      size: PAGE_SIZE,
    }
  }, [debouncedSearch, debouncedLocation, skills, allSkills, minRating, debouncedMinRate, debouncedMaxRate, availability, sort])

  // Any filter change returns to the first page
  useEffect(() => setPage(0), [params])

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await discoveryApi.advancedSearchTalent({ ...params, page })
      const data = res.data?.data ?? []
      setProfiles(Array.isArray(data) ? data : [])
      setTotalElements(res.data?.totalElements ?? 0)
      setTotalPages(res.data?.totalPages ?? 0)
    } catch (err) {
      console.error('Failed to load talent profiles', err)
      setError('Could not load student profiles. Please try again.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [params, page])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  useEffect(() => {
    if (viewedIds.length === 0) {
      setFromViews([])
      return
    }
    discoveryApi
      .getStudentsFromViews(viewedIds, 4)
      .then((res) => setFromViews(res.data?.data ?? []))
      .catch(() => setFromViews([]))
  }, [viewedIds])

  const openProfile = (profile: StudentProfileData) => {
    setSelected(profile)
    setViewedIds(recordProfileView(profile.id, user?.id))
  }

  const toggleSkill = (skill: string) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))

  const toggleAvailability = (value: string) =>
    setAvailability((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const activeFilterCount =
    skills.length + availability.length + (minRating > 0 ? 1 : 0) + (minRate ? 1 : 0) + (maxRate ? 1 : 0) + (location ? 1 : 0)

  const clearFilters = () => {
    setSkills([])
    setAllSkills(false)
    setMinRating(0)
    setMinRate('')
    setMaxRate('')
    setAvailability([])
    setLocation('')
  }

  return (
    <div className="space-y-6">
      <ServiceHeader
        service="discovery"
        title="Find Top Student Talent"
        subtitle="Search student developers by skill, location, hourly rate, rating and availability. Ratings are aggregated from verified startup reviews."
      />

      {/* Search + location + sort */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, headline, bio or skill…"
            aria-label="Search talent"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="relative lg:w-56">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. Remote, Pune)"
            aria-label="Filter by location"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort results"
          className="lg:w-48 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="rating:desc">Highest rated</option>
          <option value="reviewCount:desc">Most reviewed</option>
          <option value="hourlyRate:asc">Lowest rate</option>
          <option value="hourlyRate:desc">Highest rate</option>
          <option value="fullName:asc">Name A–Z</option>
        </select>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold hover:bg-white/10"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      </div>

      {showFilters && (
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Skills</span>
              {skills.length > 1 && (
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={allSkills} onChange={(e) => setAllSkills(e.target.checked)} />
                  Must have all
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...QUICK_SKILLS, ...skills])).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  aria-pressed={skills.includes(skill)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    skills.includes(skill)
                      ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-200'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add another skill and press Enter"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              onKeyDown={(e) => {
                const value = (e.target as HTMLInputElement).value.trim()
                if (e.key === 'Enter' && value) {
                  if (!skills.includes(value)) setSkills([...skills, value])
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hourly rate (USD)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
                placeholder="Min"
                aria-label="Minimum hourly rate"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500">–</span>
              <input
                type="number"
                min={0}
                value={maxRate}
                onChange={(e) => setMaxRate(e.target.value)}
                placeholder="Max"
                aria-label="Maximum hourly rate"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block pt-2">Minimum rating</span>
            <div className="flex gap-1.5">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMinRating(r)}
                  aria-pressed={minRating === r}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                    minRating === r
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {r === 0 ? 'Any' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Availability</span>
            {Object.entries(AVAILABILITY_LABELS).map(([value, meta]) => (
              <label key={value} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={availability.includes(value)} onChange={() => toggleAvailability(value)} />
                {meta.label}
              </label>
            ))}
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-1 pt-2">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recommendations from viewing history */}
      {fromViews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Similar to profiles you viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fromViews.map(({ student, similarityScore, sharedSkills }) => (
              <button
                key={student.id}
                type="button"
                onClick={() => openProfile(student)}
                className="text-left p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white truncate">{displayName(student)}</span>
                  <span className="text-[10px] font-bold text-indigo-300 shrink-0">{Math.round(similarityScore)}%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{sharedSkills.slice(0, 3).join(' · ')}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400" aria-live="polite">
        {!loading && !error && `${totalElements} student${totalElements === 1 ? '' : 's'} found`}
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <EmptyState title="Something went wrong" description={error} actionText="Retry" onAction={fetchProfiles} />
      ) : profiles.length === 0 ? (
        <EmptyState
          title="No student developers match these filters"
          description="Try removing a filter or broadening your search."
          actionText={activeFilterCount > 0 ? 'Clear filters' : undefined}
          onAction={activeFilterCount > 0 ? clearFilters : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((student) => (
            <div
              key={student.id}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-brand-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-indigo-600/20">
                    {displayName(student).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <RatingBadge rating={student.rating} reviewCount={student.reviewCount} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {displayName(student)}
                  </h3>
                  {student.headline && <p className="text-xs text-slate-400 mt-0.5">{student.headline}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AvailabilityPill value={student.availability} />
                  {student.location && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3" /> {student.location}
                    </span>
                  )}
                </div>

                {student.bio && <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{student.bio}</p>}

                {(student.skills?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {student.skills!.slice(0, 4).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 text-slate-300 border border-white/5">
                        {skill}
                      </span>
                    ))}
                    {student.skills!.length > 4 && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 text-slate-400">
                        +{student.skills!.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs font-semibold text-emerald-400 flex items-center">
                  {student.hourlyRate != null && (
                    <>
                      <DollarSign className="w-3.5 h-3.5" />
                      {Number(student.hourlyRate).toFixed(0)}
                      <span className="text-slate-500 font-medium">/hr</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openProfile(student)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10"
                >
                  View profile & reviews
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1 px-3 text-xs">
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary py-1 px-3 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <StudentProfileModal
          student={selected}
          onClose={() => setSelected(null)}
          onSelectStudent={openProfile}
          onRatingChanged={fetchProfiles}
        />
      )}
    </div>
  )
}
