import React, { useState, useEffect } from 'react';
import SearchableDropdown from '../components/SearchableDropdown';

const Analytics = () => {
  const dataStorageUrl ='/' + import.meta.env.VITE_DATA_STORAGE_HOST;
  const mlUrl = '/' + import.meta.env.VITE_ML_HOST;

  const [formData, setFormData] = useState({
    output_field: '',
    cell_index: 26379009,
    model_id: null,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cellList, setCellList] = useState([]);
  const [loadingCells, setLoadingCells] = useState(true);

  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [fieldsWithModels, setFieldsWithModels] = useState(new Set());

  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available cells on mount
  useEffect(() => {
    const fetchCells = async () => {
      try {
        const response = await fetch(`${dataStorageUrl}/api/v1/cell`);
        if (response.ok) {
          const data = await response.json();
          setCellList(data);
          if (data.length > 0 && !formData.cell_index) {
            setFormData(prev => ({ ...prev, cell_index: data[0] }));
          }
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } finally {
        setLoadingCells(false);
      }
    };
    fetchCells();
  }, []);

  // Fetch available output fields on mount (with model status)
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`${mlUrl}/v1/fields?include_model_status=true`);
        if (!response.ok) return;
        const data = await response.json();
        const fieldList = (data.fields ?? []).map(f => f.name);

        // Add anomaly as a special field
        const allFields = ['anomaly', ...fieldList];
        setFields(allFields);

        // Don't add anomaly to fieldsWithModels - it's a special case
        const fieldsWithModelsSet = new Set(
          (data.fields ?? []).filter(f => f.has_models).map(f => f.name)
        );
        setFieldsWithModels(fieldsWithModelsSet);

        if (allFields.length > 0) {
          setFormData(prev => ({ ...prev, output_field: allFields[0] }));
        }
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, []);

  // Fetch models when output_field changes, only if that field has trained models
  useEffect(() => {
    if (!formData.output_field) return;

    setModels([]);
    setFormData(prev => ({ ...prev, model_id: null }));

    // Skip fetching models for anomaly - it always uses best model
    if (formData.output_field === 'anomaly') return;

    if (!fieldsWithModels.has(formData.output_field)) return;

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch(
          `${mlUrl}/v1/models?output_field=${encodeURIComponent(formData.output_field)}`
        );
        if (response.ok) {
          const data = await response.json();
          setModels(data);
        }
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [formData.output_field, fieldsWithModels]);

  const handleFieldChange = (e) => {
    setFormData(prev => ({ ...prev, output_field: e.target.value }));
  };

  const fetchPrediction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Use different endpoint for anomaly detection
      const endpoint = formData.output_field === 'anomaly'
        ? `${mlUrl}/v1/anomaly/detect`
        : `${mlUrl}/v1/inference`;

      const body = formData.output_field === 'anomaly'
        ? { cell_id: formData.cell_index }
        : {
            output_field: formData.output_field,
            cell_id: formData.cell_index,
            model_id: formData.model_id,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errMsg;
        try {
          const errBody = await response.json();

          // Parse error detail from backend
          if (errBody.detail) {
            if (Array.isArray(errBody.detail)) {
              // Pydantic validation errors
              errMsg = errBody.detail.map(d => {
                const field = d.loc?.slice(1).join('.') || 'input';
                return `${field}: ${d.msg}`;
              }).join('; ');
            } else if (typeof errBody.detail === 'object' && errBody.detail.message) {
              // Structured error with message
              errMsg = errBody.detail.message;
            } else {
              // Simple string error
              errMsg = errBody.detail;
            }
          } else {
            // Fallback messages when no detail provided
            switch (response.status) {
              case 404:
                errMsg = 'Resource not found. The requested model or data does not exist.';
                break;
              case 422:
                errMsg = 'Validation error. Please check your input parameters.';
                break;
              case 500:
                errMsg = 'Internal server error. Please try again later.';
                break;
              default:
                errMsg = `Request failed with status ${response.status}`;
            }
          }
        } catch (parseError) {
          // Failed to parse error response
          errMsg = `Request failed with status ${response.status}. Unable to parse error details.`;
        }
        setError(errMsg);
        return;
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(`Failed to fetch prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const noModelsAvailable = !loadingModels && models.length === 0 && formData.output_field && formData.output_field !== 'anomaly';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Predictions</h2>
        <p className="text-sm text-gray-600">
          Get ML predictions for network metrics including latency, throughput and more
        </p>
      </div>

      {/* Request Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Parameters</h3>
        <form onSubmit={fetchPrediction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Output Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Field
              </label>
              <SearchableDropdown
                options={fields}
                value={formData.output_field}
                onChange={(field) => handleFieldChange({ target: { value: field } })}
                placeholder={loadingFields ? 'Loading...' : fields.length > 0 ? 'Search fields...' : 'No fields available'}
                disabled={loadingFields}
                loading={loadingFields}
                recentSearchKey="analytics-fields"
                formatOption={(f) => {
                  if (f === 'anomaly') return 'Anomaly Detection';
                  return fieldsWithModels.has(f) ? f : `${f} (no model)`;
                }}
                filterOption={(f, term) => {
                  const label = f === 'anomaly' ? 'anomaly detection' : f;
                  return label.toLowerCase().includes(term.toLowerCase());
                }}
              />
            </div>

            {/* Cell ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cell ID {cellList.length > 0 && `(${cellList.length} available)`}
              </label>
              <SearchableDropdown
                options={cellList}
                value={formData.cell_index}
                onChange={(cell) => setFormData(prev => ({ ...prev, cell_index: cell }))}
                placeholder={loadingCells ? "Loading cells..." : cellList.length > 0 ? "Search or select a cell..." : "Enter cell ID manually"}
                disabled={loadingCells}
                loading={loadingCells}
                recentSearchKey="analytics-cells"
                formatOption={(cell) => cell.toString()}
                filterOption={(cell, searchTerm) => cell.toString().startsWith(searchTerm)}
              />
            </div>

            {/* HORIZON - commented out, may be re-enabled later */}
            {/*
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horizon (seconds)
              </label>
              <select
                name="horizon"
                value={formData.horizon}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={configLoading}
              >
                {configLoading ? (
                  <option>Loading...</option>
                ) : config?.inference_types ? (
                  config.inference_types
                    .filter(t => t.name === formData.analytics_type)
                    .map(t => (
                      <option key={`${t.name}-${t.horizon}`} value={t.horizon}>
                        {t.horizon}s - {t.description}
                      </option>
                    ))
                ) : (
                  <>
                    <option value={60}>60s</option>
                    <option value={300}>300s</option>
                  </>
                )}
              </select>
            </div>
            */}

            {/* Model (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model {formData.output_field !== 'anomaly' && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              <SearchableDropdown
                options={formData.output_field === 'anomaly' ? [null] : [null, ...models.map(m => m.id)]}
                value={formData.model_id}
                onChange={(id) => setFormData(prev => ({ ...prev, model_id: id }))}
                placeholder={loadingModels ? 'Loading models...' : 'Search models...'}
                disabled={formData.output_field === 'anomaly' || loadingModels || noModelsAvailable}
                loading={loadingModels}
                recentSearchKey="analytics-models"
                formatOption={(id) => {
                  if (id === null || id === undefined) return 'Best model (auto)';
                  const m = models.find(m => m.id === id);
                  return m ? `${m.name} – ${m.id}` : id;
                }}
                filterOption={(id, term) => {
                  if (id === null || id === undefined) return 'best model auto'.includes(term.toLowerCase());
                  const m = models.find(m => m.id === id);
                  const label = m ? `${m.name} ${m.id}` : id;
                  return label.toLowerCase().includes(term.toLowerCase());
                }}
              />
              {formData.output_field === 'anomaly' && (
                <p className="mt-1 text-sm text-blue-700">
                  Anomaly detection uses the best available model.
                </p>
              )}
              {noModelsAvailable && formData.output_field !== 'anomaly' && (
                <p className="mt-1 text-sm text-yellow-700">
                  No trained models available for this field.
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || noModelsAvailable}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching Prediction...
              </span>
            ) : (
              'Get Prediction'
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div>
              <p className="font-semibold text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Results */}
      {prediction && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {formData.output_field === 'anomaly' ? 'Anomaly Detection Results' : 'Prediction Results'}
            </h3>
            <p className="text-sm text-gray-600">Inference for Cell ID: {formData.cell_index}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Model info + timing summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-32 text-gray-500 shrink-0">Model</dt>
                  <dd className="text-gray-900 font-medium">
                    {prediction.model_name} (v{prediction.model_version}{prediction.architecture && `, ${prediction.architecture}`})
                    {prediction.model_id && (
                      <span className="ml-2 text-gray-400 font-normal text-xs">{prediction.model_id}</span>
                    )}
                  </dd>
                </div>
                {formData.output_field !== 'anomaly' && (
                  <>
                    <div className="flex gap-2">
                      <dt className="w-32 text-gray-500 shrink-0">Lookahead</dt>
                      <dd className="text-gray-900">
                        {prediction.forecast_steps} steps x {prediction.window_duration_seconds}s
                        {' '}= <span className="font-medium">{prediction.forecast_steps * prediction.window_duration_seconds}s total</span>
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-32 text-gray-500 shrink-0">Input data</dt>
                      <dd className="text-gray-900">
                        {prediction.input_data_start && prediction.input_data_end ? (
                          <>
                            <span className="font-mono text-xs">
                              {new Date(prediction.input_data_start * 1000).toLocaleString()}
                            </span>
                            {' '}&rarr;{' '}
                            <span className="font-mono text-xs">
                              {new Date(prediction.input_data_end * 1000).toLocaleString()}
                            </span>
                            <span className="ml-2 text-gray-500">
                              ({prediction.lookback_steps} windows, {((prediction.input_data_end - prediction.input_data_start) / 1).toFixed(0)}s duration)
                            </span>
                          </>
                        ) : (
                          <span>{prediction.lookback_steps} x {prediction.window_duration_seconds}s lookback</span>
                        )}
                      </dd>
                    </div>
                    {prediction.window_overlap != null && (
                      <div className="flex gap-2">
                        <dt className="w-32 text-gray-500 shrink-0">Window overlap</dt>
                        <dd className="text-gray-900">
                          <span className="font-medium">{prediction.window_overlap}s</span>
                          <span className="ml-2 text-gray-500">
                            (step size: {prediction.window_duration_seconds - prediction.window_overlap}s)
                          </span>
                        </dd>
                      </div>
                    )}
                  </>
                )}
                {formData.output_field === 'anomaly' && (
                  <>
                    <div className="flex gap-2">
                      <dt className="w-32 text-gray-500 shrink-0">Window Size</dt>
                      <dd className="text-gray-900">
                        {prediction.lookback_steps} x {prediction.window_duration_seconds}s
                        {' '}= <span className="font-medium">{prediction.lookback_steps * prediction.window_duration_seconds}s</span>
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-32 text-gray-500 shrink-0">Threshold</dt>
                      <dd className="text-gray-900 font-mono">
                        {prediction.threshold?.toFixed(4) ?? 'N/A'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* Anomaly Detection Results */}
            {formData.output_field === 'anomaly' && prediction.results && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Anomaly Detection</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Address</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Anomalies</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prediction.results.map((result, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 font-mono text-xs">
                            {result.ip_src}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {result.num_anomalies} / {result.num_windows}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-900">
                            {(() => {
                              const scores = result.scores ?? [];
                              if (!Array.isArray(scores) || scores.length === 0) return 'N/A';
                              const sum = scores.reduce((acc, w) => {
                                const v = typeof w.reconstruction_error === 'number' ? w.reconstruction_error : parseFloat(w.reconstruction_error);
                                return acc + (Number.isFinite(v) ? v : 0);
                              }, 0);
                              const avg = sum / scores.length;
                              return Number.isFinite(avg) ? avg.toFixed(4) : 'N/A';
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Forecast Predictions list */}
            {formData.output_field !== 'anomaly' && prediction.predictions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Predictions - <span className="font-normal text-gray-500">{formData.output_field}</span>
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Step</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Window Start</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Window End</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prediction.predictions.map((p) => (
                        <tr key={p.step} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">
                            {p.step}
                          </td>
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                            {p.window_start_time
                              ? new Date(p.window_start_time * 1000).toLocaleString()
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                            {p.window_end_time
                              ? new Date(p.window_end_time * 1000).toLocaleString()
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-900">
                            {p.values[formData.output_field] != null
                              ? p.values[formData.output_field].toFixed(4)
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
