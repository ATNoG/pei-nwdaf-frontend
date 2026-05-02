import React, { useState, useEffect, useMemo } from 'react';
import ProducerManager from '../components/ProducerManager';
import { useWebSocket } from '../hooks/useWebSocket';

const SUMMARY_COLS = ['timestamp', 'event', 'snssai_sst', 'snssai_sd', 'dnn'];

const humanize = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const renderValue = (value) => {
  if (value == null || value === '') return '-';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Parse "key=value key2=value2" filter string
const parseFilter = (str) => {
  const filters = {};
  for (const part of str.trim().split(/\s+/)) {
    const eq = part.indexOf('=');
    if (eq > 0) filters[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return filters;
};

const matchesFilter = (row, filters) => {
  for (const [k, v] of Object.entries(filters)) {
    if (String(row[k] ?? '').toLowerCase() !== v.toLowerCase()) return false;
  }
  return true;
};

const Dashboard = () => {
  const rawDataUrl = '/data-ingestion';
  const wsBase = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/data-ingestion/ws/ingestion`;

  const [realtimeData, setRealtimeData] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [producers, setProducers] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [filterStr, setFilterStr] = useState('');

  const wsUrl = selectedSubscription ? `${wsBase}/${selectedSubscription}` : null;
  const { disconnect: wsDisconnect } = useWebSocket(wsUrl, {
    enabled: Boolean(wsUrl),
    onMessage: (message) => {
      if (message.type === 'data_ingested' && message.data) {
        const { metrics, tags, ...rest } = message.data;
        const flat = { ...rest, ...(tags || {}), ...(metrics || {}) };
        setRealtimeData(prev => [flat, ...prev].slice(0, 100));
      }
    },
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
    onError: () => setWsConnected(false),
  });

  useEffect(() => {
    setRealtimeData([]);
    setSelectedRow(null);
    if (!selectedSubscription) {
      setWsConnected(false);
      if (wsDisconnect) wsDisconnect();
    }
  }, [selectedSubscription]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await fetch(`${rawDataUrl}/nef/subscriptions`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.subscriptions) ? data.subscriptions : [];
        setProducers(list.map(sub => ({ id: sub.notif_id, label: sub.notif_id, url: sub.nef_url || '' })));
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      }
    };
    fetchSubscriptions();
    const id = setInterval(fetchSubscriptions, 5000);
    return () => clearInterval(id);
  }, [rawDataUrl]);

  const filters = useMemo(() => parseFilter(filterStr), [filterStr]);
  const filteredData = useMemo(
    () => realtimeData.filter(row => matchesFilter(row, filters)),
    [realtimeData, filters]
  );

  const detailKeys = selectedRow ? Object.keys(selectedRow).filter(k => !SUMMARY_COLS.includes(k)) : [];

  return (
    <div className="space-y-8">
      <ProducerManager apiBase={rawDataUrl} onRemove={(id) => {
        if (id === selectedSubscription) setSelectedSubscription('');
      }} />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Ingestion Data</h2>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-gray-300'}`} title={wsConnected ? 'Connected' : 'Disconnected'} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Subscription selector */}
            <select
              value={selectedSubscription}
              onChange={(e) => setSelectedSubscription(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select subscription —</option>
              {producers.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {/* Filter input */}
            <input
              type="text"
              placeholder="snssai_sst=1 event=PERF_DATA"
              value={filterStr}
              onChange={e => setFilterStr(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 font-mono"
            />
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex divide-x divide-gray-200" style={{ minHeight: '320px' }}>
          {/* Left: summary table */}
          <div className="flex-1 overflow-auto">
            {filteredData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {SUMMARY_COLS.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {humanize(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredData.map((row, idx) => {
                    const isSelected = selectedRow === row;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(isSelected ? null : row)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                      >
                        {SUMMARY_COLS.map(col => (
                          <td key={col} className="px-4 py-2.5 text-sm text-gray-900 whitespace-nowrap">
                            {col === 'timestamp' && row[col]
                              ? new Date(row[col] * 1000).toLocaleTimeString()
                              : (row[col] ?? <span className="text-gray-300">—</span>)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full py-16 text-sm text-gray-400">
                {!selectedSubscription
                  ? 'Select a subscription to start streaming'
                  : wsConnected
                  ? filterStr ? 'No rows match filter' : 'Waiting for data...'
                  : 'Connecting...'}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <div className="w-80 shrink-0 overflow-auto p-5">
            {selectedRow ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Row Details</h3>
                  <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕ close</button>
                </div>
                <div className="space-y-3">
                  {detailKeys.map(k => (
                    <div key={k}>
                      <p className="text-xs font-medium text-gray-400 uppercase">{humanize(k)}</p>
                      <p className="text-sm text-gray-900 font-mono break-all">{renderValue(selectedRow[k])}</p>
                    </div>
                  ))}
                  {detailKeys.length === 0 && (
                    <p className="text-sm text-gray-400">No extra fields.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-300">
                Click a row to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
