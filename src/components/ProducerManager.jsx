import React, { useState, useEffect } from 'react';
import { FaEdit, FaTimes, FaCheck } from 'react-icons/fa';

const ProducerManager = ({ apiBase = '/data-ingestion', onRemove }) => {
  const [producers, setProducers] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelValue, setLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);

  const fetchProducers = async () => {
    try {
      const res = await fetch(`${apiBase}/subscriptions`);
      if (!res.ok) {
        throw new Error(`Failed to fetch producers: ${res.status}`);
      }
      const data = await res.json();

      // Handle both old and new formats
      let producersList = [];

      if (data.producers && Array.isArray(data.producers)) {
        // Old format: { producers: [ { <sub_id>: {url, label} }, ... ] }
        producersList = data.producers;
      } else if (data.active && Array.isArray(data.active)) {
        // New format: { active: [ { <sub_id>: {url, label, last_seen} }, ... ], inactive: [...] }
        producersList = [...data.active, ...data.inactive];
      }

      const parsed = producersList
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
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchProducers();
    const id = setInterval(fetchProducers, 5000); // poll every 5s
    return () => clearInterval(id);
  }, [apiBase]);

  const addProducer = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producer_url: url.trim() })
      });
      if (!res.ok) throw new Error(`Failed to add producer: ${res.status}`);
      const data = await res.json();
      setUrl('');
      await fetchProducers();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeProducer = async (id) => {
    if (!confirm('Remove this producer?')) return;
    try {
      const res = await fetch(`${apiBase}/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      await fetchProducers();
      if (onRemove) onRemove(id);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const startEditLabel = (producer) => {
    setEditingLabel(producer.id);
    setLabelValue(producer.label);
  };

  const cancelEditLabel = () => {
    setEditingLabel(null);
    setLabelValue('');
  };

  const saveLabel = async (subscriptionId) => {
    if (!labelValue.trim()) {
      setError('Label cannot be empty');
      return;
    }
    setSavingLabel(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/subscriptions/${subscriptionId}/label`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelValue.trim() })
      });
      if (!res.ok) throw new Error(`Failed to update label: ${res.status}`);
      await fetchProducers();
      setEditingLabel(null);
      setLabelValue('');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSavingLabel(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Producers</h2>
          <p className="text-sm text-gray-600 mt-1">Manage data ingestion producers and their labels</p>
        </div>
      </div>

      <form className="flex gap-2 mb-4" onSubmit={addProducer}>
        <input
          className="flex-1 px-3 py-2 border rounded-md"
          placeholder="Producer URL (e.g. http://host:port)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          disabled={loading}
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subscription ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {producers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No producers configured</td>
              </tr>
            ) : (
              producers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {editingLabel === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="px-2 py-1 border rounded-md text-sm w-32"
                          value={labelValue}
                          onChange={(e) => setLabelValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabel(p.id);
                            if (e.key === 'Escape') cancelEditLabel();
                          }}
                        />
                        <button
                          className="p-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={() => saveLabel(p.id)}
                          disabled={savingLabel}
                        >
                          <FaCheck size={12} />
                        </button>
                        <button
                          className="p-1 rounded-md bg-gray-600 text-white hover:bg-gray-700"
                          onClick={cancelEditLabel}
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                          {p.label}
                        </span>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => startEditLabel(p)}
                          title="Edit label"
                        >
                          <FaEdit size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 break-all font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 break-all">{p.url}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                      onClick={() => removeProducer(p.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProducerManager;
