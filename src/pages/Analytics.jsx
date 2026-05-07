import React, { useState, useEffect } from 'react';
import SearchableDropdown from '../components/SearchableDropdown';
import FeatureImportanceChart from '../components/FeatureImportanceChart';

const fmtTs = (epoch) => epoch ? new Date(epoch * 1000).toLocaleString() : 'N/A';

const Analytics = () => {
  const mlUrl = '/' + import.meta.env.VITE_ML_HOST;
  const dataStorageUrl = '/' + import.meta.env.VITE_DATA_STORAGE_HOST;

  const STORAGE_KEY = 'aion-analytics-form';
  const [formData, setFormData] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') return { output_field: '', snssai_sst: '', dnn: '', snssai_sd: '', model_id: null, lookback_seconds: 1800, ...saved };
    } catch {}
    return { output_field: '', snssai_sst: '', dnn: '', snssai_sd: '', model_id: null, lookback_seconds: 1800 };
  });

  // Persist form state across navigation
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData)); } catch {}
  }, [formData]);

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explain, setExplain] = useState(false);

  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [fieldsWithModels, setFieldsWithModels] = useState(new Set());
  const [fieldEventMap, setFieldEventMap] = useState({});  // {field: [events]}
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const isAnomaly = formData.output_field === 'anomaly';

  // Derive event from selected field (first from intersection, or first from field's events)
  const derivedEvent = (() => {
    if (isAnomaly || !formData.output_field) return null;
    const events = fieldEventMap[formData.output_field];
    return events?.length > 0 ? events[0] : null;
  })();

  // Fetch field→event map from data-storage
  useEffect(() => {
    fetch(`${dataStorageUrl}/api/v1/processed/fields`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setFieldEventMap(typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`${mlUrl}/v1/fields?include_model_status=true`);
        if (!response.ok) return;
        const data = await response.json();
        const fieldList = (data.fields ?? []).map(f => f.name);
        const allFields = ['anomaly', ...fieldList];
        setFields(allFields);
        setFieldsWithModels(new Set((data.fields ?? []).filter(f => f.has_models).map(f => f.name)));
        if (allFields.length > 0) setFormData(prev => ({ ...prev, output_field: allFields[0] }));
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, []);

  useEffect(() => {
    if (!formData.output_field) return;
    setModels([]);
    setFormData(prev => ({ ...prev, model_id: null }));
    if (isAnomaly || !fieldsWithModels.has(formData.output_field)) return;
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch(`${mlUrl}/v1/models?output_field=${encodeURIComponent(formData.output_field)}`);
        if (response.ok) setModels(await response.json());
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [formData.output_field, fieldsWithModels]);

  const fetchPrediction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const tags = {
        snssai_sst: formData.snssai_sst,
        dnn: formData.dnn,
        ...(formData.snssai_sd ? { snssai_sd: formData.snssai_sd } : {}),
        ...(derivedEvent ? { event: derivedEvent } : {}),
      };

      const endpoint = isAnomaly ? `${mlUrl}/v1/anomaly/detect` : `${mlUrl}/v1/inference`;
      const body = isAnomaly
        ? { tags, model_id: formData.model_id || undefined, lookback_seconds: formData.lookback_seconds, explain }
        : { output_field: formData.output_field, tags, model_id: formData.model_id, explain };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errMsg;
        try {
          const errBody = await response.json();
          if (errBody.detail) {
            if (Array.isArray(errBody.detail)) {
              errMsg = errBody.detail.map(d => `${d.loc?.slice(1).join('.') || 'input'}: ${d.msg}`).join('; ');
            } else if (typeof errBody.detail === 'object' && errBody.detail.message) {
              errMsg = errBody.detail.message;
            } else {
              errMsg = errBody.detail;
            }
          } else {
            errMsg = `Request failed with status ${response.status}`;
          }
        } catch {
          errMsg = `Request failed with status ${response.status}`;
        }
        setError(errMsg);
        return;
      }

      setPrediction(await response.json());
    } catch (err) {
      setError(`Failed to fetch prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const noModelsAvailable = !loadingModels && models.length === 0 && formData.output_field && !isAnomaly;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Analytics Predictions</h2>
        <p className="text-sm text-gray-500">Run forecast or anomaly detection on network data</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Parameters</h3>
        <form onSubmit={fetchPrediction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Output Field */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">Output Field</label>
                {derivedEvent && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded uppercase bg-blue-100 text-blue-800">{derivedEvent}</span>
                )}
              </div>
              <SearchableDropdown
                options={fields}
                value={formData.output_field}
                onChange={(field) => setFormData(prev => ({ ...prev, output_field: field }))}
                placeholder={loadingFields ? 'Loading...' : 'Search fields...'}
                disabled={loadingFields}
                loading={loadingFields}
                recentSearchKey="analytics-fields"
                formatOption={(f) => f === 'anomaly' ? 'Anomaly Detection' : fieldsWithModels.has(f) ? f : `${f} (no model)`}
                filterOption={(f, term) => (f === 'anomaly' ? 'anomaly detection' : f).toLowerCase().includes(term.toLowerCase())}
              />
            </div>

            {/* Network Tags */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">S-NSSAI SST <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. 1" value={formData.snssai_sst} onChange={e => setFormData(prev => ({ ...prev, snssai_sst: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNN <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. internet" value={formData.dnn} onChange={e => setFormData(prev => ({ ...prev, dnn: e.target.value }))} required />
                </div>
              </div>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="S-NSSAI SD (optional)" value={formData.snssai_sd} onChange={e => setFormData(prev => ({ ...prev, snssai_sd: e.target.value }))} />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <SearchableDropdown
                options={[null, ...models.map(m => m.id)]}
                value={formData.model_id}
                onChange={(id) => setFormData(prev => ({ ...prev, model_id: id }))}
                placeholder={loadingModels ? 'Loading models...' : 'Best model (auto)'}
                disabled={loadingModels || noModelsAvailable}
                loading={loadingModels}
                recentSearchKey="analytics-models"
                formatOption={(id) => {
                  if (!id) return 'Best model (auto)';
                  const m = models.find(m => m.id === id);
                  return m ? `${m.name} – ${m.id.slice(0, 8)}` : id;
                }}
                filterOption={(id, term) => {
                  if (!id) return 'best model auto'.includes(term.toLowerCase());
                  const m = models.find(m => m.id === id);
                  return (m ? `${m.name} ${m.id}` : id).toLowerCase().includes(term.toLowerCase());
                }}
              />
              {noModelsAvailable && <p className="mt-1 text-xs text-yellow-700">No trained models for this field.</p>}
            </div>

            {/* Lookback (anomaly) / Explain (both) */}
            <div className="space-y-3">
              {isAnomaly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lookback <span className="text-gray-400 font-normal text-xs">(seconds, default 30min)</span>
                  </label>
                  <input
                    type="number" min="60" max="2592000"
                    value={formData.lookback_seconds}
                    onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setFormData(prev => ({ ...prev, lookback_seconds: Math.min(Math.max(60, v), 2592000) })); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={explain}
                  onChange={e => setExplain(e.target.checked)}
                  disabled={noModelsAvailable}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Include local explanation (KernelSHAP)
                  {isAnomaly && <span className="ml-1 text-xs text-gray-400">— anomalous windows only</span>}
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!isAnomaly && noModelsAvailable) || !formData.snssai_sst.trim() || !formData.dnn.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
            {loading ? 'Fetching...' : isAnomaly ? 'Run Anomaly Detection' : 'Get Prediction'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-900 mb-1">Error</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {prediction && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900">{isAnomaly ? 'Anomaly Detection Results' : 'Prediction Results'}</h3>
            <p className="text-sm text-gray-500">
              sst={formData.snssai_sst} dnn={formData.dnn}{formData.snssai_sd ? ` sd=${formData.snssai_sd}` : ''}
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* ── FORECAST ── */}
            {!isAnomaly && <>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm space-y-1.5">
                <div className="flex gap-2">
                  <span className="w-28 text-gray-500 shrink-0">Model</span>
                  <span className="font-medium text-gray-900">
                    {prediction.model_name} (v{prediction.model_version}{prediction.architecture ? `, ${prediction.architecture}` : ''})
                    <span className="ml-2 text-gray-400 font-normal text-xs">{prediction.model_id}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-gray-500 shrink-0">Lookahead</span>
                  <span>{prediction.forecast_steps} steps × {prediction.window_duration_seconds}s = <strong>{prediction.forecast_steps * prediction.window_duration_seconds}s</strong></span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-gray-500 shrink-0">Input data</span>
                  <span className="font-mono text-xs">
                    {fmtTs(prediction.input_data_start)} → {fmtTs(prediction.input_data_end)}
                    <span className="ml-2 text-gray-400">({prediction.lookback_steps} windows)</span>
                  </span>
                </div>
              </div>

              {prediction.predictions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Predictions — <span className="font-normal text-gray-500">{formData.output_field}</span></h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Step</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Window Start</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Window End</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {prediction.predictions.map(p => (
                          <tr key={p.step} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-600">{p.step}</td>
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{fmtTs(p.window_start_time)}</td>
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{fmtTs(p.window_end_time)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-900">
                              {p.values[formData.output_field] != null ? p.values[formData.output_field].toFixed(4) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prediction.explanation && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Local Explanation</h4>
                    <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600 rounded uppercase">{prediction.explanation.method}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Baseline: <span className="font-mono font-medium text-gray-700">{prediction.explanation.baseline?.toFixed(4)}</span> · Positive = pushed above baseline.</p>
                  <FeatureImportanceChart
                    importances={Object.fromEntries(Object.entries(prediction.explanation.attributions).map(([k, v]) => [k, { mean: v }]))}
                    metric="shap"
                    computedAt={prediction.explanation.computed_at}
                  />
                </div>
              )}
            </>}

            {/* ── ANOMALY ── */}
            {isAnomaly && (() => {
              const models = prediction.models ?? {};
              const counts = prediction.anomaly_counts ?? {};
              const results = prediction.results ?? [];

              return <>
                {/* Model summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(models).map(([id, m]) => {
                    const countStr = counts[id] ?? '0/0';
                    const [anom, total] = countStr.split('/').map(Number);
                    const hasAnomaly = anom > 0;
                    return (
                      <div key={id} className={`rounded-lg border p-4 ${hasAnomaly ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 text-sm">{m.name}</span>
                          <span className={`text-lg font-bold font-mono ${hasAnomaly ? 'text-red-700' : 'text-green-700'}`}>{countStr}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div>Threshold: <span className="font-mono">{m.threshold?.toFixed(6)}</span></div>
                          <div>Window: {m.window_duration_seconds}s</div>
                          <div>Fields: {m.fields?.join(', ')}</div>
                        </div>
                        {hasAnomaly && <p className="mt-2 text-xs font-semibold text-red-700">{anom} anomalous window{anom > 1 ? 's' : ''} detected</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Per-model window scores */}
                {results.map(result => {
                  const hasScores = result.scores?.length > 0;
                  const anomalousWindows = result.scores?.filter(s => s.is_anomaly) ?? [];
                  return (
                    <div key={result.model_id}>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">{result.model_name}</h4>
                        <span className="text-xs text-gray-400">threshold: <span className="font-mono">{result.threshold_value?.toFixed(6)}</span></span>
                        <span className="text-xs text-gray-400">{result.num_anomalies}/{result.num_windows} windows</span>
                      </div>

                      {hasScores && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Window Start</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Error</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {result.scores.map((s, i) => (
                                <tr key={i} className={s.is_anomaly ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{fmtTs(s.window_start_time)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-gray-900">{s.reconstruction_error?.toFixed(6)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.is_anomaly ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                      {s.is_anomaly ? 'ANOMALY' : 'OK'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* SHAP explanations for anomalous windows */}
                      {anomalousWindows.filter(s => s.explanation).map((s, i) => (
                        <div key={i} className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-red-700">Explanation — anomalous window @ {fmtTs(s.window_start_time)}</span>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded uppercase">{s.explanation.method}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">Baseline error: <span className="font-mono">{s.explanation.baseline?.toFixed(6)}</span> · Reconstruction error: <span className="font-mono">{s.reconstruction_error?.toFixed(6)}</span></p>
                          <FeatureImportanceChart
                            importances={Object.fromEntries(Object.entries(s.explanation.attributions).map(([k, v]) => [k, { mean: v }]))}
                            metric="shap"
                            computedAt={s.explanation.computed_at}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}

                {results.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No per-window results returned. Enable explain or check model training.</p>
                )}
              </>;
            })()}

          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
