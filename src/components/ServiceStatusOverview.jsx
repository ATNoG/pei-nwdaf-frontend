import React from 'react';

const ServiceStatusOverview = () => {
  const services = [
    { name: 'API Gateway', status: 'down' },
    { name: 'Auth Service', status: 'down' },
    { name: 'User Service', status: 'down' },
    { name: 'Notification Service', status: 'down' },
    { name: 'Analytics Service', status: 'down' },
    { name: 'Storage Service', status: 'down' },
    { name: 'Search Service', status: 'down' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 border-green-300';
      case 'degraded':
        return 'bg-red-100 border-red-300';
      case 'down':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-blue-100 border-blue-300';
    }
  };

  const getStatusIconColor = (status) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-red-500';
      case 'down':
        return 'text-gray-500';
      default:
        return 'text-blue-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'operational':
        return 'Online';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">Service Status Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service, index) => (
          <div
            key={index}
            className={`${getStatusColor(
              service.status
            )} border rounded-lg p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm text-gray-800">{service.name}</h3>
              <div className={`${getStatusIconColor(service.status)}`}>
                {service.status === 'operational' ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Status: <span className={`font-medium ${getStatusIconColor(service.status)}`}>{getStatusText(service.status)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceStatusOverview;
