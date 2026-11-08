import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WardProvider, useWard } from './context/WardContext';
import { RoleProvider } from './context/RoleContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Header from './components/Header';
import OfficerGuard from './components/OfficerGuard';
import CitizenPortal from './pages/CitizenPortal';
import FormAndIssueReporting from './pages/FormAndIssueReporting';
import WardOnboarding from './pages/WardOnboarding';
import PerWardDashboard from './pages/PerWardDashboard';

const OfficerRedirect: React.FC<{ tab?: 'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP' }> = ({ tab }) => {
  const { currentWard } = useWard();
  const suffix = tab ? `?tab=${tab}` : '';
  return <Navigate to={`/officer/ward/${currentWard.code}${suffix}`} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WardProvider>
        <RoleProvider>
          <AccessibilityProvider>
            <div className="min-h-screen bg-background font-sans text-on-surface antialiased flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
              {/* Global Administrative Header with Role-Based Navigation */}
              <Header />

              {/* Content Viewport with top offset for fixed header and bottom offset for mobile tab bar */}
              <div className="pt-14 sm:pt-16 pb-16 lg:pb-0 flex-1 flex flex-col">
                <Routes>
                  {/* Common / Geographic Routes */}
                  <Route path="/onboarding" element={<WardOnboarding />} />

                  {/* Citizen Dedicated Routes */}
                  <Route path="/" element={<Navigate to="/citizen" replace />} />
                  <Route path="/citizen" element={<CitizenPortal />} />
                  <Route path="/citizen/form" element={<FormAndIssueReporting />} />

                  {/* Officer Protected Unified Workspace (1 Dashboard Duy Nhất Cho Mọi Nghiệp Vụ) */}
                  <Route path="/officer" element={<OfficerRedirect />} />
                  <Route path="/officer/audit" element={<OfficerRedirect tab="FORMS" />} />
                  <Route path="/officer/map" element={<OfficerRedirect tab="MAP" />} />
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
          </AccessibilityProvider>
        </RoleProvider>
      </WardProvider>
    </BrowserRouter>
  );
};

export default App;
