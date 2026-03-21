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

function AppContent() {
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Ingestion';
      case '/ml':
        return 'ML';
      case '/analytics':
        return 'Analytics';
      case '/performance':
        return 'Performance';
      case '/policy':
        return 'Policy';
      case '/settings':
        return 'Settings';
      default:
        return 'AION';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Real-time Network Monitoring';
      case '/ml':
        return 'Browse and Manage model instances';
      case '/analytics':
        return 'Cell Analytics Insights';
      case '/performance':
        return 'Real-time ML Model Performance Monitoring';
      case '/policy':
        return 'Data transformation and field permissions';
      case '/settings':
        return 'Accessibility & Display Preferences';
      default:
        return '';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-8 py-4 sm:py-6 shadow-md">
          <h1 className="text-3xl font-bold text-white">{getPageTitle()}</h1>
          <p className="text-blue-50 mt-1">
            {getPageSubtitle()}
          </p>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ml" element={<MLModels />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
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
