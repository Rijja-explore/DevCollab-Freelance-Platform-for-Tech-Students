import HealthStatus from '../components/HealthStatus';
import '../styles/Home.css';

/**
 * Home Page
 * 
 * Landing page for the application.
 * Currently displays health status of the backend service.
 * 
 * Future features:
 * - Workspace creation form
 * - List of user workspaces
 * - Quick actions for joining/creating workspaces
 */

function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Workspace Service</h1>
        <p>Real-time collaboration platform for teams</p>
      </div>

      <div className="section">
        <h2>Backend Status</h2>
        <HealthStatus />
      </div>

      <div className="section">
        <h2>About This Service</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>💬 Real-time Chat</h3>
            <p>Instant messaging with live typing indicators</p>
          </div>
          <div className="info-card">
            <h3>🧵 Threaded Comments</h3>
            <p>Organized discussions with threading support</p>
          </div>
          <div className="info-card">
            <h3>👥 Online Presence</h3>
            <p>See who's online and active in real-time</p>
          </div>
          <div className="info-card">
            <h3>📊 Message History</h3>
            <p>Complete message history with search</p>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Getting Started</h2>
        <div className="getting-started">
          <ol>
            <li>Create a new workspace</li>
            <li>Invite team members</li>
            <li>Start collaborating in real-time</li>
            <li>Track milestones and progress</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Home;
