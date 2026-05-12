import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MLModels from './pages/MLModels';
import Analytics from './pages/Analytics';
import Performance from './pages/Performance';
import Policy from './pages/Policy';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ROLE_ACCESS } from './lib/roles';

const allPages = ['/', '/ml', '/analytics', '/performance', '/policy', '/settings'];

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user.roles.length > 0 && !location.pathname.startsWith('/404')) {
      const firstAccessible = allPages.find(page =>
        ROLE_ACCESS[page]?.some(role => user.roles.includes(role))
      );

      if (firstAccessible && location.pathname !== firstAccessible) {
        navigate(firstAccessible, { replace: true });
      }
    }
  }, [user.roles.join(','), navigate]);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Ingestion';
      case '/ml': return 'ML';
      case '/analytics': return 'Analytics';
      case '/performance': return 'Performance';
      case '/policy': return 'Policy';
      case '/settings': return 'Settings';
      default: return 'AION';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/': return 'Real-time Network Monitoring';
      case '/ml': return 'Browse and Manage model instances';
      case '/analytics': return 'Cell Analytics Insights';
      case '/performance': return 'Real-time ML Model Performance Monitoring';
      case '/policy': return 'Data transformation and field permissions';
      case '/settings': return 'Accessibility & Display Preferences';
      default: return '';
    }
  };

  const meta = { title: getPageTitle(), subtitle: getPageSubtitle() };

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
            <Route path="/" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/ml" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/ml']}>
                <MLModels />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/analytics']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/performance']}>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/policy" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/policy']}>
                <Policy />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={ROLE_ACCESS['/settings']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App({ keycloak }) {
  return (
    <Router>
      <AuthProvider keycloak={keycloak}>
        <AccessibilityProvider>
          <AppContent />
        </AccessibilityProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
