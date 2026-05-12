import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch } from '../lib/authFetch';

const EVENTS = ['PERF_DATA', 'UE_MOBILITY', 'UE_COMM'];

const CopyBtn = ({ text, id, copiedId, onCopy }) => (
  <button
    onClick={() => onCopy(text, id)}
    className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0"
    title="Copy"
  >
    {copiedId === id
      ? <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    }
  </button>
);

const ProducerManager = ({ apiBase = '/data-ingestion', onRemove }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [form, setForm] = useState({
    notifId: '',
    nefUrl: '',
    events: [],
    snssai_sst: '',
    snssai_sd: '',
    dnn: '',
  });

  const copyToClipboard = (text, id) => {
    const fallback = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    };
    navigator.clipboard?.writeText(text).catch(fallback) ?? fallback();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await authFetch(`${apiBase}/nef/subscriptions`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    const id = setInterval(fetchSubscriptions, 5000);
    return () => clearInterval(id);
  }, [apiBase]);

  const resetForm = () => setForm({ notifId: '', nefUrl: '', events: [], snssai_sst: '', snssai_sd: '', dnn: '' });

  const toggleEvent = (evt) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(evt) ? prev.events.filter(e => e !== evt) : [...prev.events, evt],
    }));
  };

  const addSubscription = async (e) => {
    e.preventDefault();
    if (!form.notifId.trim() || !form.nefUrl.trim() || form.events.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        notifId: form.notifId.trim(),
        nefUrl: form.nefUrl.trim(),
        events: form.events,
      };
      if (form.snssai_sst.trim()) {
        body.snssai = { sst: form.snssai_sst.trim() };
        if (form.snssai_sd.trim()) body.snssai.sd = form.snssai_sd.trim();
      }
      if (form.dnn.trim()) body.dnn = form.dnn.trim();

      const res = await authFetch(`${apiBase}/nef/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to add: ${res.status}`);
      }
      resetForm();
      setShowModal(false);
      await fetchSubscriptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeSubscription = async (notifId) => {
    if (!confirm(`Remove subscription "${notifId}"?`)) return;
    try {
      const res = await authFetch(`${apiBase}/nef/subscriptions/${encodeURIComponent(notifId)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete: ${res.status}`);
      await fetchSubscriptions();
      if (onRemove) onRemove(notifId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Add NEF Subscription</h3>
              <button onClick={() => { setShowModal(false); resetForm(); setError(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={addSubscription} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. my-nef-sub-1"
                    value={form.notifId}
                    onChange={e => setForm(p => ({ ...p, notifId: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NEF URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. http://nef-host:8080/nef/subscribe"
                    value={form.nefUrl}
                    onChange={e => setForm(p => ({ ...p, nefUrl: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {EVENTS.map(evt => (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleEvent(evt)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.events.includes(evt)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {evt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      S-NSSAI SST <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      placeholder="e.g. 1"
                      value={form.snssai_sst}
                      onChange={e => setForm(p => ({ ...p, snssai_sst: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      S-NSSAI SD <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      placeholder="e.g. 000001"
                      value={form.snssai_sd}
                      onChange={e => setForm(p => ({ ...p, snssai_sd: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DNN <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. internet"
                    value={form.dnn}
                    onChange={e => setForm(p => ({ ...p, dnn: e.target.value }))}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); setError(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.notifId.trim() || !form.nefUrl.trim() || form.events.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Adding…</>
                    : 'Add Subscription'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">NEF Subscriptions</h2>
            <p className="text-xs text-gray-500 mt-0.5">Active NEF event subscriptions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notif ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NEF URL</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Events</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No subscriptions configured</td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const sst = sub.snssai?.sst ?? sub.snssai?.snssaiSst;
                  const sd = sub.snssai?.sd ?? sub.snssai?.snssaiSd;
                  const snssaiStr = sst ? `sst=${sst}${sd ? ` sd=${sd}` : ''}` : null;
                  return (
                    <tr key={sub.notif_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-gray-900">{sub.notif_id}</span>
                          <CopyBtn text={sub.notif_id} id={`nid-${sub.notif_id}`} copiedId={copiedId} onCopy={copyToClipboard} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-600 font-mono break-all line-clamp-2" title={sub.nef_url}>
                            {sub.nef_url}
                          </span>
                          <CopyBtn text={sub.nef_url} id={`url-${sub.notif_id}`} copiedId={copiedId} onCopy={copyToClipboard} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(sub.events || []).map(e => (
                            <span key={e} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">{e}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 font-mono">
                        {snssaiStr && <div>{snssaiStr}</div>}
                        {sub.dnn && <div className="text-gray-500">dnn={sub.dnn}</div>}
                        {!snssaiStr && !sub.dnn && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          className="px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                          onClick={() => removeSubscription(sub.notif_id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ProducerManager;
