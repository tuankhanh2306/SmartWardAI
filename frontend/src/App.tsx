import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import CitizenPortal from './pages/CitizenPortal';
import FormAndIssueReporting from './pages/FormAndIssueReporting';
import GisCommandCenter from './pages/GisCommandCenter';
import OfficerFormAudit from './pages/OfficerFormAudit';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-on-surface antialiased flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
        {/* Global Administrative Header */}
        <Header />

        {/* Content Viewport with top offset for fixed header */}
        <div className="pt-16 flex-1 flex flex-col">
          <Routes>
            {/* Citizen Facing Routes */}
            <Route path="/" element={<Navigate to="/citizen" replace />} />
            <Route path="/citizen" element={<CitizenPortal />} />
            <Route path="/citizen/form" element={<FormAndIssueReporting />} />

            {/* Officer Administrative Routes */}
            <Route path="/officer/audit" element={<OfficerFormAudit />} />
            <Route path="/officer/map" element={<GisCommandCenter />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/citizen" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
