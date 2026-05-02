import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MLModels from './pages/MLModels';
import Analytics from './pages/Analytics';
import Performance from './pages/Performance';
import Policy from './pages/Policy';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

const PAGE_META = {
  '/':            { title: 'Ingestion',    subtitle: 'Real-time network data streaming' },
  '/ml':          { title: 'ML Models',    subtitle: 'Browse and manage model instances' },
  '/analytics':   { title: 'Analytics',    subtitle: 'Cell analytics and predictions' },
  '/performance': { title: 'Performance',  subtitle: 'Real-time ML model monitoring' },
  '/policy':      { title: 'Policy',       subtitle: 'Data transformation and field permissions' },
  '/settings':    { title: 'Settings',     subtitle: 'Accessibility and display preferences' },
};

function AppContent() {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? { title: 'AION', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="page-header shrink-0">
          <div className="page-header-accent" aria-hidden="true" />
          <div>
            <h1>{meta.title}</h1>
            {meta.subtitle && <p>{meta.subtitle}</p>}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/ml"          element={<MLModels />} />
            <Route path="/analytics"   element={<Analytics />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/policy"      element={<Policy />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="*"            element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AccessibilityProvider>
        <AppContent />
      </AccessibilityProvider>
    </Router>
  );
}

export default App;
