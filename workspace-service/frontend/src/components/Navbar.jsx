import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

/**
 * Navbar Component
 * 
 * Main navigation bar for the application.
 * Will be expanded with user menu, notifications, etc. in future phases.
 */

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">💬</span>
          Workspace Service
        </Link>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" className="navbar-link">Home</Link>
          </li>
          {/* Future menu items:
            <li className="navbar-item">
              <Link to="/workspaces" className="navbar-link">Workspaces</Link>
            </li>
            <li className="navbar-item">
              <button className="navbar-link navbar-button">Profile</button>
            </li>
          */}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
