import React, { useState, useEffect } from 'react';

const ProducerManager = ({ apiBase = '/data-ingestion' }) => {
  const [producers, setProducers] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducers = async () => {
    try {
      const res = await fetch(`${apiBase}/subscriptions`);
      if (!res.ok) {
        throw new Error(`Failed to fetch producers: ${res.status}`);
      }
      const data = await res.json();
      // Expected format: { producers: [ { <id>: <url> }, ... ] }
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
      // backend returns { id: <subscription_id> }
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
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Producers</h2>
          <p className="text-sm text-gray-600 mt-1">Manage data ingestion producers (name + URL)</p>
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
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subscription ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {producers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No producers configured</td>
              </tr>
            ) : (
              producers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 break-all">{p.id}</td>
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
