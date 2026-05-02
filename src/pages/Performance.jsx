import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SearchableDropdown from '../components/SearchableDropdown';
import { Line } from 'react-chartjs-2';
import FeatureImportanceChart from '../components/FeatureImportanceChart';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const COLORS = [
  'rgb(59, 130, 246)',
  'rgb(16, 185, 129)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(139, 92, 246)',
  'rgb(236, 72, 153)',
];

// Base shapes per model - ensures each series is identifiable by shape alone,
const POINT_SHAPES = ['circle', 'triangle', 'rect'];

const METRICS = ['rmse', 'mae', 'mse', 'r2'];

const TIME_WINDOWS = [
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'All', ms: null },
];


const StateBadge = ({ state }) => {
  const cfg = {
    MONITORING: { cls: 'bg-green-200 text-green-900', label: 'Monitoring' },
    EVALUATING: { cls: 'bg-yellow-200 text-yellow-900 animate-pulse', label: 'Evaluating…' },
    RETRAINING: { cls: 'bg-blue-200 text-blue-900 animate-pulse', label: 'Retraining' },
  }[state] ?? { cls: 'bg-gray-200 text-gray-700', label: state ?? 'Unknown' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const Performance = () => {
  const mlUrl = '/' + import.meta.env.VITE_ML_HOST;

  const PERF_KEY = 'aion-performance-state';

  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(() => {
    try { return sessionStorage.getItem(PERF_KEY) || ''; } catch { return ''; }
  });

  // Per-field data
  const [status, setStatus] = useState(null);
  const [bestModel, setBestModel] = useState(null);
  const [history, setHistory] = useState(null);
  const [models, setModels] = useState([]);
  const [activeJobs, setActiveJobs] = useState({});

  // Loading states
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Feature importance
  const [importance, setImportance] = useState(null);
  const [loadingImportance, setLoadingImportance] = useState(false);
  const [recomputingImportance, setRecomputingImportance] = useState(false);

  // Actions
  const [metric, setMetric] = useState('rmse');
  const [triggerFilter, setTriggerFilter] = useState(null);
  const [timeWindow, setTimeWindow] = useState(null);
  const [visibleModels, setVisibleModels] = useState(null); // null = default (best model only)
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  // Intervals / timers
  const statusIntervalRef = useRef(null);
  const fastPollRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const actionMsgTimerRef = useRef(null);

  const fetchStatus = useCallback(async (field) => {
    try {
      const res = await fetch(`${mlUrl}/v1/performance/${encodeURIComponent(field)}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      return data;
    } catch { /* ignore */ }
  }, [mlUrl]);

  const fetchBest = useCallback(async (field) => {
    try {
      const res = await fetch(`${mlUrl}/v1/performance/${encodeURIComponent(field)}/best`);
      if (!res.ok) { setBestModel(null); return; }
      setBestModel(await res.json());
    } catch { setBestModel(null); }
  }, [mlUrl]);

  const fetchHistory = useCallback(async (field) => {
    try {
      const res = await fetch(`${mlUrl}/v1/performance/${encodeURIComponent(field)}/history`);
      if (!res.ok) { setHistory(null); return; }
      setHistory(await res.json());
    } catch { setHistory(null); }
  }, [mlUrl]);

  const fetchModels = useCallback(async (field) => {
    try {
      const res = await fetch(`${mlUrl}/v1/models?output_field=${encodeURIComponent(field)}`);
      if (!res.ok) return;
      setModels(await res.json());
    } catch { /* ignore */ }
  }, [mlUrl]);

  const fetchImportance = useCallback(async (field) => {
    setLoadingImportance(true);
    try {
      const res = await fetch(`${mlUrl}/v1/performance/${encodeURIComponent(field)}/importance`);
      setImportance(res.ok ? await res.json() : null);
    } catch { setImportance(null); }
    finally { setLoadingImportance(false); }
  }, [mlUrl]);

  const fetchJobDetails = useCallback(async (jobIds) => {
    if (!jobIds?.length) { setActiveJobs({}); return; }
    const results = await Promise.all(
      jobIds.map(id =>
        fetch(`${mlUrl}/v1/training/jobs/${id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    const map = {};
    results.forEach((job, i) => { if (job) map[jobIds[i]] = job; });
    setActiveJobs(map);
  }, [mlUrl]);

  useEffect(() => {
    clearTimeout(refreshTimeoutRef.current);
    if (!status?.last_checked_at || !status?.monitoring_interval_seconds || !activeField) return;

    const prevLastCheckedAt = status.last_checked_at;
    const nextCheckAt = new Date(prevLastCheckedAt).getTime() + status.monitoring_interval_seconds * 1000;
    const delay = Math.max(0, nextCheckAt - Date.now());

    const doRefresh = async () => {
      const data = await fetchStatus(activeField);
      fetchBest(activeField);
      fetchHistory(activeField);
      if (data?.active_job_ids?.length) fetchJobDetails(data.active_job_ids);
      // If last_checked_at hasn't advanced yet (backend still processing), retry in 15s
      if (data?.last_checked_at === prevLastCheckedAt) {
        refreshTimeoutRef.current = setTimeout(doRefresh, 15000);
      }
      // Otherwise the useEffect re-runs with the new last_checked_at and reschedules naturally
    };

    refreshTimeoutRef.current = setTimeout(doRefresh, delay);
    return () => clearTimeout(refreshTimeoutRef.current);
  }, [status?.last_checked_at, status?.monitoring_interval_seconds, activeField, fetchStatus, fetchBest, fetchHistory, fetchJobDetails]);

  const showActionMsg = useCallback((type, text) => {
    setActionMsg({ type, text });
    if (actionMsgTimerRef.current) clearTimeout(actionMsgTimerRef.current);
    actionMsgTimerRef.current = setTimeout(() => setActionMsg(null), 4000);
  }, []);

  const toggleModel = useCallback((modelId) => {
    setVisibleModels(prev => {
      const bestId = bestModel?.model_id;
      const base = prev ?? new Set(bestId ? [bestId] : []);
      const next = new Set(base);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }, [bestModel?.model_id]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${mlUrl}/v1/fields`);
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.fields ?? []).map(f => f.name ?? f);
        setFields(list);
        if (list.length > 0) setActiveField(list[0]);
      } finally {
        setLoadingFields(false);
      }
    };
    load();
  }, [mlUrl]);

  useEffect(() => {
    if (!activeField) return;

    // Clear previous intervals
    clearInterval(statusIntervalRef.current);
    clearTimeout(refreshTimeoutRef.current);

    // Reset state
    setStatus(null);
    setBestModel(null);
    setHistory(null);
    setModels([]);
    setActiveJobs({});
    setVisibleModels(null);
    setImportance(null);

    setLoadingData(true);

    // Parallel initial fetch
    Promise.all([
      fetchStatus(activeField),
      fetchBest(activeField),
      fetchHistory(activeField),
      fetchModels(activeField),
      fetchImportance(activeField),
    ]).then(([statusData]) => {
      if (statusData?.active_job_ids?.length) {
        fetchJobDetails(statusData.active_job_ids);
      }
    }).finally(() => setLoadingData(false));

    // 5s status poll
    statusIntervalRef.current = setInterval(async () => {
      const data = await fetchStatus(activeField);
      if (data?.active_job_ids?.length) {
        fetchJobDetails(data.active_job_ids);
      } else {
        setActiveJobs({});
      }
    }, 5000);

    return () => {
      clearInterval(statusIntervalRef.current);
      clearTimeout(refreshTimeoutRef.current);
    };
  }, [activeField, fetchStatus, fetchBest, fetchHistory, fetchModels, fetchJobDetails, fetchImportance]);

  // 2s fast-poll while an action is running (so state badge updates immediately)
  useEffect(() => {
    if (!actionLoading || !activeField) {
      clearInterval(fastPollRef.current);
      return;
    }
    fastPollRef.current = setInterval(() => fetchStatus(activeField), 2000);
    return () => clearInterval(fastPollRef.current);
  }, [actionLoading, activeField, fetchStatus]);

  const handleRecomputeImportance = async () => {
    if (!bestModel?.model_id) return;
    setRecomputingImportance(true);
    try {
      const res = await fetch(
        `${mlUrl}/v1/performance/${encodeURIComponent(activeField)}/models/${encodeURIComponent(bestModel.model_id)}/importance`,
        { method: 'POST' }
      );
      if (res.ok) setImportance(await res.json());
    } catch { /* ignore */ }
    finally { setRecomputingImportance(false); }
  };

  const handleEvaluate = async () => {
    setActionLoading('evaluate');
    setStatus(prev => prev ? { ...prev, state: 'evaluating' } : prev);
    try {
      const res = await fetch(
        `${mlUrl}/v1/performance/${encodeURIComponent(activeField)}/evaluate?metric=${encodeURIComponent(metric)}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showActionMsg('error', err.detail ?? `Evaluate failed (HTTP ${res.status})`);
      } else {
        showActionMsg('success', 'Evaluation triggered successfully.');
        await Promise.all([fetchBest(activeField), fetchHistory(activeField)]);
      }
    } catch (e) {
      showActionMsg('error', e.message);
    } finally {
      setActionLoading(null);
      fetchStatus(activeField);
    }
  };

  const handleMonitor = async () => {
    setActionLoading('monitor');
    try {
      const res = await fetch(
        `${mlUrl}/v1/performance/${encodeURIComponent(activeField)}/monitor`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showActionMsg('error', err.detail ?? `Monitor failed (HTTP ${res.status})`);
      } else {
        showActionMsg('success', 'Monitor check triggered.');
        await fetchStatus(activeField);
      }
    } catch (e) {
      showActionMsg('error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const chartData = useMemo(() => {
    const allEntries = history?.entries ?? [];
    const now = Date.now();
    const timeFiltered = timeWindow
      ? allEntries.filter(e => new Date(e.measured_at).getTime() >= now - timeWindow)
      : allEntries;
    const entries = triggerFilter ? timeFiltered.filter(e => e.trigger === triggerFilter) : timeFiltered;
    if (!entries.length) {
      if (!timeWindow) return null;
      const allTimes = [new Date(now - timeWindow).toISOString(), new Date(now).toISOString()];
      const fmt = (t) => {
        const d = new Date(t);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      };
      return { labels: allTimes.map(fmt), datasets: [], _models: [], _times: allTimes };
    }

    const bestModelId = bestModel?.model_id;

    const byModel = {};
    entries.forEach(h => { (byModel[h.model_id] ??= []).push(h); });

    // Sort each model's entries by time
    Object.values(byModel).forEach(pts => pts.sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at)));

    // All timestamps as labels (union, sorted) - with boundary ticks for fixed windows
    const dataTimes = [...new Set(entries.map(e => e.measured_at))].sort();
    const allTimes = timeWindow
      ? [...new Set([new Date(now - timeWindow).toISOString(), ...dataTimes, new Date(now).toISOString()])].sort()
      : dataTimes;
    const fmt = (t) => {
      const d = new Date(t);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm} ${hh}:${min}`;
    };
    const labels = allTimes.map(fmt);

    const allModelIds = [...models].reverse().map(m => m.id);
    const stableIndex = (modelId) => {
      const idx = allModelIds.indexOf(modelId);
      if (idx === -1) {
        let h = 0;
        for (let c of modelId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return h % COLORS.length;
      }
      return idx;
    };

    const modelMeta = [];
    const alignedDatasets = Object.entries(byModel)
      .sort(([a], [b]) => stableIndex(a) - stableIndex(b))
      .map(([modelId, pts]) => {
      const modelName = models.find(m => m.id === modelId)?.name ?? modelId.slice(0, 8);
      const isBest = modelId === bestModelId;
      const si = stableIndex(modelId);
      const color = COLORS[si % COLORS.length];
      modelMeta.push({ modelId, modelName, color, isBest });
      const ptMap = Object.fromEntries(pts.map(p => [p.measured_at, p]));
      const aligned = allTimes.map(t => ptMap[t] ? ptMap[t].score : null);
      const baseShape = POINT_SHAPES[si % POINT_SHAPES.length];
      const styles = allTimes.map(t => ptMap[t]
        ? (ptMap[t].trigger === 'evaluate' ? 'rectRot' : baseShape)
        : baseShape);
      const radii = allTimes.map(t => ptMap[t]
        ? (ptMap[t].trigger === 'evaluate' ? 7 : ptMap[t].trigger === 'monitor' ? 4 : 3)
        : 0);
      const isVisible = visibleModels ? visibleModels.has(modelId) : isBest;
      return {
        label: modelName,
        data: aligned,
        borderColor: color,
        backgroundColor: color + '33',
        pointStyle: styles,
        pointRadius: radii,
        pointHoverRadius: 8,
        pointBackgroundColor: color,
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        tension: 0,
        fill: false,
        spanGaps: false,
        showLine: false,
        hidden: !isVisible,
      };
    });

    return { labels, datasets: alignedDatasets, _models: modelMeta, _times: allTimes };
  }, [history, models, bestModel, triggerFilter, timeWindow, visibleModels]);

  const chartOptions = useMemo(() => {
    const times = chartData?._times ?? [];
    return {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Time' },
          ticks: { maxRotation: 45, maxTicksLimit: 12 },
        },
        y: {
          title: { display: true, text: metric.toUpperCase() },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => {
              const raw = times[items[0]?.dataIndex];
              if (!raw) return '';
              const d = new Date(raw);
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              const sec = String(d.getSeconds()).padStart(2, '0');
              return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec}`;
            },
          },
        },
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
    };
  }, [chartData?._times, metric]);

  if (loadingFields) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fields.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center text-gray-500">
        No fields available from the ML service.
      </div>
    );
  }

  const degradationPct = bestModel?.baseline_score
    ? ((bestModel.score - bestModel.baseline_score) / Math.abs(bestModel.baseline_score)) * 100
    : null;
  const evalThreshold = bestModel?.baseline_score != null && status?.monitoring_degradation_factor != null
    ? bestModel.baseline_score * status.monitoring_degradation_factor
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-64">
            <SearchableDropdown
              options={fields}
              value={activeField}
              onChange={(v) => { setActiveField(v); try { sessionStorage.setItem(PERF_KEY, v); } catch {} }}
              placeholder="Search fields..."
              recentSearchKey="performance-fields"
              formatOption={(f) => f}
            />
          </div>

        </div>

        <hr className="border-gray-200" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* TODO: Metric selector
              <select
                value={metric}
                onChange={e => setMetric(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {METRICS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
              */}
            <button
              onClick={handleEvaluate}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {actionLoading === 'evaluate' && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
              Evaluate
            </button>
            <button
              onClick={handleMonitor}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {actionLoading === 'monitor' && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
              Monitor
            </button>
          </div>

          {/* State - badge + timing + active jobs */}
          {status && (
            <div className="flex items-center gap-3">
              <StateBadge state={status.state} />
              {status.last_checked_at && (
                <span className="text-xs text-gray-400">
                  Last check{' '}
                  <span className="text-gray-600 font-medium">
                    {new Date(status.last_checked_at).toLocaleTimeString()}
                  </span>
                  {status.monitoring_interval_seconds && (
                    <>
                      {' · '}Next{' '}
                      <span className="text-gray-600 font-medium">
                        {new Date(new Date(status.last_checked_at).getTime() + status.monitoring_interval_seconds * 1000).toLocaleTimeString()}
                      </span>
                    </>
                  )}
                </span>
              )}
              {status.state === 'RETRAINING' && status.active_job_ids?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {status.active_job_ids.map(jobId => {
                    const job = activeJobs[jobId];
                    return (
                      <div key={jobId} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 shrink-0" />
                        <span className="font-mono text-blue-700">{jobId.slice(0, 8)}…</span>
                        {job?.progress != null && <span className="text-blue-500">{job.progress}%</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className={`rounded-lg p-3 text-sm font-medium ${actionMsg.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          {actionMsg.text}
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Score History</h3>
                <div className="flex gap-1">
                  {TIME_WINDOWS.map(w => (
                    <button
                      key={w.label}
                      onClick={() => setTimeWindow(w.ms)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${timeWindow === w.ms
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Trigger</span>
                <div className="flex gap-1">
                  {[null, 'evaluate', 'monitor', 'auto_monitor'].map(t => (
                    <button
                      key={t ?? 'all'}
                      onClick={() => setTriggerFilter(t)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${triggerFilter === t
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t ?? 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {chartData?.datasets.length > 0 ? (
              <>
                {/* Model visibility selector */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {chartData._models.map(({ modelId, modelName, color, isBest }) => {
                    const isActive = visibleModels ? visibleModels.has(modelId) : isBest;
                    return (
                      <button
                        key={modelId}
                        onClick={() => toggleModel(modelId)}
                        title={modelId}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-colors ${isActive
                            ? 'text-white border-transparent'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : color }}
                        />
                        {modelName}
                        {isBest && <span className={`text-xs ${isActive ? 'opacity-70' : 'text-gray-400'}`}>★</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="h-80">
                  <Line data={chartData} options={chartOptions} />
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rotate-45 bg-gray-400 rounded-sm" />
                    Evaluate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
                    Monitor
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                    Auto monitor
                  </span>
                </div>
              </>
            ) : chartData ? (
              <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
                No data in this time range.
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
                No score history available for {activeField}.
              </div>
            )}
          </div>

          {/* Right panel - 1/3 width */}
          <div className="space-y-4">
            {/* Best model card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Best Model</h3>
              {bestModel ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{bestModel.model_name}</span>
                      {bestModel.architecture && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-200 text-purple-900 rounded uppercase tracking-wide">
                          {bestModel.architecture}
                        </span>
                      )}
                      {bestModel.latest_version != null && (
                        <span className="px-2 py-0.5 text-xs font-bold font-mono bg-gray-200 text-gray-800 rounded">
                          v{bestModel.latest_version}
                        </span>
                      )}
                    </div>
                  </div>
                  <hr className="border-gray-100" />
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Latest Score</dt>
                      <dd className="font-semibold text-gray-900">
                        {bestModel.score?.toFixed(4)} <span className="text-gray-400 font-normal text-xs">{bestModel.metric ?? metric}</span>
                      </dd>
                    </div>
                    {bestModel.baseline_score != null && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Baseline</dt>
                        <dd className="text-gray-900">
                          {bestModel.baseline_score?.toFixed(4)}
                        </dd>
                      </div>
                    )}
                    {evalThreshold != null && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500" title={`baseline × ${status.monitoring_degradation_factor} - score above this triggers re-evaluation`}>
                          Eval threshold
                        </dt>
                        <dd className={`font-semibold text-xs ${bestModel.score > evalThreshold ? 'text-red-600' : 'text-green-700'}`}>
                          {evalThreshold.toFixed(4)}
                          <span className="ml-1 font-normal text-gray-400">(×{status.monitoring_degradation_factor})</span>
                        </dd>
                      </div>
                    )}
                    {bestModel.last_trained_at && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Last trained</dt>
                        <dd className="text-gray-900 text-xs">{new Date(bestModel.last_trained_at).toLocaleString()}</dd>
                      </div>
                    )}
                    {bestModel.model_id && (
                      <div className="flex justify-between items-center">
                        <dt className="text-gray-500 shrink-0">Model ID</dt>
                        <dd className="font-mono text-xs text-gray-700 truncate ml-2" title={bestModel.model_id}>{bestModel.model_id}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No best model set for {activeField}.</p>
              )}
            </div>

          </div>
        </div>

        {/* Feature Importance panel - only when a best model is elected */}
        {bestModel && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">Feature Importance</h3>
                {importance?.metric && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded uppercase tracking-wide">
                    {importance.metric}
                  </span>
                )}
                <span className="text-xs text-gray-400">best model</span>
              </div>
              <button
                onClick={handleRecomputeImportance}
                disabled={recomputingImportance}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Trigger fresh permutation importance computation"
              >
                {recomputingImportance
                  ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600" />
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                }
                Recompute
              </button>
            </div>

            {loadingImportance ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : importance?.importances ? (
              <FeatureImportanceChart
                importances={importance.importances}
                metric={importance.metric}
                computedAt={importance.computed_at}
              />
            ) : (
              <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                No importance data yet. Click Recompute to generate.
              </div>
            )}
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default Performance;
