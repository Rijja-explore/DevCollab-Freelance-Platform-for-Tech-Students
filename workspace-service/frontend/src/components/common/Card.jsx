/**
 * Card Component
 *
 * Glassmorphism wrapper container.
 * Applies: background rgba(255,255,255,0.04), backdrop-filter blur(12px),
 *          border 1px solid rgba(255,255,255,0.08), border-radius 16px.
 *
 * Props:
 *   children   - content to render inside the card
 *   className  - additional CSS classes to merge (allows overrides)
 *   style      - additional inline styles
 *
 * Requirements: 12.3
 */
function Card({ children, className = '', style, ...rest }) {
  const classes = ['glass-card', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...rest}>
      {children}
    </div>
  );
}

export default Card;
