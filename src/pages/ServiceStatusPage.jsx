import React from 'react';
import ServiceStatusOverview from '../components/ServiceStatusOverview';

const ServiceStatusPage = () => {
  const services = [
    {
      name: 'API Gateway',
      status: 'down',
      description: 'Main entry point for all API requests',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'Auth Service',
      status: 'down',
      description: 'Handles user authentication and authorization',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'User Service',
      status: 'down',
      description: 'Manages user data and profiles',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'Notification Service',
      status: 'down',
      description: 'Sends alerts and notifications to users',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'Analytics Service',
      status: 'down',
      description: 'Processes and analyzes network data',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'Storage Service',
      status: 'down',
      description: 'Manages data storage and retrieval',
      uptime: '0%',
      lastCheck: 'Never'
    },
    {
      name: 'Search Service',
      status: 'down',
      description: 'Provides search functionality across data',
      uptime: '0%',
      lastCheck: 'Never'
    },
  ];

  const getStatusBadge = (status) => {
    const statusColors = {
      operational: 'bg-green-100 text-green-800 border-green-300',
      degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      down: 'bg-gray-100 text-gray-800 border-gray-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Status Monitoring</h2>
        <p className="text-gray-600">
          Real-time monitoring of all microservices and their health status
        </p>
      </div>

      {/* Service Status Overview */}
      <ServiceStatusOverview />

      {/* Detailed Service Status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Detailed Service Information</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {services.map((service, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    {getStatusBadge(service.status)}
                  </div>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Uptime</div>
                  <div className="text-sm font-semibold text-gray-900">{service.uptime}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Last Check</div>
                  <div className="text-sm font-semibold text-gray-900">{service.lastCheck}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusPage;
