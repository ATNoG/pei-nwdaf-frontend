import React from 'react';
import ServiceStatusOverview from '../components/ServiceStatusOverview';

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AION Dashboard</h2>
        <p className="text-gray-600">
          Real-time Network Monitoring & ML Control System for NWDAF Analytics
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">5</div>
            <div className="text-sm text-gray-600 mt-1">Active Data Sources</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-3xl font-bold text-green-600">41</div>
            <div className="text-sm text-gray-600 mt-1">Metrics Tracked</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-3xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600 mt-1">Services Online</div>
          </div>
        </div>
      </div>

      {/* Service Status Overview */}
      <ServiceStatusOverview />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Latency</span>
              <span className="text-sm font-semibold text-gray-900">39.57 ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average RSRP</span>
              <span className="text-sm font-semibold text-gray-900">-101 dBm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Packet Loss</span>
              <span className="text-sm font-semibold text-green-600">0%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="text-sm font-semibold text-gray-900">-</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-semibold text-gray-900">-</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm font-semibold text-gray-900">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
