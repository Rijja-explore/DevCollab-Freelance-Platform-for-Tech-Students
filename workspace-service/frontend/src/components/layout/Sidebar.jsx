import { NavLink } from 'react-router-dom';

/**
 * Sidebar — fixed left navigation panel.
 *
 * Uses React Router <NavLink> with className callback to apply
 * a teal left-border indicator on the active route.
 *
 * Requirements: 11.1
 */

const sidebarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '220px',
  height: '100vh',
  background: 'rgba(13, 17, 23, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '80px', // leave room for Navbar
  zIndex: 100,
};

const navStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '0 12px',
};

const navIcon = {
  fontSize: '1rem',
  lineHeight: 1,
};

/**
 * Returns class name string based on whether the NavLink is active.
 * The active link gets an inline style via the callback — NavLink's
 * `className` callback is used so we can compose base + active styles.
 */
function getLinkStyle({ isActive }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--color-teal)' : '#94a3b8',
    background: isActive ? 'rgba(6, 214, 160, 0.08)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--color-teal)' : '3px solid transparent',
    textDecoration: 'none',
    transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
  };
}

const labelStyle = {
  lineHeight: 1,
};

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',   icon: '⬡', end: true  },
  { to: '/workspaces', label: 'Workspaces',  icon: '⬢', end: false },
];

export default function Sidebar() {
  return (
    <aside style={sidebarStyle} aria-label="Main navigation">
      {/* Sidebar brand mark */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '0',
          right: '0',
          padding: '0 26px',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.25)',
          userSelect: 'none',
        }}
      >
        Navigation
      </div>

      <nav style={navStyle}>
        {NAV_LINKS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={getLinkStyle}
            aria-label={label}
          >
            <span style={navIcon} aria-hidden="true">{icon}</span>
            <span style={labelStyle}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
