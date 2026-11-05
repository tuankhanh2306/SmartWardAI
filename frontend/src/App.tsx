import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WardProvider } from './context/WardContext';
import { RoleProvider } from './context/RoleContext';
import Header from './components/Header';
import OfficerGuard from './components/OfficerGuard';
import CitizenPortal from './pages/CitizenPortal';
import FormAndIssueReporting from './pages/FormAndIssueReporting';
import GisCommandCenter from './pages/GisCommandCenter';
import OfficerFormAudit from './pages/OfficerFormAudit';
import WardOnboarding from './pages/WardOnboarding';
import PerWardDashboard from './pages/PerWardDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WardProvider>
        <RoleProvider>
          <div className="min-h-screen bg-background font-sans text-on-surface antialiased flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
            {/* Global Administrative Header with Role-Based Navigation */}
            <Header />

            {/* Content Viewport with top offset for fixed header */}
            <div className="pt-16 flex-1 flex flex-col">
              <Routes>
                {/* Common / Geographic Routes */}
                <Route path="/onboarding" element={<WardOnboarding />} />

                {/* Citizen Dedicated Routes */}
                <Route path="/" element={<Navigate to="/citizen" replace />} />
                <Route path="/citizen" element={<CitizenPortal />} />
                <Route path="/citizen/form" element={<FormAndIssueReporting />} />

                {/* Officer Protected Routes (RBAC Guard) */}
                <Route
                  path="/officer/audit"
                  element={
                    <OfficerGuard>
                      <OfficerFormAudit />
                    </OfficerGuard>
                  }
                />
                <Route
                  path="/officer/map"
                  element={
                    <OfficerGuard>
                      <GisCommandCenter />
                    </OfficerGuard>
                  }
                />
                <Route
                  path="/officer/ward/:wardCode"
                  element={
                    <OfficerGuard>
                      <PerWardDashboard />
                    </OfficerGuard>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/citizen" replace />} />
              </Routes>
            </div>
          </div>
        </RoleProvider>
      </WardProvider>
    </BrowserRouter>
  );
};

export default App;
