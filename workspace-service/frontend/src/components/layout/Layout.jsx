import Sidebar from './Sidebar';
import Navbar from './Navbar';

/**
 * Layout — top-level page wrapper rendered for every route.
 *
 * Structure:
 *  - Animated mesh background: three colour orbs (teal / violet / coral)
 *    using the `.mesh-orb` CSS classes defined in globals.css.
 *  - Dot-grid overlay via `.dot-grid-overlay` CSS class from globals.css.
 *  - `<Sidebar />` fixed to the left edge.
 *  - Right column: `<Navbar />` at the top + `<main>` below for page content.
 *
 * Requirements: 11.4
 */

const shellStyle = {
  display: 'flex',
  minHeight: '100vh',
};

const rightColumnStyle = {
  marginLeft: '220px', // offset for Sidebar width (220px)
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
};

const mainStyle = {
  marginTop: '64px', // offset for Navbar height (64px)
  flex: 1,
  padding: '32px 28px',
  overflowY: 'auto',
};

export default function Layout({ children }) {
  return (
    <>
      {/* ── Animated mesh background orbs ───────────────────── */}
      <div className="mesh-background" aria-hidden="true">
        <div className="mesh-orb mesh-orb--teal" />
        <div className="mesh-orb mesh-orb--violet" />
        <div className="mesh-orb mesh-orb--coral" />
      </div>

      {/* ── Dot-grid texture overlay ─────────────────────────── */}
      <div className="dot-grid-overlay" aria-hidden="true" />

      {/* ── App shell ────────────────────────────────────────── */}
      <div style={shellStyle}>
        <Sidebar />

        <div style={rightColumnStyle}>
          <Navbar />
          <main style={mainStyle}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
