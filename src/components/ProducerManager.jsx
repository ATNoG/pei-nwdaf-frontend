import React, { useState, useEffect } from 'react';
import { FaEdit, FaTimes, FaCheck } from 'react-icons/fa';
import { createPortal } from 'react-dom';

const ProducerManager = ({ apiBase = '/data-ingestion', onRemove }) => {
  const [producers, setProducers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelValue, setLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);

  const fetchProducers = async () => {
    try {
      const res = await fetch(`${apiBase}/subscriptions`);
      if (!res.ok) throw new Error(`Failed to fetch producers: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data.producers) ? data.producers : [];
      const parsed = list
        .map((item) => {
          const entries = Object.entries(item || {});
          if (entries.length === 0) return null;
          const [id, value] = entries[0];
          const url = typeof value === 'object' ? value.url : value;
          const label = typeof value === 'object' ? value.label : undefined;
          return { id, url, label };
        })
        .filter(Boolean);
      setProducers(parsed);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducers();
    const id = setInterval(fetchProducers, 5000);
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
        body: JSON.stringify({ producer_url: url.trim() }),
      });
      if (!res.ok) throw new Error(`Failed to add producer: ${res.status}`);
      setUrl('');
      setShowModal(false);
      await fetchProducers();
    } catch (err) {
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
    <>
      {/* Add Producer Modal — rendered via portal to avoid stacking context issues */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Add Producer</h3>
              <button
                onClick={() => { setShowModal(false); setUrl(''); setError(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={addProducer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g. http://host:port"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setUrl(''); setError(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Adding...</>
                  ) : 'Add Producer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Producers</h2>
            <p className="text-sm text-gray-600 mt-1">Manage data ingestion producers</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Producer
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subscription ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {producers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">No producers configured</td>
                </tr>
              ) : (
                producers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono break-all">{p.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 break-all">{p.url}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm"
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
    </>
  );
};

export default ProducerManager;
