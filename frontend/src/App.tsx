import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'

// Pages
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Recommendations } from './pages/Recommendations'
import { Applications } from './pages/Applications'
import { Applicants } from './pages/Applicants'
import { Talent } from './pages/Talent'
import { Workspaces } from './pages/Workspaces'
import { WorkspaceDetail } from './pages/WorkspaceDetail'
import { GraphQLPlayground } from './pages/GraphQLPlayground'
import { Contracts } from './pages/Contracts'
import { Milestones } from './pages/Milestones'
import { Transactions } from './pages/Transactions'
import { PaymentDetails } from './pages/PaymentDetails'
import { AuditLogs } from './pages/AuditLogs'
import { Notifications } from './pages/Notifications'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { PaymentSuccess } from './pages/PaymentSuccess'
import { PaymentCancel } from './pages/PaymentCancel'

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'

const App: React.FC = () => {
  const content = (
    <Router>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Protected Dashboard & Microservice Modules */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-project"
          element={
            <ProtectedRoute allowedRoles={['STARTUP', 'ADMIN']}>
              <Layout>
                <Projects defaultOpenModal={true} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
              <Layout>
                <Applications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/applicants"
          element={
            <ProtectedRoute allowedRoles={['STARTUP', 'ADMIN']}>
              <Layout>
                <Applicants />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/talent"
          element={
            <ProtectedRoute allowedRoles={['STARTUP', 'ADMIN']}>
              <Layout>
                <Talent />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'STARTUP', 'ADMIN']}>
              <Layout>
                <Recommendations />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/graphql-explorer"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout>
                <GraphQLPlayground />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <Layout>
                <Workspaces />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <WorkspaceDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute>
              <Layout>
                <Contracts />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/milestones"
          element={
            <ProtectedRoute allowedRoles={['STARTUP', 'ADMIN']}>
              <Layout>
                <Milestones />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout>
                <Transactions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Layout>
                <Transactions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <PaymentDetails />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout>
                <AuditLogs />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )

  return (
    <AuthProvider>
      <ToastProvider>
        {paypalClientId ? (
          <PayPalScriptProvider
            options={{
              clientId: paypalClientId,
              currency: 'USD',
              intent: 'capture',
            }}
          >
            {content}
          </PayPalScriptProvider>
        ) : (
          content
        )}
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
