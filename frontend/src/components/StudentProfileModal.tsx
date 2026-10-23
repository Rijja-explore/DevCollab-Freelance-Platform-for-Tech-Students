import React, { useCallback, useEffect, useState } from 'react'
import { X, MapPin, Clock, DollarSign, Users, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { discoveryApi } from '../api/client'
import { apiErrorMessage } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { StarRating, RatingBadge } from './StarRating'

export interface StudentProfileData {
  id: string
  userId?: string
  fullName?: string
  name?: string
  headline?: string
  bio?: string
  rating?: number
  reviewCount?: number
  hourlyRate?: number
  location?: string
  availability?: string
  skills?: string[]
}

interface Review {
  id: string
  reviewerId: string
  reviewerName: string
  rating: number
  title?: string
  comment?: string
  createdAt?: string
}

interface ReviewSummary {
  averageRating: number
  totalReviews: number
  ratingDistribution: Record<string, number>
}

interface SimilarStudent {
  student: StudentProfileData
  similarityScore: number
  sharedSkills: string[]
}

export const AVAILABILITY_LABELS: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available now', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  PART_TIME: { label: 'Part-time', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  UNAVAILABLE: { label: 'Unavailable', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

export const AvailabilityPill: React.FC<{ value?: string }> = ({ value }) => {
  const meta = AVAILABILITY_LABELS[value || 'AVAILABLE'] ?? AVAILABILITY_LABELS.AVAILABLE
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${meta.className}`}>
      <Clock className="w-3 h-3" /> {meta.label}
    </span>
  )
}

export const displayName = (p: StudentProfileData) => p.fullName || p.name || 'Student Developer'

interface Props {
  student: StudentProfileData
  onClose: () => void
  onSelectStudent: (student: StudentProfileData) => void
  /** Called after a review is added/removed so lists can refresh the aggregate rating. */
  onRatingChanged?: () => void
}

export const StudentProfileModal: React.FC<Props> = ({ student, onClose, onSelectStudent, onRatingChanged }) => {
  const { user, role } = useAuth()
  const canReview = role === 'STARTUP' || role === 'ADMIN'

  const [profile, setProfile] = useState<StudentProfileData>(student)
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewPage, setReviewPage] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  const [similar, setSimilar] = useState<SimilarStudent[]>([])
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadReviews = useCallback(async (page: number) => {
    const res = await discoveryApi.getReviews(student.id, page, 5)
    const list: Review[] = res.data?.data ?? []
    setReviews((prev) => (page === 0 ? list : [...prev, ...list]))
    setReviewPage(page)
    setHasMoreReviews(page + 1 < (res.data?.totalPages ?? 0))
  }, [student.id])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, summaryRes, similarRes] = await Promise.allSettled([
        discoveryApi.getStudentProfile(student.id),
        discoveryApi.getReviewSummary(student.id),
        discoveryApi.getSimilarStudents(student.id, 4),
      ])
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data) setProfile(profileRes.value.data.data)
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data?.data ?? null)
      if (similarRes.status === 'fulfilled') {
        const list: SimilarStudent[] = similarRes.value.data?.data ?? []
        setSimilar(list.filter((s) => s.similarityScore > 0))
      }
      await loadReviews(0)
    } catch (err) {
      console.error('Failed to load profile details', err)
    } finally {
      setLoading(false)
    }
  }, [student.id, loadReviews])

  useEffect(() => {
    setProfile(student)
    setRating(0)
    setTitle('')
    setComment('')
    loadAll()
  }, [student, loadAll])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const alreadyReviewed = reviews.some((r) => r.reviewerId === user?.id)

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Please sign in to leave a review')
      return
    }
    if (rating < 1) {
      toast.error('Please choose a star rating')
      return
    }
    setSubmitting(true)
    try {
      await discoveryApi.addReview(student.id, {
        reviewerId: user.id,
        reviewerName: user.name || user.email,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      })
      toast.success('Review posted — thanks for the feedback!')
      setRating(0)
      setTitle('')
      setComment('')
      await loadAll()
      onRatingChanged?.()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not post review'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await discoveryApi.deleteReview(reviewId)
      toast.success('Review removed')
      await loadAll()
      onRatingChanged?.()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove review'))
    }
  }

  const total = summary?.totalReviews ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName(profile)} profile`}
    >
      <div className="card w-full max-w-3xl p-6 relative my-8" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-brand-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
            {displayName(profile).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl font-bold text-white">{displayName(profile)}</h2>
            {profile.headline && <p className="text-sm text-slate-400">{profile.headline}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <RatingBadge rating={profile.rating} reviewCount={profile.reviewCount} />
              <AvailabilityPill value={profile.availability} />
              {profile.location && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5" /> {profile.location}
                </span>
              )}
              {profile.hourlyRate != null && (
                <span className="inline-flex items-center gap-0.5 text-xs text-slate-300 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  {Number(profile.hourlyRate).toFixed(0)}/hr
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.bio && <p className="text-sm text-slate-300 mt-5 leading-relaxed">{profile.bio}</p>}

        {(profile.skills?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {profile.skills!.map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white/5 text-slate-300 border border-white/10">
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6 pt-6 border-t border-white/10">
          {/* Rating summary */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ratings</h3>
            {loading && !summary ? (
              <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
            ) : total === 0 ? (
              <p className="text-sm text-slate-400">No reviews yet.</p>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-extrabold text-white leading-none">{summary!.averageRating.toFixed(1)}</span>
                  <div className="pb-0.5">
                    <StarRating value={summary!.averageRating} />
                    <div className="text-[11px] text-slate-400 mt-0.5">{total} review{total === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = Number(summary!.ratingDistribution?.[star] ?? 0)
                    const pct = total ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="w-3 text-right">{star}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {canReview && (
              <form onSubmit={handleSubmitReview} className="space-y-2.5 pt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave a review</h3>
                {alreadyReviewed ? (
                  <p className="text-xs text-slate-400">You have already reviewed this student.</p>
                ) : (
                  <>
                    <StarRating value={rating} onChange={setRating} size="lg" />
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={255}
                      placeholder="Headline (optional)"
                      className="input text-xs"
                    />
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={5000}
                      rows={3}
                      placeholder="How was working with this student?"
                      className="input text-xs py-2"
                    />
                    <button type="submit" disabled={submitting || rating < 1} className="btn-primary w-full text-xs">
                      {submitting ? 'Posting…' : 'Post review'}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Review list */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reviews</h3>
            {reviews.length === 0 && !loading && (
              <p className="text-sm text-slate-500">This student hasn't been reviewed yet.</p>
            )}
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <StarRating value={r.rating} />
                    <div className="flex items-center gap-2">
                      {r.createdAt && (
                        <span className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                        </span>
                      )}
                      {(r.reviewerId === user?.id || role === 'ADMIN') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(r.id)}
                          className="text-slate-500 hover:text-red-400"
                          aria-label="Delete review"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.title && <div className="text-sm font-semibold text-white mt-1.5">{r.title}</div>}
                  {r.comment && <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line">{r.comment}</p>}
                  <div className="text-[10px] text-slate-500 mt-2">— {r.reviewerName}</div>
                </div>
              ))}
            </div>
            {hasMoreReviews && (
              <button type="button" onClick={() => loadReviews(reviewPage + 1)} className="btn-secondary w-full text-xs py-1.5">
                Show more reviews
              </button>
            )}
          </div>
        </div>

        {/* Similar freelancers */}
        {similar.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5" /> Similar freelancers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similar.map(({ student: s, similarityScore, sharedSkills }) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStudent(s)}
                  className="text-left p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{displayName(s)}</span>
                    <span className="text-[10px] font-bold text-indigo-300">{Math.round(similarityScore)}% match</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {sharedSkills.length ? `Shared: ${sharedSkills.slice(0, 4).join(', ')}` : s.headline}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
