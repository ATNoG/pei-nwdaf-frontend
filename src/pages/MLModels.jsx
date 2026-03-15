import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useConfig } from '../contexts/ConfigContext';

// Toast
const Toast = ({ message, onClose }) => {
  if (!message) return null;
  const colors = message.type === 'success'
    ? 'bg-green-50 border-green-300 text-green-900'
    : message.type === 'info'
      ? 'bg-blue-50 border-blue-300 text-blue-900'
      : 'bg-red-50 border-red-300 text-red-900';
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm w-full ${colors}`}>
      <p className="text-sm font-medium flex-1">{message.text}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ModelCard
const ModelCard = memo(({ model, onShowDetails, onShowInfo, onTrain, onSetDefault, onDelete, isDefault, isTraining, copiedId, onCopyId }) => {
  const isBestForAny = model.best_for_fields?.length > 0;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow [container-type:inline-size]">
      {/* Header: name+badges left, buttons right - stacks when card is narrow (large font sizes) */}
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 break-words">{model.name || 'Unnamed Model'}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded font-mono">
              v{model.latest_version ?? 'N/A'}
            </span>
            {model.architecture && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded uppercase">
                {model.architecture}
              </span>
            )}
            {model.modelType === 'anomaly' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded uppercase">
                anomaly
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-2 min-h-[22px]">
            {isBestForAny && model.best_for_fields.map(field => (
              <span key={field} className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Best for: {field}
              </span>
            ))}
          </div>
        </div>

        <div className="model-card-actions shrink-0 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => onShowDetails(model)}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
              title="View model configuration"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Details
            </button>
            <button
              onClick={() => onShowInfo(model)}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Info
            </button>
            <button
              onClick={() => onTrain(model)}
              disabled={isTraining}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Train
            </button>
          </div>
          <div className="flex gap-2">
            {!isBestForAny && model.modelType !== 'anomaly' && (
              <button
                onClick={() => onSetDefault(model)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                title="Set as default model"
              >
                Force
              </button>
            )}
            <button
              onClick={() => onDelete(model)}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
              title="Delete model instance"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
          {/* /model-card-actions */}
        </div>
        {/* /flex-wrap header */}
      </div>

      <hr className="border-gray-200 mt-1 mb-3" />
      <div className="space-y-2 text-sm">
        {model.created_at && (
          <div className="flex justify-between">
            <span className="text-gray-600">Created at:</span>
            <span className="font-medium text-gray-900">
              {new Date(model.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {model.last_trained_at && (
          <div className="flex justify-between">
            <span className='text-gray-600'>Last trained at:</span>
            <span className="font-medium text-gray-900">
              {new Date(model.last_trained_at).toLocaleString()}
            </span>
          </div>
        )}
        {model.id && (
          <div className="flex justify-between items-center">
            <span className='text-gray-600'>ID:</span>
            <div className="flex items-center gap-2 ml-2 min-w-0">
              <span className="font-medium text-gray-900 truncate font-mono text-xs" title={model.id}>
                {model.id}
              </span>
              <button
                onClick={() => onCopyId(model.id, model.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
                title="Copy model ID"
              >
                {copiedId === model.id ? (
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  const modelSame = prevProps.model.id === nextProps.model.id &&
    prevProps.model.created_at === nextProps.model.created_at &&
    prevProps.model.latest_version === nextProps.model.latest_version &&
    prevProps.model.architecture === nextProps.model.architecture &&
    JSON.stringify(prevProps.model.best_for_fields) === JSON.stringify(nextProps.model.best_for_fields);
  const isDefaultSame = prevProps.isDefault === nextProps.isDefault;
  const isTrainingSame = prevProps.isTraining === nextProps.isTraining;
  const copiedIdSame = prevProps.copiedId === nextProps.copiedId;
  return modelSame && isDefaultSame && isTrainingSame && copiedIdSame;
});

// CreateModelModal
const FieldCheckboxes = ({ fieldKey, label, fields, loadingFields, selected, onToggle }) => {
  const allSelected = fields.length > 0 && fields.every(f => selected.includes(f));
  const toggleAll = () => onToggle(allSelected ? [] : [...fields], fieldKey, true);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
        {!loadingFields && fields.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>
      {loadingFields ? (
        <p className="text-sm text-gray-500">Loading fields...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {fields.map(f => (
              <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(f)}
                  onChange={() => onToggle(f, fieldKey)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-gray-700 truncate">{f}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateModelModal = memo(({ showCreateModal, setShowCreateModal, handleCreateModel, mlUrl }) => {
  const [formData, setFormData] = useState({
    name: '',
    architecture: 'ann',
    input_fields: [],
    output_fields: [],
    window_duration_seconds: 60,
    lookback_steps: 30,
    forecast_steps: 5,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hiddenSize, setHiddenSize] = useState(32);
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [isAnomaly, setIsAnomaly] = useState(false);

  useEffect(() => {
    if (!showCreateModal) {
      // Reset form when modal closes
      setIsAnomaly(false);
      setFormData({
        name: '',
        architecture: 'ann',
        input_fields: [],
        output_fields: [],
        window_duration_seconds: 60,
        lookback_steps: 30,
        forecast_steps: 5,
      });
      setShowAdvanced(false);
      setHiddenSize(32);
      return;
    }
    const fetchFields = async () => {
      setLoadingFields(true);
      try {
        const response = await fetch(`${mlUrl}/v1/fields`);
        if (response.ok) {
          const data = await response.json();
          setFields((data.fields ?? []).map(f => (typeof f === 'object' ? f.name : f)));
        }
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, [showCreateModal, mlUrl]);

  if (!showCreateModal) return null;

  const toggleField = (field, key, bulk = false) => {
    setFormData(prev => ({
      ...prev,
      [key]: bulk ? field : prev[key].includes(field) ? prev[key].filter(f => f !== field) : [...prev[key], field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    const body = isAnomaly
      ? {
        name: formData.name,
        config: {
          input_fields: formData.input_fields,
          window_duration_seconds: parseInt(formData.window_duration_seconds),
          lookback_steps: parseInt(formData.lookback_steps),
        },
      }
      : {
        name: formData.name,
        config: {
          architecture: formData.architecture,
          input_fields: formData.input_fields,
          output_fields: formData.output_fields,
          window_duration_seconds: parseInt(formData.window_duration_seconds),
          lookback_steps: parseInt(formData.lookback_steps),
          forecast_steps: parseInt(formData.forecast_steps),
          ...(showAdvanced ? { hidden_size: parseInt(hiddenSize) } : {}),
        },
      };
    await handleCreateModel(body, isAnomaly);
    setIsCreating(false);
  };


  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col max-h-[90vh]">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Create new Instance</h3>
            <p className="text-sm text-gray-600 mt-1">Instantiate a model</p>
          </div>
          <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/ /g, '_') })}
              placeholder="e.g. latency_ann_60"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              pattern="\S+"
              title="Model name cannot contain spaces"
            />
          </div>

          {/* Anomaly Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anomaly-checkbox"
              checked={isAnomaly}
              onChange={(e) => setIsAnomaly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="anomaly-checkbox" className="text-sm font-medium text-gray-700 cursor-pointer">
              Anomaly Detection Model
            </label>
          </div>

          {/* Architecture - Hidden for anomaly */}
          {!isAnomaly && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Architecture <span className="text-red-500">*</span></label>
              <select
                value={formData.architecture}
                onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="ann">ANN</option>
                <option value="lstm">LSTM</option>
              </select>
            </div>
          )}

          {/* Input Fields */}
          <FieldCheckboxes fieldKey="input_fields" label="Input Fields" fields={fields} loadingFields={loadingFields} selected={formData.input_fields} onToggle={toggleField} />

          {/* Output Fields - Hidden for anomaly */}
          {!isAnomaly && (
            <FieldCheckboxes fieldKey="output_fields" label="Output Fields" fields={fields} loadingFields={loadingFields} selected={formData.output_fields} onToggle={toggleField} />
          )}

          {/* Steps grid */}
          <div className={`grid gap-3 ${isAnomaly ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Window (s) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={formData.window_duration_seconds}
                onChange={(e) => setFormData({ ...formData, window_duration_seconds: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lookback steps <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={formData.lookback_steps}
                onChange={(e) => setFormData({ ...formData, lookback_steps: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {!isAnomaly && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Forecast steps <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={formData.forecast_steps}
                  onChange={(e) => setFormData({ ...formData, forecast_steps: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
          </div>

          {/* Advanced Settings Toggle - Hidden for anomaly */}
          {!isAnomaly && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Settings
                </button>
              </div>

              {showAdvanced && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hidden Size (default 32)</label>
                    <input
                      type="number"
                      min="1"
                      value={hiddenSize}
                      onChange={(e) => setHiddenSize(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4 flex-shrink-0 border-t border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-white">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || formData.input_fields.length === 0 || (!isAnomaly && formData.output_fields.length === 0)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Creating...</>
              ) : 'Create Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ForceFieldPickerModal
const ForceFieldPickerModal = ({ model, fields, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState(fields[0] ?? '');
  if (!model) return null;
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Set Best Model</h3>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{model.name}</span> has multiple output fields. Choose which field to set this model as best for:
        </p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {fields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={() => onConfirm(selected)} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// AllJobsModal

const AllJobsModal = ({ showModal, setShowModal, mlUrl, onJobsUpdate }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const intervalRef = useRef(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch forecast training jobs
      const forecastResponse = await fetch(`${mlUrl}/v1/training/jobs`);
      let forecastJobs = [];
      if (forecastResponse.ok) {
        const data = await forecastResponse.json();
        forecastJobs = Array.isArray(data) ? data : [];
      }

      // Fetch anomaly training jobs
      let anomalyJobs = [];
      try {
        const anomalyResponse = await fetch(`${mlUrl}/v1/anomaly/training/jobs`);
        if (anomalyResponse.ok) {
          const data = await anomalyResponse.json();
          anomalyJobs = Array.isArray(data) ? data : [];
        }
      } catch (err) {
        console.warn('Failed to fetch anomaly jobs:', err.message);
      }

      // Merge and sort both job types
      const allJobs = [...forecastJobs, ...anomalyJobs];
      const sorted = allJobs.sort((a, b) => {
        const aActive = a.status === 'running' || a.status === 'pending';
        const bActive = b.status === 'running' || b.status === 'pending';
        if (aActive !== bActive) return aActive ? -1 : 1;
        return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
      });

      setJobs(sorted);
      onJobsUpdate?.(sorted.filter(j => j.status === 'running' || j.status === 'pending').length);
    } catch (err) {
      console.error('Failed to fetch jobs:', err.message);
    } finally {
      setLoading(false);
    }
  }, [mlUrl, onJobsUpdate]);

  useEffect(() => {
    if (!showModal) return;
    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, 5000);
    return () => clearInterval(intervalRef.current);
  }, [showModal, fetchJobs]);

  if (!showModal) return null;

  const statusBadge = (status) => {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    if (status === 'completed') return `${base} bg-green-100 text-green-800`;
    if (status === 'failed') return `${base} bg-red-100 text-red-800`;
    if (status === 'running') return `${base} bg-yellow-100 text-yellow-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Training Jobs</h3>
            <p className="text-sm text-gray-600 mt-1">All training jobs across all models</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No training jobs found.</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Job ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Model ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.job_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600" title={job.job_id}>
                        {job.job_id?.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-600" title={job.model_id}>
                            {job.model_id?.slice(0, 8)}…
                          </span>
                          <button
                            onClick={() => copyToClipboard(job.model_id, job.model_id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy model ID"
                          >
                            {copiedId === job.model_id ? (
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={statusBadge(job.status)}>{job.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex-shrink-0">
          <p className="text-xs text-gray-500 text-center">Auto-refreshes every 5s while open</p>
        </div>
      </div>
    </div>
  );
};

// JobHistoryModal
const JobHistoryModal = memo(({ showModal, setShowModal, selectedModel, jobs, loadingJobs }) => {
  if (!showModal || !selectedModel) return null;

  const statusBadge = (status) => {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    if (status === 'completed') return `${base} bg-green-100 text-green-800`;
    if (status === 'failed') return `${base} bg-red-100 text-red-800`;
    if (status === 'running') return `${base} bg-yellow-100 text-yellow-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Training Job History</h3>
            <p className="text-sm text-gray-600 mt-1">{selectedModel.name}</p>
          </div>
          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-60 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Loading job history...</p>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No training jobs found for this model.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Job ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.job_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 truncate max-w-[120px]" title={job.job_id}>
                        {job.job_id?.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-2">
                        <span className={statusBadge(job.status)}>{job.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={() => setShowModal(false)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

// Model Details Modal
const ModelDetailsModal = memo(({ showModal, setShowModal, selectedModel, loadingDetails, modelDetails, mlUrl }) => {
  if (!showModal || !selectedModel) return null;

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="p-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading model details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!modelDetails) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-12 text-center">
            <p className="text-gray-500">No model details available</p>
            <button onClick={() => setShowModal(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
          </div>
        </div>
      </div>
    );
  }

  const config = modelDetails.config || {};

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Model Details</h3>
            <p className="text-sm text-gray-600 mt-1">{modelDetails.name}</p>
          </div>
          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">ID:</span>
                <span className="ml-2 font-mono text-xs text-gray-900 break-all">{modelDetails.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Architecture:</span>
                <span className="ml-2 font-medium text-gray-900 uppercase">{modelDetails.architecture ?? config.architecture ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Version:</span>
                <span className="ml-2 font-medium text-gray-900">v{modelDetails.latest_version ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {modelDetails.created_at ? new Date(modelDetails.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Config */}
          {Object.keys(config).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Configuration</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
                {config.input_fields?.length > 0 && (
                  <div>
                    <span className="text-gray-600">Input Fields:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {config.input_fields.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                {config.output_fields?.length > 0 && (
                  <div>
                    <span className="text-gray-600">Output Fields:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {config.output_fields.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-mono">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {config.window_duration_seconds != null && (
                    <div><span className="text-gray-600">Window:</span> <span className="font-medium text-gray-900">{config.window_duration_seconds}s</span></div>
                  )}
                  {config.lookback_steps != null && (
                    <div><span className="text-gray-600">Lookback:</span> <span className="font-medium text-gray-900">{config.lookback_steps} steps</span></div>
                  )}
                  {config.forecast_steps != null && (
                    <div><span className="text-gray-600">Forecast:</span> <span className="font-medium text-gray-900">{config.forecast_steps} steps</span></div>
                  )}
                  {config.hidden_size != null && (
                    <div><span className="text-gray-600">Hidden Size:</span> <span className="font-medium text-gray-900">{config.hidden_size}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Training Info */}
          {(modelDetails.last_trained_at || modelDetails.training_loss != null || modelDetails.mlflow_run_id) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Training Information</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                {modelDetails.last_trained_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Trained:</span>
                    <span className="font-medium text-gray-900">{new Date(modelDetails.last_trained_at).toLocaleString()}</span>
                  </div>
                )}
                {modelDetails.training_loss != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Training Loss:</span>
                    <span className="font-medium text-gray-900">{modelDetails.training_loss?.toFixed(4)}</span>
                  </div>
                )}
                {modelDetails.mlflow_run_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">MLflow Run ID:</span>
                    <span className="font-mono text-xs text-gray-900">{modelDetails.mlflow_run_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex gap-3">
            <a
              href={selectedModel.modelType === 'anomaly'
                ? `${mlUrl}/v1/anomaly/models/${modelDetails.id}`
                : `${mlUrl}/v1/models/${modelDetails.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center text-sm"
            >
              View JSON
            </a>
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Train Modal
const TrainModal = ({ model, lookbackSeconds, setLookbackSeconds, onConfirm, onCancel, isTraining }) => {
  if (!model) return null;
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Train Model</h3>
        <p className="text-sm text-gray-600">{model.name}</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lookback window (seconds)</label>
          <input
            type="number"
            min="1"
            value={lookbackSeconds}
            onChange={(e) => setLookbackSeconds(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Amount of historical data to train on.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isTraining}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isTraining}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTraining ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Starting...</> : 'Start Training'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main MLModels page
const MLModels = () => {
  const mlUrl = '/' + import.meta.env.VITE_ML_HOST;
  const mlflowUrl = import.meta.env.VITE_MLFLOW_URL || 'http://localhost:5000';
  const { config, loading: configLoading, refetch: refetchConfig } = useConfig();

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasLoadedRef = useRef(false);

  // Field filter
  const [filterField, setFilterField] = useState('');
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Modal state
  const [showJobHistoryModal, setShowJobHistoryModal] = useState(false);
  const [showAllJobsModal, setShowAllJobsModal] = useState(false);
  const [forceTarget, setForceTarget] = useState(null);
  const [forceFields, setForceFields] = useState([]);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  // Job history
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Model details
  const [modelDetails, setModelDetails] = useState(null);
  const [loadingModelDetails, setLoadingModelDetails] = useState(false);

  // Training
  const [trainingModelIds, setTrainingModelIds] = useState(new Set());
  const [trainingMessage, setTrainingMessage] = useState(null);
  const trainingMessageTimerRef = useRef(null);
  const setTimedTrainingMessage = useCallback((msg) => {
    clearTimeout(trainingMessageTimerRef.current);
    setTrainingMessage(msg);
    if (msg) {
      trainingMessageTimerRef.current = setTimeout(() => setTrainingMessage(null), 5000);
    }
  }, []);
  const [trainModalOpen, setTrainModalOpen] = useState(false);
  const [trainTarget, setTrainTarget] = useState(null);
  const [lookbackSeconds, setLookbackSeconds] = useState(3600);
  const pollingRef = useRef(null);

  // Copy to clipboard
  const [copiedId, setCopiedId] = useState(null);
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isDefaultModel = useCallback((modelName) => {
    if (!config?.inference_types) return false;
    return config.inference_types.some(inference => {
      const expectedName = `${inference.name}_${inference.default_model}_${inference.horizon}`;
      return modelName === expectedName;
    });
  }, [config?.inference_types]);

  // Fetch fields on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`${mlUrl}/v1/fields?include_model_status=true`);
        if (response.ok) {
          const data = await response.json();
          setFields((data.fields ?? []).map(f => (typeof f === 'object' ? f.name : f)));
        }
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, [mlUrl]);

  const fetchModels = useCallback(async (field = filterField) => {
    const isInitial = !hasLoadedRef.current;
    try {
      setError(null);
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);

      // Fetch forecast models (skip field filter if filtering by anomaly)
      const forecastUrl = (field && field !== 'anomaly')
        ? `${mlUrl}/v1/models?output_field=${encodeURIComponent(field)}&include_details=true`
        : `${mlUrl}/v1/models?include_details=true`;
      const forecastResponse = await fetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error(`HTTP error! status: ${forecastResponse.status}`);
      const forecastData = await forecastResponse.json();
      const forecastModels = (Array.isArray(forecastData) ? forecastData : [forecastData]).map(m => ({
        ...m,
        modelType: 'forecast'
      }));

      // Fetch anomaly models
      let anomalyModels = [];
      try {
        const anomalyResponse = await fetch(`${mlUrl}/v1/anomaly/models`);
        if (anomalyResponse.ok) {
          const anomalyData = await anomalyResponse.json();
          const summaries = Array.isArray(anomalyData) ? anomalyData : [anomalyData];
          anomalyModels = await Promise.all(
            summaries.map(async (m) => {
              try {
                const detailRes = await fetch(`${mlUrl}/v1/anomaly/models/${m.id}`);
                if (detailRes.ok) return { ...(await detailRes.json()), modelType: 'anomaly' };
              } catch { }
              return { ...m, modelType: 'anomaly' };
            })
          );
        }
      } catch (err) {
        console.warn('Failed to fetch anomaly models:', err.message);
      }

      // Combine and sort
      const allModels = [...forecastModels, ...anomalyModels];
      setModels(allModels.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setLastUpdated(new Date());
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch models:', err.message);
      if (isInitial) {
        setError(`Failed to load models: ${err.message}`);
        setModels([]);
      } else {
        setTimedTrainingMessage({ type: 'error', text: `Failed to refresh models: ${err.message}` });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [mlUrl, filterField]);

  useEffect(() => {
    fetchModels(filterField);
  }, [filterField]);

  const fetchJobHistory = useCallback(async (model) => {
    setLoadingJobs(true);
    setJobs([]);
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/training/jobs?model_id=${model.id}`
        : `${mlUrl}/v1/training/jobs?model_id=${model.id}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const raw = Array.isArray(data) ? data : [];
        setJobs(raw.sort((a, b) => {
          const aActive = a.status === 'running' || a.status === 'pending';
          const bActive = b.status === 'running' || b.status === 'pending';
          if (aActive !== bActive) return aActive ? -1 : 1;
          return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
        }));
      }
    } catch (err) {
      console.error('Failed to fetch job history:', err.message);
    } finally {
      setLoadingJobs(false);
    }
  }, [mlUrl]);

  const fetchModelDetails = useCallback(async (model) => {
    setLoadingModelDetails(true);
    setModelDetails(null);
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/models/${model.id}`
        : `${mlUrl}/v1/models/${model.id}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setModelDetails(await response.json());
    } catch (err) {
      console.error('Failed to fetch model details:', err.message);
    } finally {
      setLoadingModelDetails(false);
    }
  }, [mlUrl]);

  const startPollingJob = useCallback((jobId, modelId, modelName, modelType) => {
    pollingRef.current = pollingRef.current || {};
    if (pollingRef.current[modelId]) clearInterval(pollingRef.current[modelId]);
    pollingRef.current[modelId] = setInterval(async () => {
      try {
        const endpoint = modelType === 'anomaly'
          ? `${mlUrl}/v1/anomaly/training/jobs/${jobId}`
          : `${mlUrl}/v1/training/jobs/${jobId}`;
        const response = await fetch(endpoint);
        if (!response.ok) return;
        const job = await response.json();
        setTimedTrainingMessage({ type: 'info', text: `Training job ${jobId.slice(0, 8)}… - ${job.status} (${modelName})` });
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollingRef.current[modelId]);
          delete pollingRef.current[modelId];
          setTrainingModelIds(prev => { const next = new Set(prev); next.delete(modelId); return next; });
          setTimedTrainingMessage({
            type: job.status === 'completed' ? 'success' : 'error',
            text: job.status === 'completed'
              ? `Training completed for ${modelName}`
              : `Training failed for ${modelName}: ${job.error_message || 'unknown error'}`,
          });
          fetchModels(filterField);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  }, [mlUrl, fetchModels, filterField]);

  // Cleanup all polling intervals on unmount
  useEffect(() => () => {
    if (pollingRef.current) Object.values(pollingRef.current).forEach(clearInterval);
  }, []);

  const handleModelTraining = useCallback(async () => {
    if (!trainTarget) return;
    setTrainingModelIds(prev => new Set([...prev, trainTarget.id]));
    setTimedTrainingMessage(null);
    try {
      const endpoint = trainTarget.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/training/train`
        : `${mlUrl}/v1/training/train`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: trainTarget.id, lookback_seconds: lookbackSeconds }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTimedTrainingMessage({ type: 'info', text: `Training started for ${trainTarget.name} (job ${data.job_id?.slice(0, 8)}…)` });
      setTrainModalOpen(false);
      startPollingJob(data.job_id, trainTarget.id, trainTarget.name, trainTarget.modelType);
    } catch (err) {
      console.error('Failed to start training:', err.message);
      setTimedTrainingMessage({ type: 'error', text: `Failed to start training: ${err.message}` });
      setTrainingModelIds(prev => { const next = new Set(prev); next.delete(trainTarget.id); return next; });
      setTrainModalOpen(false);
    }
  }, [mlUrl, trainTarget, lookbackSeconds, startPollingJob]);

  const setModelAsBest = useCallback(async (model, outputField) => {
    setTimedTrainingMessage(null);
    try {
      const response = await fetch(`${mlUrl}/v1/performance/${encodeURIComponent(outputField)}/set-best/${model.id}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        throw new Error((detail && typeof detail === 'object' ? detail.message : detail) || `HTTP error! status: ${response.status}`);
      }
      setTimedTrainingMessage({ type: 'success', text: `${model.name} is now the best model for ${outputField}` });
      await fetchModels(filterField);
      if (refetchConfig) await refetchConfig();
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to set best model: ${err.message}` });
    }
  }, [mlUrl, fetchModels, filterField, refetchConfig]);

  const handleSetAsDefault = useCallback(async (model) => {
    setTimedTrainingMessage(null);
    try {
      const response = await fetch(`${mlUrl}/v1/models/${model.id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const details = await response.json();
      const outputFields = details.config?.output_fields ?? [];
      if (outputFields.length === 0) {
        setTimedTrainingMessage({ type: 'error', text: `Model ${model.name} has no output fields defined.` });
        return;
      }
      if (outputFields.length === 1) {
        await setModelAsBest(model, outputFields[0]);
      } else {
        setForceTarget(model);
        setForceFields(outputFields);
      }
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to fetch model details: ${err.message}` });
    }
  }, [mlUrl, setModelAsBest]);

  const handleDeleteModel = useCallback(async (model) => {
    if (!confirm(`Are you sure you want to delete ${model.name}? This action cannot be undone.`)) return;
    setTimedTrainingMessage(null);
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/models/${model.id}`
        : `${mlUrl}/v1/models/${model.id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        throw new Error((detail && typeof detail === 'object' ? detail.message : detail) || `HTTP error! status: ${response.status}`);
      }
      setTimedTrainingMessage({ type: 'success', text: `Model ${model.name} deleted successfully` });
      await fetchModels(filterField);
      if (refetchConfig) await refetchConfig();
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to delete model: ${err.message}` });
    }
  }, [mlUrl, fetchModels, filterField, refetchConfig]);

  const handleCreateModel = useCallback(async (formData, isAnomaly = false) => {
    setTimedTrainingMessage(null);
    try {
      const endpoint = isAnomaly
        ? `${mlUrl}/v1/anomaly/models`
        : `${mlUrl}/v1/models`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        throw new Error((detail && typeof detail === 'object' ? detail.message : detail) || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTimedTrainingMessage({ type: 'success', text: `Model ${data.name} created successfully` });
      setShowCreateModal(false);
      await fetchModels(filterField);
      if (refetchConfig) await refetchConfig();
      return true;
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to create model: ${err.message}` });
      return false;
    }
  }, [mlUrl, fetchModels, filterField, refetchConfig]);

  const handleShowDetails = useCallback((model) => {
    setSelectedModel(model);
    setShowDetailsModal(true);
    fetchModelDetails(model);
  }, [fetchModelDetails]);

  const handleShowInfo = useCallback((model) => {
    setSelectedModel(model);
    setShowJobHistoryModal(true);
    fetchJobHistory(model);
  }, [fetchJobHistory]);

  const handleTrain = useCallback((model) => {
    setTrainTarget(model);
    setTrainModalOpen(true);
  }, []);

  const handleSetDefault = useCallback((model) => handleSetAsDefault(model), [handleSetAsDefault]);
  const handleDelete = useCallback((model) => handleDeleteModel(model), [handleDeleteModel]);

  return (
    <>
      <Toast message={trainingMessage} onClose={() => setTimedTrainingMessage(null)} />
      <CreateModelModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        handleCreateModel={handleCreateModel}
        mlUrl={mlUrl}
      />
      {forceTarget && (
        <ForceFieldPickerModal
          model={forceTarget}
          fields={forceFields}
          onConfirm={async (field) => {
            setForceTarget(null);
            await setModelAsBest(forceTarget, field);
          }}
          onCancel={() => setForceTarget(null)}
        />
      )}
      <AllJobsModal
        showModal={showAllJobsModal}
        setShowModal={setShowAllJobsModal}
        mlUrl={mlUrl}
        onJobsUpdate={setActiveJobCount}
      />
      <JobHistoryModal
        showModal={showJobHistoryModal}
        setShowModal={setShowJobHistoryModal}
        selectedModel={selectedModel}
        jobs={jobs}
        loadingJobs={loadingJobs}
      />
      <ModelDetailsModal
        showModal={showDetailsModal}
        setShowModal={setShowDetailsModal}
        selectedModel={selectedModel}
        loadingDetails={loadingModelDetails}
        modelDetails={modelDetails}
        mlUrl={mlUrl}
      />
      {trainModalOpen && (
        <TrainModal
          model={trainTarget}
          lookbackSeconds={lookbackSeconds}
          setLookbackSeconds={setLookbackSeconds}
          onConfirm={handleModelTraining}
          onCancel={() => setTrainModalOpen(false)}
          isTraining={trainTarget ? trainingModelIds.has(trainTarget.id) : false}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">ML Registry</h2>
              <p className="text-sm text-gray-600 mt-1">Browse and manage ML models</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowAllJobsModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Training Jobs{activeJobCount > 0 && ` (${activeJobCount})`}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Instance
              </button>

              <a
                href={mlflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4v8.82c0 4.52-3.13 8.74-8 9.82-4.87-1.08-8-5.3-8-9.82V8.18l8-4zM11 7v2h2V7h-2zm0 4v6h2v-6h-2z" />
                </svg>
                Open in MLflow
              </a>

              {lastUpdated && (
                <span className="text-xs text-gray-500">Updated: {lastUpdated.toLocaleTimeString()}</span>
              )}
              <button
                onClick={() => fetchModels(filterField)}
                disabled={isRefreshing}
                className="w-24 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-gray-50 border-y border-none px-6 py-3 -mx-6">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[300px]">
                <input
                  type="text"
                  placeholder="Search models by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Field Filter */}
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter by field..."
                    value={fieldSearchQuery || filterField}
                    onChange={(e) => {
                      setFieldSearchQuery(e.target.value);
                      setShowFieldDropdown(true);
                    }}
                    onFocus={() => setShowFieldDropdown(true)}
                    onBlur={() => setTimeout(() => setShowFieldDropdown(false), 200)}
                    disabled={loadingFields}
                    className="pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50 w-56"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {showFieldDropdown && (
                  <div className="absolute top-full mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {[{ value: '', label: 'All fields' }, { value: 'anomaly', label: 'Anomaly' }, ...fields.map(f => ({ value: f, label: f }))]
                      .filter(option =>
                        !fieldSearchQuery ||
                        option.label.toLowerCase().includes(fieldSearchQuery.toLowerCase())
                      )
                      .map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFilterField(option.value);
                            setFieldSearchQuery('');
                            setShowFieldDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${filterField === option.value ? 'bg-blue-100 font-medium' : ''
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterField) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterField('');
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Models Grid */}
        {loading && models.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading models...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-red-200 p-8 shadow-sm">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-2">Error Loading Models</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button onClick={() => fetchModels(filterField)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 shadow-sm text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">No Models Found</p>
            <p className="text-sm text-gray-600">
              {filterField ? `No models trained for field "${filterField}"` : 'No ML models are currently registered'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models
                .filter(model => {
                  // Filter by field
                  if (filterField === 'anomaly') {
                    // Only show anomaly models
                    if (model.modelType !== 'anomaly') return false;
                  } else if (filterField) {
                    // Only show forecast models when a specific field is selected
                    if (model.modelType === 'anomaly') return false;
                  }

                  // Filter by search query
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    model.name?.toLowerCase().includes(query) ||
                    model.id?.toLowerCase().includes(query)
                  );
                })
                .map((model) => (
                  <ModelCard
                    key={model.id || model.name}
                    model={model}
                    onShowDetails={handleShowDetails}
                    onShowInfo={handleShowInfo}
                    onTrain={handleTrain}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDelete}
                    isDefault={isDefaultModel(model.name)}
                    isTraining={trainingModelIds.has(model.id)}
                    copiedId={copiedId}
                    onCopyId={copyToClipboard}
                  />
                ))}
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600">
                Total Models: <span className="font-semibold text-gray-900">{models.filter(m => {
                  // Filter by field
                  if (filterField === 'anomaly') {
                    // Only show anomaly models
                    if (m.modelType !== 'anomaly') return false;
                  } else if (filterField) {
                    // Only show forecast models when a specific field is selected
                    if (m.modelType === 'anomaly') return false;
                  }

                  // Filter by search query
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return m.name?.toLowerCase().includes(query) || m.id?.toLowerCase().includes(query);
                }).length}</span>
                {filterField && <span className="ml-2 text-gray-400">filtered by <span className="font-mono">{filterField}</span></span>}
                {searchQuery && <span className="ml-2 text-gray-400">matching <span className="font-mono">"{searchQuery}"</span></span>}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MLModels;
