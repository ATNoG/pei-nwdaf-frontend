import React, { useState, useEffect, useCallback } from 'react';

const ML_URL = '/pei-ml';

const POLICY_FIELDS = [
  {
    key: 'base_ttl_days',
    label: 'Base TTL (days)',
    description: 'Days before an untrained model expires',
    min: 1,
  },
  {
    key: 'tolerance_per_use_days',
    label: 'Tolerance per Use (days)',
    description: 'Extra days added per recorded inference use',
    min: 0,
  },
  {
    key: 'max_tolerance_days',
    label: 'Max Tolerance (days)',
    description: 'Cap on total tolerance days regardless of use count',
    min: 0,
  },
  {
    key: 'sweep_interval_seconds',
    label: 'Sweep Interval (seconds)',
    description: 'How often the expiry sweep runs',
    min: 60,
  },
];

function PolicyEditor() {
  const [policy, setPolicy] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ML_URL}/v1/expiry/policy`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPolicy(data);
      setDraft(data);
    } catch (e) {
      setError(`Failed to load policy: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${ML_URL}/v1/expiry/policy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPolicy(updated);
      setDraft(updated);
      setSaved(true);
    } catch (e) {
      setError(`Failed to save policy: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = policy && draft && JSON.stringify(policy) !== JSON.stringify(draft);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-gray-500 text-sm">Loading policy...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Expiry Policy</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure when models are automatically removed from the registry.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Policy saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {POLICY_FIELDS.map(({ key, label, description, min }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <p className="text-xs text-gray-400 mb-2">{description}</p>
            <input
              type="number"
              min={min}
              value={draft?.[key] ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {isDirty && (
          <button
            onClick={() => { setDraft(policy); setSaved(false); }}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ML_URL}/v1/expiry/audit?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(`Failed to load audit log: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const fmt = iso =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' }) : '—';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Expiry Audit Log</h2>
          <p className="text-sm text-gray-500">Models removed by the expiry sweep, newest first.</p>
        </div>
        <button
          onClick={fetchAudit}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-6 py-8 text-sm text-gray-500">Loading audit log...</p>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">No models have been expired yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expired At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective TTL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <React.Fragment key={row.model_id + row.expired_at}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-900 text-xs">{row.model_name}</td>
                    <td className="px-6 py-4 text-gray-600">{fmt(row.expired_at)}</td>
                    <td className="px-6 py-4 text-gray-600">{fmt(row.last_used_at)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                        {row.effective_ttl_days}d
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setExpanded(expanded === row.model_id + row.expired_at ? null : row.model_id + row.expired_at)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expanded === row.model_id + row.expired_at ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expanded === row.model_id + row.expired_at && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-3">
                        <pre className="text-xs text-gray-700 bg-gray-100 rounded p-3 overflow-x-auto">
                          {JSON.stringify(row.policy_snapshot, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ModelPolicy() {
  return (
    <div className="space-y-8">
      <PolicyEditor />
      <AuditLog />
    </div>
  );
}
