import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DataPage from './pages/DataPage';
import ServiceStatusPage from './pages/ServiceStatusPage';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <header className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 shadow-md">
            <h1 className="text-3xl font-bold text-white">AION Dashboard</h1>
            <p className="text-blue-50 mt-1">
              Real-time Network Monitoring & ML Control
            </p>
          </header>

          {/* Page Content */}
          <div className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/servicestatus" element={<ServiceStatusPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
