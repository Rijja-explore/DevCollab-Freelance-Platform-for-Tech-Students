import React, { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  /** When provided the stars become an input. */
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-6 h-6' }

export const StarRating: React.FC<StarRatingProps> = ({ value, onChange, size = 'sm' }) => {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value
  const interactive = Boolean(onChange)

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Choose a rating' : `${value.toFixed(1)} out of 5 stars`}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = shown >= star - 0.25
        const icon = (
          <Star
            className={`${SIZES[size]} ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
          />
        )
        return interactive ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange?.(star)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        )
      })}
    </div>
  )
}

/** "4.7 ★ (12 reviews)" or "No reviews yet" — the aggregate shown on cards. */
export const RatingBadge: React.FC<{ rating?: number; reviewCount?: number }> = ({ rating, reviewCount }) => {
  const count = reviewCount ?? 0
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[11px] font-semibold">
        <Star className="w-3 h-3" /> New
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
      <Star className="w-3.5 h-3.5 fill-amber-400" />
      {Number(rating ?? 0).toFixed(1)}
      <span className="text-amber-400/70 font-medium">({count})</span>
    </span>
  )
}
