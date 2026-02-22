import React, { useState, useEffect } from 'react';
import ServiceStatusOverview from '../components/ServiceStatusOverview';
import DataTable from '../components/DataTable';
import ProducerManager from '../components/ProducerManager';
import { useWebSocket } from '../hooks/useWebSocket';

const Dashboard = () => {
  //const rawDataUrl = import.meta.env.VITE_RAW_DATA_URL;
  const rawDataUrl = '/data-ingestion';
  const wsBase = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/data-ingestion/ws/ingestion`;
  
  // State for real-time data
  const [realtimeData, setRealtimeData] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [producers, setProducers] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState('');
  
  // WebSocket connection for data ingestion - connect per selected subscription
  const wsUrl = selectedSubscription ? `${wsBase}/${selectedSubscription}` : null;
  const { disconnect: wsDisconnect } = useWebSocket(wsUrl, {
    enabled: Boolean(wsUrl),
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

  // When selected subscription is cleared, ensure realtime data is emptied
  useEffect(() => {
    if (!selectedSubscription) {
      setRealtimeData([]);
      setWsConnected(false);
      if (wsDisconnect) wsDisconnect();
    }
  }, [selectedSubscription, wsDisconnect]);

  // Fetch available subscriptions so the user can select one for the WS
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await fetch(`${rawDataUrl}/subscriptions`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.producers) ? data.producers : [];
        const parsed = list
          .map((item) => {
            const entries = Object.entries(item || {});
            if (entries.length === 0) return null;
            const [id, url] = entries[0];
            return { id, url };
          })
          .filter(Boolean);
        setProducers(parsed);
        
        // Auto-select first producer if none selected
        if (!selectedSubscription && parsed.length > 0) {
          setSelectedSubscription(parsed[0].id);
        }

        // If the currently selected subscription was removed on the backend,
        // clear the selection (this will trigger the effect above to clear data)
        if (selectedSubscription && !parsed.find((p) => p.id === selectedSubscription)) {
          setSelectedSubscription('');
        }
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      }
    };

    fetchSubscriptions();
    const id = setInterval(fetchSubscriptions, 5000);
    return () => clearInterval(id);
  }, [rawDataUrl, selectedSubscription]);

  
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

      {/* Producers management */}
      <ProducerManager apiBase={rawDataUrl} onRemove={(id) => {
        // If the removed producer was the active subscription, clear selection
        // (the effect will handle clearing data and disconnecting WS)
        if (id === selectedSubscription) {
          setSelectedSubscription('');
        }
      }} />

      {/* Select active subscription for WebSocket updates */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Active Producer:</label>
        {producers.length > 0 ? (
          <select
            value={selectedSubscription}
            onChange={(e) => setSelectedSubscription(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            {producers.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.url}</option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-gray-500">No producers available — add one above</div>
        )}
      </div>

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
