import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../lib/authFetch';

const API = '/decision-api/api/v1';

const badge = (label, color) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800`}>
    {label}
  </span>
);

const Section = ({ title, children, action }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const EmptyRow = ({ cols, msg }) => (
  <tr><td colSpan={cols} className="px-4 py-6 text-center text-sm text-gray-400">{msg}</td></tr>
);

export default function Decision() {
  const [tab, setTab] = useState('decisions');

  const [decisions, setDecisions] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [riskLevels, setRiskLevels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Forms
  const [newDecision, setNewDecision] = useState({ name: '', description: '', justification: '' });
  const [newBlacklist, setNewBlacklist] = useState({ name: '', reason: '' });
  const [newRisk, setNewRisk] = useState({ name: '', degree: '', description: '' });
  const [newSub, setNewSub] = useState({ callback_url: '', event_types: '', snssai_sst: '', snssai_sd: '', dnn: '', event: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [d, b, r, s] = await Promise.all([
        authFetch(`${API}/config/decisions`).then(r => r.json()),
        authFetch(`${API}/config/blacklist`).then(r => r.json()),
        authFetch(`${API}/config/risk-levels`).then(r => r.json()),
        authFetch(`${API}/subscriptions`).then(r => r.json()),
      ]);
      setDecisions(d.decisions ?? []);
      setBlacklist(b.blacklist ?? []);
      setRiskLevels(r.risk_levels ?? []);
      setSubscriptions(s.subscriptions ?? []);
    } catch (e) {
      setError('Failed to load data');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const post = async (url, body) => {
    setLoading(true); setError(null);
    try {
      const res = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || res.status); }
      await fetchAll();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const del = async (url) => {
    setLoading(true); setError(null);
    try {
      const res = await authFetch(url, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || res.status); }
      await fetchAll();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'decisions', label: 'Decisions' },
    { id: 'blacklist', label: 'Blacklist' },
    { id: 'risk', label: 'Risk Levels' },
    { id: 'subscriptions', label: 'Subscriptions' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Decisions tab */}
      {tab === 'decisions' && (
        <div className="space-y-6">
          <Section title="Add Decision">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              onSubmit={e => {
                e.preventDefault();
                post(`${API}/config/decisions`, newDecision);
                setNewDecision({ name: '', description: '', justification: '' });
              }}
            >
              <input className="input" placeholder="Name *" required value={newDecision.name}
                onChange={e => setNewDecision(p => ({ ...p, name: e.target.value }))} />
              <input className="input" placeholder="Description" value={newDecision.description}
                onChange={e => setNewDecision(p => ({ ...p, description: e.target.value }))} />
              <input className="input" placeholder="Justification" value={newDecision.justification}
                onChange={e => setNewDecision(p => ({ ...p, justification: e.target.value }))} />
              <button type="submit" disabled={loading}
                className="sm:col-span-3 btn-primary">
                Add Decision
              </button>
            </form>
          </Section>

          <Section title={`Decisions (${decisions.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Blacklisted</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {decisions.length === 0 && <EmptyRow cols={4} msg="No decisions configured" />}
                {decisions.map(d => (
                  <tr key={d.name} className="hover:bg-gray-50">
                    <td className="py-2 px-1 font-mono text-xs">{d.name}</td>
                    <td className="py-2 px-1 text-gray-600">{d.description ?? '—'}</td>
                    <td className="py-2 px-1">
                      {blacklist.some(b => b.name === d.name)
                        ? badge('blacklisted', 'red')
                        : badge('active', 'green')}
                    </td>
                    <td className="py-2 px-1 text-right">
                      <button onClick={() => del(`${API}/config/decisions/${d.name}`)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {/* Blacklist tab */}
      {tab === 'blacklist' && (
        <div className="space-y-6">
          <Section title="Add to Blacklist">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              onSubmit={e => {
                e.preventDefault();
                post(`${API}/config/blacklist`, newBlacklist);
                setNewBlacklist({ name: '', reason: '' });
              }}
            >
              <select className="input" required value={newBlacklist.name}
                onChange={e => setNewBlacklist(p => ({ ...p, name: e.target.value }))}>
                <option value="">Select decision *</option>
                {decisions.filter(d => !blacklist.some(b => b.name === d.name)).map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
              <input className="input" placeholder="Reason" value={newBlacklist.reason}
                onChange={e => setNewBlacklist(p => ({ ...p, reason: e.target.value }))} />
              <button type="submit" disabled={loading} className="sm:col-span-2 btn-primary">
                Blacklist Decision
              </button>
            </form>
          </Section>

          <Section title={`Blacklist (${blacklist.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Decision</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {blacklist.length === 0 && <EmptyRow cols={3} msg="Blacklist is empty" />}
                {blacklist.map(b => (
                  <tr key={b.name} className="hover:bg-gray-50">
                    <td className="py-2 px-1 font-mono text-xs">{b.name}</td>
                    <td className="py-2 px-1 text-gray-600">{b.reason ?? '—'}</td>
                    <td className="py-2 px-1 text-right">
                      <button onClick={() => del(`${API}/config/blacklist/${b.name}`)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {/* Risk Levels tab */}
      {tab === 'risk' && (
        <div className="space-y-6">
          <Section title="Add Risk Level">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              onSubmit={e => {
                e.preventDefault();
                post(`${API}/config/risk-levels`, { ...newRisk, degree: parseInt(newRisk.degree) });
                setNewRisk({ name: '', degree: '', description: '' });
              }}
            >
              <input className="input" placeholder="Name *" required value={newRisk.name}
                onChange={e => setNewRisk(p => ({ ...p, name: e.target.value }))} />
              <input className="input" type="number" placeholder="Degree *" required value={newRisk.degree}
                onChange={e => setNewRisk(p => ({ ...p, degree: e.target.value }))} />
              <input className="input" placeholder="Description" value={newRisk.description}
                onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))} />
              <button type="submit" disabled={loading} className="sm:col-span-3 btn-primary">
                Add Risk Level
              </button>
            </form>
          </Section>

          <Section title={`Risk Levels (${riskLevels.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Degree</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {riskLevels.length === 0 && <EmptyRow cols={4} msg="No risk levels configured" />}
                {riskLevels.map(r => (
                  <tr key={r.name} className="hover:bg-gray-50">
                    <td className="py-2 px-1 font-mono text-xs">{r.name}</td>
                    <td className="py-2 px-1">{r.degree}</td>
                    <td className="py-2 px-1 text-gray-600">{r.description ?? '—'}</td>
                    <td className="py-2 px-1 text-right">
                      <button onClick={() => del(`${API}/config/risk-levels/${r.name}`)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {/* Subscriptions tab */}
      {tab === 'subscriptions' && (
        <div className="space-y-6">
          <Section title="Create Subscription">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              onSubmit={e => {
                e.preventDefault();
                const tags_filter = {};
                if (newSub.snssai_sst) tags_filter.snssai_sst = newSub.snssai_sst;
                if (newSub.snssai_sd) tags_filter.snssai_sd = newSub.snssai_sd;
                if (newSub.dnn) tags_filter.dnn = newSub.dnn;
                if (newSub.event) tags_filter.event = newSub.event;
                post(`${API}/subscriptions`, {
                  callback_url: newSub.callback_url,
                  event_types: newSub.event_types.split(',').map(s => s.trim()).filter(Boolean),
                  tags_filter,
                });
                setNewSub({ callback_url: '', event_types: '', snssai_sst: '', snssai_sd: '', dnn: '', event: '' });
              }}
            >
              <input className="input sm:col-span-2" placeholder="Callback URL *" required value={newSub.callback_url}
                onChange={e => setNewSub(p => ({ ...p, callback_url: e.target.value }))} />
              <input className="input sm:col-span-2" placeholder="Event types (comma-separated) *" required value={newSub.event_types}
                onChange={e => setNewSub(p => ({ ...p, event_types: e.target.value }))} />
              <input className="input" placeholder="SNSSAI SST filter" value={newSub.snssai_sst}
                onChange={e => setNewSub(p => ({ ...p, snssai_sst: e.target.value }))} />
              <input className="input" placeholder="SNSSAI SD filter" value={newSub.snssai_sd}
                onChange={e => setNewSub(p => ({ ...p, snssai_sd: e.target.value }))} />
              <input className="input" placeholder="DNN filter" value={newSub.dnn}
                onChange={e => setNewSub(p => ({ ...p, dnn: e.target.value }))} />
              <input className="input" placeholder="Event filter" value={newSub.event}
                onChange={e => setNewSub(p => ({ ...p, event: e.target.value }))} />
              <button type="submit" disabled={loading} className="sm:col-span-2 btn-primary">
                Create Subscription
              </button>
            </form>
          </Section>

          <Section title={`Subscriptions (${subscriptions.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Callback</th>
                  <th className="pb-2 font-medium">Events</th>
                  <th className="pb-2 font-medium">Filters</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscriptions.length === 0 && <EmptyRow cols={5} msg="No subscriptions" />}
                {subscriptions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2 px-1 font-mono text-xs text-gray-500">{s.id?.slice(0, 8)}…</td>
                    <td className="py-2 px-1 text-xs truncate max-w-[180px]" title={s.callback_url}>{s.callback_url}</td>
                    <td className="py-2 px-1">
                      <div className="flex flex-wrap gap-1">
                        {(s.event_types ?? []).map(ev => badge(ev, 'blue'))}
                      </div>
                    </td>
                    <td className="py-2 px-1 text-xs text-gray-500">
                      {Object.entries(s.tags_filter?.to_match_dict?.() ?? s.tags_filter ?? {})
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ') || '—'}
                    </td>
                    <td className="py-2 px-1 text-right">
                      <button onClick={() => del(`${API}/subscriptions/${s.id}`)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}
    </div>
  );
}
