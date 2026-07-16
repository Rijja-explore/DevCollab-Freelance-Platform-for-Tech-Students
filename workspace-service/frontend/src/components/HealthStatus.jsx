import { useState, useEffect } from 'react';
import { getHealthStatus } from '../services/api';
import '../styles/HealthStatus.css';

/**
 * HealthStatus Component
 * 
 * Displays the backend service health status.
 * Polls the /health endpoint and shows:
 * - Service status (running/offline)
 * - Uptime
 * - Last checked timestamp
 */

function HealthStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        const data = await getHealthStatus();
        setHealth(data);
        setLastChecked(new Date());
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch health status');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    // Check health on mount
    checkHealth();

    // Poll health status every 10 seconds
    const interval = setInterval(checkHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="health-status loading">Checking service status...</div>;
  }

  if (error) {
    return (
      <div className="health-status error">
        <span className="status-indicator offline">⚪</span>
        <div className="status-content">
          <h3>Service Offline</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (health) {
    const uptime = Math.floor(health.uptime);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    return (
      <div className="health-status online">
        <span className="status-indicator running">🟢</span>
        <div className="status-content">
          <h3>{health.service}</h3>
          <p className="status-text">Status: {health.status}</p>
          <p className="uptime-text">
            Uptime: {hours}h {minutes}m {seconds}s
          </p>
          {lastChecked && (
            <p className="timestamp-text">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default HealthStatus;
