import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MLModels from './pages/MLModels';
import Analytics from './pages/Analytics';
import Performance from './pages/Performance';
import { ConfigProvider } from './contexts/ConfigContext';

function AppContent() {
  const location = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/ml-models':
        return 'ML Models';
      case '/analytics':
        return 'Analytics';
      case '/performance':
        return 'Performance';
      default:
        return 'AION';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Real-time Network Monitoring & ML Control';
      case '/ml-models':
        return 'Browse and Manage ML Models from MLFlow Registry';
      case '/analytics':
        return 'Cell Analytics Predictions & Insights';
      case '/performance':
        return 'Real-time ML Model Performance Monitoring';
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
        <header className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 shadow-md">
          <h1 className="text-3xl font-bold text-white">AION {getPageTitle()}</h1>
          <p className="text-blue-50 mt-1">
            {getPageSubtitle()}
          </p>
        </header>

        {/* Page Content */}
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ml-models" element={<MLModels />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/performance" element={<Performance />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ConfigProvider>
        <AppContent />
      </ConfigProvider>
    </Router>
  );
}

export default App;
