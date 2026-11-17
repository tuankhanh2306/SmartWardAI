import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WardProvider, useWard } from './context/WardContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Header from './components/Header';
import CitizenGuard from './components/CitizenGuard';
import OfficerGuard from './components/OfficerGuard';

// Lazy Loaded Page Components (Code-Splitting Architecture)
const RoleGateway = lazy(() => import('./pages/RoleGateway'));
const CitizenPortal = lazy(() => import('./pages/CitizenPortal'));
const FormAndIssueReporting = lazy(() => import('./pages/FormAndIssueReporting'));
const ProceduresCatalogPage = lazy(() => import('./pages/ProceduresCatalogPage'));
const WardOnboarding = lazy(() => import('./pages/WardOnboarding'));
const PerWardDashboard = lazy(() => import('./pages/PerWardDashboard'));

const RouteLoadingSpinner: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <div className="w-9 h-9 border-3 border-[#00796B]/30 border-t-[#00796B] rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500">Đang tải phân hệ hành chính...</span>
  </div>
);

const OfficerRedirect: React.FC<{ tab?: 'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP' }> = ({ tab }) => {
  const { currentWard } = useWard();
  const suffix = tab ? `?tab=${tab}` : '';
  return <Navigate to={`/officer/ward/${currentWard.code}${suffix}`} replace />;
};

const AppContent: React.FC = () => {
  const { role } = useRole();

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A] antialiased flex flex-col selection:bg-[#0F2942] selection:text-white">
      {/* Global Administrative Header (Only rendered when user has active session) */}
      <Header />

      {/* Content Viewport */}
      <div className={`${role ? 'pt-14 sm:pt-16 pb-16 lg:pb-0' : ''} flex-1 flex flex-col`}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <Routes>
            {/* 1. Gateway Entry Point: Unauthenticated visits land here */}
            <Route path="/" element={<RoleGateway />} />

            {/* 2. Common / Geographic Onboarding */}
            <Route path="/onboarding" element={<WardOnboarding />} />

            {/* 3. Citizen Dedicated Routes (Strictly guarded by CitizenGuard) */}
            <Route
              path="/citizen"
              element={
                <CitizenGuard>
                  <CitizenPortal />
                </CitizenGuard>
              }
            />
            <Route
              path="/citizen/procedures"
              element={
                <CitizenGuard>
                  <ProceduresCatalogPage />
                </CitizenGuard>
              }
            />
            <Route
              path="/citizen/form"
              element={
                <CitizenGuard>
                  <FormAndIssueReporting />
                </CitizenGuard>
              }
            />

            {/* 4. Officer Protected Workspace (Strictly guarded by OfficerGuard) */}
            <Route
              path="/officer"
              element={
                <OfficerGuard>
                  <OfficerRedirect />
                </OfficerGuard>
              }
            />
            <Route
              path="/officer/audit"
              element={
                <OfficerGuard>
                  <OfficerRedirect tab="FORMS" />
                </OfficerGuard>
              }
            />
            <Route
              path="/officer/map"
              element={
                <OfficerGuard>
                  <OfficerRedirect tab="MAP" />
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

            {/* 5. Catch-all fallback -> Return to Gateway */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WardProvider>
        <RoleProvider>
          <AccessibilityProvider>
            <AppContent />
          </AccessibilityProvider>
        </RoleProvider>
      </WardProvider>
    </BrowserRouter>
  );
};

export default App;
