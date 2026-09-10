import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Recommendations } from './pages/Recommendations';
import { Workspaces } from './pages/Workspaces';
import { GraphQLPlayground } from './pages/GraphQLPlayground';
import { Contracts } from './pages/Contracts';
import { Milestones } from './pages/Milestones';
import { Transactions } from './pages/Transactions';
import { AuditLogs } from './pages/AuditLogs';
import { PaymentDetails } from './pages/PaymentDetails';

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const App: React.FC = () => {
  const children = (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/graphql-explorer" element={<GraphQLPlayground />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<PaymentDetails />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Routes>
      </Layout>
    </Router>
  );

  return (
    <ToastProvider>
      {paypalClientId ? (
        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            currency: 'USD',
            intent: 'capture',
          }}
        >
          {children}
        </PayPalScriptProvider>
      ) : (
        children
      )}
    </ToastProvider>
  );
};

export default App;
