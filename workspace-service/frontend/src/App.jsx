/**
 * App — root component.
 *
 * Provider order (outermost to innermost):
 *   ToastProvider → AuthProvider → BrowserRouter
 *
 * ToastProvider must be outermost because AuthProvider calls `useToast`
 * internally to show session-expired notifications.
 *
 * Routes:
 *   /                  → Dashboard
 *   /workspaces        → WorkspaceList
 *   /workspaces/:id    → WorkspaceDetail
 *
 * Requirements: 11.6
 */

import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Toast from './components/common/Toast';
import Dashboard from './pages/Dashboard';
import WorkspaceList from './pages/WorkspaceList';
import WorkspaceDetail from './pages/WorkspaceDetail';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/"               element={<Dashboard />} />
              <Route path="/workspaces"     element={<WorkspaceList />} />
              <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
            </Routes>
          </Layout>
          <Toast />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
