import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import './styles/App.css';

/**
 * Main App Component
 * 
 * Provides routing and layout for the entire application.
 * Routes will be added as features are implemented.
 */

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Routes for future features:
              - Workspaces list: /workspaces
              - Workspace detail: /workspaces/:id
              - Chat: /workspaces/:id/chat
              - Threads: /workspaces/:id/threads/:threadId
            */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
