import React from 'react';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  width: '100%',
};

/**
 * LoadingSkeleton — animated shimmer placeholder blocks.
 * Uses the `.skeleton` CSS class defined in globals.css which applies
 * the `shimmer` keyframe animation.
 *
 * Props:
 *  lines   {number?} - Number of skeleton lines to render (default: 3)
 *  height  {string?} - Height of each skeleton block (default: '18px')
 */
export default function LoadingSkeleton({ lines = 3, height = '18px' }) {
  return (
    <div style={containerStyle} role="status" aria-label="Loading…" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="skeleton"
          style={{
            display: 'block',
            height,
            // Make lines slightly different widths for a natural look
            width: i === lines - 1 && lines > 1 ? '65%' : '100%',
          }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  );
}
