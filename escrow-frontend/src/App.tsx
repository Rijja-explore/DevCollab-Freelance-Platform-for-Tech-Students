import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { Dashboard } from './pages/Dashboard';
import { Contracts } from './pages/Contracts';
import { Milestones } from './pages/Milestones';
import { Transactions } from './pages/Transactions';
import { AuditLogs } from './pages/AuditLogs';
import { PaymentDetails } from './pages/PaymentDetails';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/milestones" element={<Milestones />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:id" element={<PaymentDetails />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
};

export default App;
