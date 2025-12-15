import React, { useState, useEffect } from 'react';
import ServiceStatusOverview from '../components/ServiceStatusOverview';
import DataTable from '../components/DataTable';
import { useWebSocket } from '../hooks/useWebSocket';

const Dashboard = () => {
  //const rawDataUrl = import.meta.env.VITE_RAW_DATA_URL;
  const rawDataUrl = '/data-ingestion';
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/data-ingestion/ws/ingestion`;
  
  // State for real-time data
  const [realtimeData, setRealtimeData] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  
  // WebSocket connection for data ingestion
  useWebSocket(wsUrl, {
    enabled: true,
    onMessage: (message) => {
      if (message.type === 'data_ingested' && message.data) {
        setRealtimeData(prev => [message.data, ...prev].slice(0, 100)); // Keep last 100 entries
      }
    },
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
    onError: (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    }
  });

  
  // Column definitions for raw data table - All columns
  const rawDataColumns = [
    { header: 'Timestamp', accessor: 'timestamp' },
    {
      header: 'Mean Latency (ms)',
      accessor: 'mean_latency',
      render: (value) => {
        if (!value) return '-';
        const latency = parseFloat(value);
        const color = latency < 30 ? 'text-green-600' : latency < 50 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}</span>;
      }
    },
    { header: 'Datarate', accessor: 'datarate' },
    {
      header: 'RSRP (dBm)',
      accessor: 'rsrp',
      render: (value) => {
        if (!value) return '-';
        const rsrp = parseFloat(value);
        const color = rsrp > -90 ? 'text-green-600' : rsrp > -100 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}</span>;
      }
    },
    { header: 'SINR (dB)', accessor: 'sinr' },
    { header: 'RSRQ (dB)', accessor: 'rsrq' },
    { header: 'Direction', accessor: 'direction' },
    { header: 'Network', accessor: 'network' },
    { header: 'CQI', accessor: 'cqi' },
    { header: 'Cell Index', accessor: 'cell_index' },
    { header: 'Primary Bandwidth', accessor: 'primary_bandwidth' },
    { header: 'UL Bandwidth', accessor: 'ul_bandwidth' },
    { header: 'Latitude', accessor: 'latitude' },
    { header: 'Longitude', accessor: 'longitude' },
    { header: 'Altitude', accessor: 'altitude' },
    { header: 'Velocity', accessor: 'velocity' },
  ];

  return (
    <div className="space-y-8">

      {/* Real-time Data Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Raw Data - Complete Network Metrics</h2>
            <p className="text-sm text-gray-600 mt-1">Real-time data ingestion stream</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {wsConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {realtimeData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {rawDataColumns.map((col) => (
                    <th
                      key={col.accessor}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {realtimeData.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-gray-50 transition-colors ${idx === 0 ? 'bg-blue-50' : ''}`}
                  >
                    {rawDataColumns.map((col) => (
                      <td key={col.accessor} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(row[col.accessor]) : (row[col.accessor] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {wsConnected ? 'Waiting for data...' : 'Connecting to data stream...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
