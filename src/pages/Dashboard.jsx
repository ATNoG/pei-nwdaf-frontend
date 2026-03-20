import React, { useState, useEffect, useMemo } from 'react';
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

  // Clear realtime data whenever the selected subscription changes (or is cleared)
  useEffect(() => {
    setRealtimeData([]);
    if (!selectedSubscription) {
      setWsConnected(false);
      if (wsDisconnect) wsDisconnect();
    }
  }, [selectedSubscription]);

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
            const [id, info] = entries[0];
            // Handle both old format (url string) and new format (object with url, label)
            if (typeof info === 'string') {
              return { id, url: info, label: id };
            }
            return { id, url: info.url || '', label: info.label || id };
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

  // Helper to convert snake_case keys to human headers
  const humanize = (s) => {
    if (!s) return '';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Fallback columns used until we have realtime data
  const defaultRawDataColumns = [
    { header: 'Timestamp', accessor: 'timestamp' },
    { header: 'Payload', accessor: 'payload' },
  ];

  // Safe getter that supports simple dot notation for nested values
  const getValue = (obj, key) => {
    if (!obj || !key) return undefined;
    if (!key.includes('.')) return obj[key];
    return key.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
  };

  const rawDataColumns = useMemo(() => {
    if (!Array.isArray(realtimeData) || realtimeData.length === 0) {
      return defaultRawDataColumns;
    }

    const sample = realtimeData[0];
    // Ensure deterministic ordering: timestamp first if present, then rest alphabetically
    const keys = Object.keys(sample);
    keys.sort((a, b) => {
      if (a === 'timestamp') return -1;
      if (b === 'timestamp') return 1;
      return a.localeCompare(b);
    });

    return keys.map((key) => {
      const col = { accessor: key, header: humanize(key) };

      // default: show value or '-' for null/undefined
      col.render = (value) => (value == null || value === '' ? '-' : String(value));

      return col;
    });
  }, [realtimeData]);

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

      {/* Real-time Data Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Ingestion Data</h2>
          <div className="flex items-center gap-2">
            {producers.length > 0 ? (
              <>
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Active Producer:</label>
                <select
                  value={selectedSubscription}
                  onChange={(e) => setSelectedSubscription(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} - {p.url}</option>
                  ))}
                </select>
              </>
            ) : (
              <span className="text-sm text-gray-400">No producers available</span>
            )}
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
                        {col.render ? col.render(getValue(row, col.accessor)) : (getValue(row, col.accessor) ?? '-')}
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
