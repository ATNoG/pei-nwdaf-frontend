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
        setFields(fieldList);
        setFieldsWithModels(new Set(
          (data.fields ?? []).filter(f => f.has_models).map(f => f.name)
        ));
        if (fieldList.length > 0) {
          setFormData(prev => ({ ...prev, output_field: fieldList[0] }));
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

  const handleModelChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, model_id: val === '' ? null : val }));
  };

  const fetchPrediction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch(`${mlUrl}/v1/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_field: formData.output_field,
          cell_id: formData.cell_index,
          model_id: formData.model_id,
        }),
      });

      if (!response.ok) {
        let errMsg;
        try {
          const errBody = await response.json();
          if (response.status === 404) {
            errMsg = `No best model found for ${formData.output_field}. Run an evaluation first.`;
          } else if (response.status === 422) {
            errMsg = errBody.detail
              ? (Array.isArray(errBody.detail)
                  ? errBody.detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join('; ')
                  : errBody.detail)
              : 'Validation error.';
          } else if (response.status === 500) {
            errMsg = errBody.detail ?? 'Internal server error during inference.';
          } else {
            errMsg = `Unexpected error: HTTP ${response.status}`;
          }
        } catch {
          errMsg = `Unexpected error: HTTP ${response.status}`;
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

  const noModelsAvailable = !loadingModels && models.length === 0 && formData.output_field;

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
              <select
                name="output_field"
                value={formData.output_field}
                onChange={handleFieldChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loadingFields}
              >
                {loadingFields ? (
                  <option>Loading...</option>
                ) : fields.length > 0 ? (
                  <>
                    {fields.some(f => fieldsWithModels.has(f)) && (
                      <optgroup label="With trained models">
                        {fields.filter(f => fieldsWithModels.has(f)).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </optgroup>
                    )}
                    {fields.some(f => !fieldsWithModels.has(f)) && (
                      <optgroup label="No trained models">
                        {fields.filter(f => !fieldsWithModels.has(f)).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  <option value="">No fields available</option>
                )}
              </select>
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
                formatOption={(cell) => cell.toString()}
                filterOption={(cell, searchTerm) => cell.toString().includes(searchTerm)}
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
                Model <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                name="model_id"
                value={formData.model_id ?? ''}
                onChange={handleModelChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loadingModels || noModelsAvailable}
              >
                {loadingModels ? (
                  <option value="">Loading models...</option>
                ) : (
                  <>
                    <option value="">Best model (auto)</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.id}</option>
                    ))}
                  </>
                )}
              </select>
              {noModelsAvailable && (
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
            <h3 className="text-lg font-semibold text-gray-900">Prediction Results</h3>
            <p className="text-sm text-gray-600">Inference for Cell ID: {formData.cell_index}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Model info + timing summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-32 text-gray-500 shrink-0">Model</dt>
                  <dd className="text-gray-900 font-medium">
                    {prediction.model_name} (v{prediction.model_version}, {prediction.architecture})
                    {prediction.model_id && (
                      <span className="ml-2 text-gray-400 font-normal text-xs">{prediction.model_id}</span>
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 text-gray-500 shrink-0">Lookahead</dt>
                  <dd className="text-gray-900">
                    {prediction.forecast_steps} steps x {prediction.window_duration_seconds}s
                    {' '}= <span className="font-medium">{prediction.forecast_steps * prediction.window_duration_seconds}s total</span>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 text-gray-500 shrink-0">History used</dt>
                  <dd className="text-gray-900">
                    {prediction.lookback_steps} x {prediction.window_duration_seconds}s
                    {' '}= <span className="font-medium">{prediction.lookback_steps * prediction.window_duration_seconds}s lookback</span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Predictions list */}
            {prediction.predictions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Predictions - <span className="font-normal text-gray-500">{formData.output_field}</span>
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Step</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prediction.predictions.map((p) => (
                        <tr key={p.step} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">
                            +{p.step * prediction.window_duration_seconds}s
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
