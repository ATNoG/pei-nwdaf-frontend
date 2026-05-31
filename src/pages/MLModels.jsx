import { authFetch } from '../lib/authFetch.js';
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import FeatureImportanceChart from '../components/FeatureImportanceChart';

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

// Policy Status Badge
const PolicyStatusBadge = ({ modelName, policyUrl }) => {
  const [hasPipeline, setHasPipeline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pipelineDetails, setPipelineDetails] = useState([]);
  const [modelMeta, setModelMeta] = useState(null);

  useEffect(() => {
    const fetchPolicyStatus = async () => {
      try {
        // First check if model is registered
        const componentsResponse = await authFetch(`${policyUrl}/components`);
        if (!componentsResponse.ok) return;

        const componentsData = await componentsResponse.json();
        const modelComponent = componentsData.components?.find(
          c => c.component_id === `ml-${modelName}` || c.component_id === modelName
        );

        if (!modelComponent) {
          setHasPipeline(false);
          return;
        }

        // Store model metadata (input/output fields)
        const attrs = modelComponent.attributes || {};
        setModelMeta({
          inputFields: attrs.input_fields || [],
          outputFields: attrs.output_fields || [],
          architecture: attrs.architecture,
          windowDuration: attrs.window_duration_seconds,
        });

        // Check if there are any pipelines (transformers) for this model
        const transformersResponse = await authFetch(`${policyUrl}/transformers`);
        if (!transformersResponse.ok) return;

        const transformersData = await transformersResponse.json();
        const modelPipelineKeys = Object.keys(transformersData).filter(
          key => key.endsWith(`_to_${modelComponent.component_id}`)
        );

        setHasPipeline(modelPipelineKeys.length > 0);

        // Fetch full details for each pipeline
        if (modelPipelineKeys.length > 0) {
          const details = await Promise.all(
            modelPipelineKeys.map(async (pipelineId) => {
              const pipelineResponse = await authFetch(`${policyUrl}/transformers/${pipelineId}`);
              if (!pipelineResponse.ok) return null;
              const pipelineData = await pipelineResponse.json();
              // Extract source from pipeline ID (format: "source_to_ml-modelname")
              const source = pipelineId.replace(`_to_${modelComponent.component_id}`, '');
              return {
                pipelineId,
                source,
                steps: pipelineData.steps || [],
              };
            })
          );
          setPipelineDetails(details.filter(Boolean));
        }
      } catch (err) {
        console.warn('Failed to fetch policy status:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicyStatus();
  }, [modelName, policyUrl]);

  const handleBadgeClick = () => {
    if (hasPipeline) {
      setShowModal(true);
    }
  };

  // Only show badge if model has a saved pipeline
  if (loading || !hasPipeline) return null;

  return (
    <>
      <span
        className="px-2 py-0.5 text-xs font-bold text-blue-600 bg-blue-50 rounded inline-flex items-center leading-5 cursor-pointer hover:bg-blue-100 transition-colors"
        title="Policies Applied - Click to view details"
        onClick={handleBadgeClick}
      >
        <FaShieldAlt className="w-3 h-3" />
      </span>

      {/* Modal for showing policy details */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Policy Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Model input/output fields */}
            {modelMeta && (modelMeta.inputFields.length > 0 || modelMeta.outputFields.length > 0) && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-600 mb-2">Model <strong>{modelName}</strong></p>
                <div className="grid grid-cols-2 gap-3">
                  {modelMeta.inputFields.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Input Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {modelMeta.inputFields.map(field => (
                          <span key={field} className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {modelMeta.outputFields.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Output Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {modelMeta.outputFields.map(field => (
                          <span key={field} className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline steps */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Active Pipelines</p>
              {pipelineDetails.length > 0 ? (
                <div className="space-y-3">
                  {pipelineDetails.map(({ pipelineId, source, steps }) => (
                    <div key={pipelineId} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-mono text-gray-500 mb-2">{source} → {modelName}</p>
                      {steps.length > 0 ? (
                        <div className="space-y-2">
                          {steps.map((step, i) => {
                            const typeLabel = {
                              filter: 'Filter',
                              redaction: 'Redaction',
                              hashing: 'Hashing',
                              substitution: 'Substitution',
                            }[step.type] || step.type;
                            const typeColor = {
                              filter: 'bg-yellow-100 text-yellow-800',
                              redaction: 'bg-red-100 text-red-800',
                              hashing: 'bg-orange-100 text-orange-800',
                              substitution: 'bg-purple-100 text-purple-800',
                            }[step.type] || 'bg-gray-100 text-gray-800';
                            const fields = step.params?.fields || [];
                            return (
                              <div key={i} className="flex flex-wrap items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${typeColor}`}>
                                  {typeLabel}
                                </span>
                                {step.params?.mode && (
                                  <span className="text-xs text-gray-500">({step.params.mode})</span>
                                )}
                                {fields.length > 0 && fields.map(f => (
                                  <span key={f} className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded text-gray-700">
                                    {f}
                                  </span>
                                ))}
                                {step.params?.replacement && (
                                  <span className="text-xs text-gray-400">→ "{step.params.replacement}"</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No transformation steps</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No pipelines configured</p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ModelCard
const ModelCard = memo(({ model, onShowDetails, onTrain, onSetDefault, onDelete, isTraining, copiedId, onCopyId, isNew, policyUrl }) => {
  const isBestForAny = model.best_for_fields?.length > 0;
  const isTrained = model.latest_version != null;
  const eventColor = EVENT_COLORS[model.event_type] || 'bg-gray-100 text-gray-700';

  return (
    <div className={`bg-white rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow [container-type:inline-size] ${isNew ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isTrained ? 'bg-green-400' : 'bg-gray-300'}`} title={isTrained ? `Trained (v${model.latest_version})` : 'Not trained'} />
            <h3 className="text-base font-semibold text-gray-900 break-words leading-tight">{model.name || 'Unnamed Model'}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-bold font-mono rounded ${isTrained ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
              {isTrained ? `v${model.latest_version}` : 'untrained'}
            </span>
            {model.event_type && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide ${eventColor}`}>
                {model.event_type}
              </span>
            )}
            {model.architecture && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded uppercase tracking-wide">
                {model.architecture}
              </span>
            )}
            {model.modelType === 'anomaly' && (
              <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-600 rounded uppercase tracking-wide">
                anomaly
              </span>
            )}
            <PolicyStatusBadge modelName={model.name} policyUrl={policyUrl} />
          </div>
          {isBestForAny && (
            <div className="flex flex-wrap gap-1 mt-2">
              {model.best_for_fields.map(field => (
                <span key={field} className="px-2 py-0.5 text-xs font-bold bg-green-200 text-green-900 rounded-full">
                  ★ {field}
                </span>
              ))}
            </div>
          )}
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
              onClick={() => onTrain(model)}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              {isTraining
                ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white shrink-0"></div>Training</>
                : (<><svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>Train</>)
              }
            </button>
          </div>
          <div className="flex gap-2">
            {!isBestForAny && model.modelType !== 'anomaly' && (
              <button
                onClick={() => onSetDefault(model)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                title="Set as best model"
              >
                Set Best
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

      <hr className="border-gray-100 mt-3 mb-3" />
      <div className="space-y-1.5 text-sm">
        {model.training_loss != null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Training loss:</span>
            <span className="font-mono text-gray-900 text-xs">{Number(model.training_loss).toFixed(6)}</span>
          </div>
        )}
        {model.last_trained_at && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last trained:</span>
            <span className="text-gray-900 text-xs">{new Date(model.last_trained_at).toLocaleString()}</span>
          </div>
        )}
        {model.created_at && (
          <div className="flex justify-between">
            <span className="text-gray-500">Created:</span>
            <span className="text-gray-900 text-xs">{new Date(model.created_at).toLocaleDateString()}</span>
          </div>
        )}
        {model.id && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">ID:</span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-gray-700 truncate font-mono text-xs" title={model.id}>
                {model.id.slice(0, 8)}…
              </span>
              <button
                onClick={() => onCopyId(model.id, model.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
                title="Copy full ID"
              >
                {copiedId === model.id ? (
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const modelSame =
    prevProps.model.id === nextProps.model.id &&
    prevProps.model.created_at === nextProps.model.created_at &&
    prevProps.model.latest_version === nextProps.model.latest_version &&
    prevProps.model.architecture === nextProps.model.architecture &&
    prevProps.model.event_type === nextProps.model.event_type &&
    prevProps.model.training_loss === nextProps.model.training_loss &&
    JSON.stringify(prevProps.model.best_for_fields) === JSON.stringify(nextProps.model.best_for_fields);
  return modelSame && prevProps.isTraining === nextProps.isTraining && prevProps.copiedId === nextProps.copiedId;
});

// CreateModelModal
const FieldCheckboxes = ({ fieldKey, label, fields, loadingFields, selected, onToggle, fieldEventMap = {}, activeEvents = new Set() }) => {
  const [filter, setFilter] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const storageKey = `recent-search-ml-${fieldKey}`;

  // Load recent items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.warn('Failed to load recent items from localStorage:', e);
    }
  }, [storageKey]);

  // Save to recent items when a field is selected
  const handleToggle = (field) => {
    onToggle(field, fieldKey);
    if (!selected.includes(field)) {
      // Field is being selected, add to recent
      try {
        const updatedRecent = [field, ...recentItems.filter(item => item !== field)].slice(0, 5);
        setRecentItems(updatedRecent);
        localStorage.setItem(storageKey, JSON.stringify(updatedRecent));
      } catch (e) {
        console.warn('Failed to save recent item to localStorage:', e);
      }
    }
  };

  // Filter by text, then by active events (only show compatible fields)
  const eventCompatible = activeEvents.size > 0
    ? fields.filter(f => selected.includes(f) || (fieldEventMap[f] || []).some(e => activeEvents.has(e)))
    : fields;
  const visible = eventCompatible.filter(f => f.toLowerCase().includes(filter.toLowerCase()));
  const unselected = visible.filter(f => !selected.includes(f));

  // Recent items that are valid and not currently selected
  const validRecentItems = recentItems
    .filter(item => fields.includes(item) && !selected.includes(item))
    .slice(0, 5);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label} <span className="text-red-500">*</span></label>
      {loadingFields ? (
        <p className="text-sm text-gray-500">Loading fields...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-gray-50">
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
              {selected.map(f => {
                const events = fieldEventMap[f] || [];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleToggle(f)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {events.length > 0 && (
                      <span className="text-blue-400 font-normal">{events[0]}/</span>
                    )}
                    {f}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
          {/* Recent fields - shown when filter is empty and there are recent items */}
          {!filter && validRecentItems.length > 0 && (
            <div className="p-2 border-b border-gray-200 bg-blue-50/50">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent
              </div>
              <div className="flex flex-wrap gap-1">
                {validRecentItems.map(f => (
                  <button
                    key={`recent-${f}`}
                    type="button"
                    onClick={() => handleToggle(f)}
                    className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 text-xs rounded-full hover:bg-blue-100 transition-colors"
                  >
                    + {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Filter input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Filter fields..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          {/* Unselected fields */}
          <div className="max-h-36 overflow-y-auto p-2">
            {unselected.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">{filter ? 'No matches' : 'All fields selected'}</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {unselected.map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggle(f)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <span className="text-gray-700 truncate">{f}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EVENT_COLORS = {
  PERF_DATA: 'bg-blue-50 text-blue-700',
  UE_MOBILITY: 'bg-gray-100 text-gray-600',
  UE_COMM: 'bg-gray-100 text-gray-600',
};

const intersectSets = (sets) => {
  if (sets.length === 0) return new Set();
  let result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter(x => sets[i].includes(x)));
  }
  return result;
};

const CreateModelModal = memo(({ showCreateModal, setShowCreateModal, handleCreateModel, mlUrl, dataStorageUrl }) => {
  const [formData, setFormData] = useState({
    name: '',
    architecture: 'ann',
    input_fields: [],
    output_fields: [],
    window_duration_seconds: 60,
    lookback_steps: 30,
    forecast_steps: 5,
    percentile_threshold: 95.0
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hiddenSize, setHiddenSize] = useState(32);
  const [fieldEventMap, setFieldEventMap] = useState({});  // {field: [events]}
  const [loadingFields, setLoadingFields] = useState(true);
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [availableArchitectures, setAvailableArchitectures] = useState([]);

  useEffect(() => {
    if (!showCreateModal) {
      setIsAnomaly(false);
      setFormData({
        name: '',
        architecture: '',
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
        const response = await authFetch(`${dataStorageUrl}/api/v1/processed/fields`);
        if (response.ok) {
          const data = await response.json();
          setFieldEventMap(typeof data === 'object' && !Array.isArray(data) ? data : {});
        }
      } finally {
        setLoadingFields(false);
      }
    };
    const fetchArchitectures = async () => {
      try {
        const response = await authFetch(`${mlUrl}/v1/architectures`);
        if (response.ok) {
          const data = await response.json();
          setAvailableArchitectures(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, architecture: data[0].name }));
          }
        }
      } catch { }
    };
    fetchFields();
    fetchArchitectures();
  }, [showCreateModal, dataStorageUrl, mlUrl]);

  const allFields = Object.keys(fieldEventMap).sort();

  // Derive active events from all selected fields (intersection)
  const allSelected = [...formData.input_fields, ...formData.output_fields];
  const activeEvents = allSelected.length > 0
    ? intersectSets(allSelected.map(f => fieldEventMap[f] || []))
    : new Set();

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
          percentile_threshold: parseFloat(formData.percentile_threshold),
          ...(showAdvanced ? { hidden_size: parseInt(hiddenSize) } : {}),
        },
      };
    await handleCreateModel(body, isAnomaly);
    setIsCreating(false);
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full flex flex-col max-h-[90vh]">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl rounded-t-lg flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create new Instance</h3>
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
                {availableArchitectures.length === 0 && (
                  <option value="" disabled>No architectures available</option>
                )}
                {availableArchitectures.map(a => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Event preview */}
          {allSelected.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Event:</span>
              {activeEvents.size > 0
                ? [...activeEvents].map(e => (
                  <span key={e} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${EVENT_COLORS[e] || 'bg-gray-100 text-gray-700'}`}>{e}</span>
                ))
                : <span className="text-xs text-red-600 font-medium">No common event — fields incompatible</span>
              }
            </div>
          )}

          {/* Input Fields */}
          <FieldCheckboxes fieldKey="input_fields" label="Input Fields" fields={allFields} loadingFields={loadingFields} selected={formData.input_fields} onToggle={toggleField} fieldEventMap={fieldEventMap} activeEvents={activeEvents} />

          {/* Output Fields - Hidden for anomaly */}
          {!isAnomaly && (
            <FieldCheckboxes fieldKey="output_fields" label="Output Fields" fields={allFields} loadingFields={loadingFields} selected={formData.output_fields} onToggle={toggleField} fieldEventMap={fieldEventMap} activeEvents={activeEvents} />
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
            {!isAnomaly && (
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
            )}
            {isAnomaly && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Percentile threshold <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={formData.percentile_threshold}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value);
                    if (Number.isNaN(v)) {
                      setFormData({ ...formData, percentile_threshold: '' });
                    } else {
                      v = Math.max(1.0, Math.min(99.9, Math.round(v * 10) / 10));
                      setFormData({ ...formData, percentile_threshold: v });
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
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
    const doFallback = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(doFallback);
    } else {
      doFallback();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch forecast training jobs
      const forecastResponse = await authFetch(`${mlUrl}/v1/training/jobs`);
      let forecastJobs = [];
      if (forecastResponse.ok) {
        const data = await forecastResponse.json();
        forecastJobs = Array.isArray(data) ? data : [];
      }

      // Fetch anomaly training jobs
      let anomalyJobs = [];
      try {
        const anomalyResponse = await authFetch(`${mlUrl}/v1/anomaly/training/jobs`);
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
    if (status === 'pending') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Training Jobs</h3>
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
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-gray-600" title={job.job_id}>{job.job_id?.slice(0, 8)}…</span>
                          <button onClick={() => copyToClipboard(job.job_id, job.job_id + "-jid")} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy Job ID">{copiedId === job.job_id + "-jid" ? <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}</button>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-600" title={job.model_id}>
                            {job.model_id?.slice(0, 8)}…
                          </span>
                          <button
                            onClick={() => copyToClipboard(job.model_id, job.job_id + "-mid")}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy model ID"
                          >
                            {copiedId === job.job_id + "-mid" ? (
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

// TrainingModal - combined start training + job history
const TrainingModal = ({ model, mlUrl, onClose, onStartTraining, isTraining }) => {
  const [lookbackSeconds, setLookbackSeconds] = useState(3600);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [cancellingIds, setCancellingIds] = useState(new Set());
  const intervalRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const copyId = (text, id) => {
    const fb = () => { const el = document.createElement("textarea"); el.value = text; el.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); };
    navigator.clipboard?.writeText(text).catch(fb) ?? fb();
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const [resourceCpu, setResourceCpu] = useState('');
  const [resourceMemory, setResourceMemory] = useState('');
  const [loadingResources, setLoadingResources] = useState(true);
  const [savingResources, setSavingResources] = useState(false);
  const [resourceSaveMsg, setResourceSaveMsg] = useState(null);

  useEffect(() => {
    if (!model) return;
    setLoadingResources(true);
    authFetch(`${mlUrl}/v1/resources/defaults/${model.id}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => {
        setResourceCpu(data?.cpu ?? '');
        setResourceMemory(data?.memory ?? '');
      })
      .finally(() => setLoadingResources(false));
  }, [model, mlUrl]);

  const saveResourceDefaults = async () => {
    setSavingResources(true);
    setResourceSaveMsg(null);
    try {
      const res = await authFetch(`${mlUrl}/v1/resources/defaults/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpu: resourceCpu, memory: resourceMemory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResourceSaveMsg({ type: 'success', text: 'Resources saved.' });
    } catch (err) {
      setResourceSaveMsg({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setSavingResources(false);
      setTimeout(() => setResourceSaveMsg(null), 3000);
    }
  };

  const fetchJobs = useCallback(async () => {
    if (!model) return;
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/training/jobs?model_id=${model.id}`
        : `${mlUrl}/v1/training/jobs?model_id=${model.id}`;
      const res = await authFetch(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      const raw = Array.isArray(data) ? data : [];
      setJobs(raw.sort((a, b) => {
        const aActive = a.status === 'running' || a.status === 'pending';
        const bActive = b.status === 'running' || b.status === 'pending';
        if (aActive !== bActive) return aActive ? -1 : 1;
        return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
      }));
    } catch (err) {
      console.error('Failed to fetch job history:', err.message);
    } finally {
      setLoadingJobs(false);
    }
  }, [model, mlUrl]);

  useEffect(() => {
    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchJobs]);

  const cancelJob = async (jobId) => {
    setCancellingIds(prev => new Set([...prev, jobId]));
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/training/jobs/${jobId}`
        : `${mlUrl}/v1/training/jobs/${jobId}`;
      await authFetch(endpoint, { method: 'DELETE' });
      await fetchJobs();
    } catch (err) {
      console.error('Failed to cancel job:', err.message);
    } finally {
      setCancellingIds(prev => { const s = new Set(prev); s.delete(jobId); return s; });
    }
  };

  if (!model) return null;

  const statusBadge = (status) => {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    if (status === 'completed') return `${base} bg-green-100 text-green-800`;
    if (status === 'failed') return `${base} bg-red-100 text-red-800`;
    if (status === 'running') return `${base} bg-yellow-100 text-yellow-800`;
    if (status === 'pending') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Train</h3>
            <p className="text-sm text-gray-600 mt-1">{model.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Resource Defaults */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Training Resources</h4>
            {loadingResources ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Loading…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPU request</label>
                    <input
                      type="text"
                      placeholder="e.g. 500m"
                      value={resourceCpu}
                      onChange={(e) => setResourceCpu(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Memory request</label>
                    <input
                      type="text"
                      placeholder="e.g. 512Mi"
                      value={resourceMemory}
                      onChange={(e) => setResourceMemory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveResourceDefaults}
                    disabled={savingResources || !resourceCpu || !resourceMemory}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {savingResources ? 'Saving…' : 'Save Resources'}
                  </button>
                  {resourceSaveMsg && (
                    <span className={`text-xs font-medium ${resourceSaveMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                      {resourceSaveMsg.text}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Start Training */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Start New Training Run</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lookback window (seconds) <span className="text-gray-400 font-normal text-xs">max 30 days = 2592000</span>
              </label>
              <input
                type="number"
                min="1"
                max="2592000"
                value={lookbackSeconds}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setLookbackSeconds(Math.min(Math.max(1, v), 2592000));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <button
              onClick={() => onStartTraining(lookbackSeconds)}
              disabled={isTraining}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isTraining
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Starting...</>
                : 'Start Training'}
            </button>
          </div>

          {/* Job History */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">History</h4>
            {loadingJobs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No training jobs yet.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Job ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => {
                      const isActive = job.status === 'running' || job.status === 'pending';
                      return (
                        <tr key={job.job_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs text-gray-600" title={job.job_id}>{job.job_id?.slice(0, 8)}…</span>
                              <button onClick={() => copyId(job.job_id, "tm-" + job.job_id)} className="p-0.5 rounded hover:bg-gray-100 transition-colors">{copiedId === "tm-" + job.job_id ? <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}</button>
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
                          <td className="px-4 py-2">
                            {isActive && (
                              <button
                                onClick={() => cancelJob(job.job_id)}
                                disabled={cancellingIds.has(job.job_id)}
                                className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
                              >
                                {cancellingIds.has(job.job_id) ? 'Cancelling…' : 'Cancel'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">Job history auto-refreshes every 5s</p>
        </div>
      </div>
    </div>
  );
};

// Model Details Modal
const ModelDetailsModal = memo(({ showModal, setShowModal, selectedModel, loadingDetails, modelDetails, mlUrl }) => {
  const [importance, setImportance] = useState(null);
  const [loadingImportance, setLoadingImportance] = useState(false);
  const [triggeringImportance, setTriggeringImportance] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const copyToClipboard = (text, id) => {
    const fb = () => { const el = document.createElement("textarea"); el.value = text; el.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); };
    navigator.clipboard?.writeText(text).catch(fb) ?? fb();
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const isAnomaly = selectedModel?.modelType === 'anomaly';
  const config = modelDetails?.config || {};
  const outputField = config.output_fields?.[0] ?? selectedModel?.best_for_fields?.[0] ?? null;

  useEffect(() => {
    if (!showModal || !modelDetails?.id || isAnomaly || !outputField) {
      setImportance(null);
      return;
    }
    setLoadingImportance(true);
    setImportance(null);
    authFetch(`${mlUrl}/v1/performance/${encodeURIComponent(outputField)}/importance?model_id=${encodeURIComponent(modelDetails.id)}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => setImportance(data))
      .finally(() => setLoadingImportance(false));
  }, [showModal, modelDetails?.id, isAnomaly, outputField, mlUrl]);

  const handleRecomputeImportance = async () => {
    if (!outputField || !modelDetails?.id) return;
    setTriggeringImportance(true);
    try {
      const res = await authFetch(
        `${mlUrl}/v1/performance/${encodeURIComponent(outputField)}/models/${encodeURIComponent(modelDetails.id)}/importance`,
        { method: 'POST' }
      );
      if (res.ok) setImportance(await res.json());
    } catch { /* ignore */ }
    finally { setTriggeringImportance(false); }
  };

  if (!showModal || !selectedModel) return null;

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-12 text-center">
            <p className="text-gray-500">No model details available</p>
            <button onClick={() => setShowModal(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Model Details</h3>
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Basic Information</h4>
              {modelDetails.event_type && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide ${EVENT_COLORS[modelDetails.event_type] || 'bg-gray-100 text-gray-700'}`}>
                  {modelDetails.event_type}
                </span>
              )}
              {(modelDetails.architecture ?? config.architecture) && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded uppercase">
                  {modelDetails.architecture ?? config.architecture}
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${modelDetails.latest_version != null ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {modelDetails.latest_version != null ? `v${modelDetails.latest_version}` : 'untrained'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <span className="text-gray-500 text-xs">ID</span>
                <p className="font-mono text-xs text-gray-900 break-all">{modelDetails.id}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Created</span>
                <p className="text-gray-900 text-xs">{modelDetails.created_at ? new Date(modelDetails.created_at).toLocaleString() : 'N/A'}</p>
              </div>
              {modelDetails.last_trained_at && (
                <div>
                  <span className="text-gray-500 text-xs">Last trained</span>
                  <p className="text-gray-900 text-xs">{new Date(modelDetails.last_trained_at).toLocaleString()}</p>
                </div>
              )}
              {modelDetails.training_loss != null && (
                <div>
                  <span className="text-gray-500 text-xs">Training loss</span>
                  <p className="font-mono text-gray-900 text-xs">{Number(modelDetails.training_loss).toFixed(6)}</p>
                </div>
              )}
              {modelDetails.mlflow_run_id && (
                <div>
                  <span className="text-gray-500 text-xs">MLflow Run</span>
                  <p className="font-mono text-xs text-blue-700 truncate" title={modelDetails.mlflow_run_id}>{modelDetails.mlflow_run_id.slice(0, 12)}…</p>
                </div>
              )}
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-900" title={modelDetails.mlflow_run_id}>{modelDetails.mlflow_run_id.slice(0, 12)}…</span>
                      <button onClick={() => copyToClipboard(modelDetails.mlflow_run_id, "mlflow-run-id")} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy MLflow Run ID">{copiedId === "mlflow-run-id" ? <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature Importance - forecast models only */}
          {!isAnomaly && outputField && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">Global Explanation - Feature Importance</h4>
                </div>
                <button
                  onClick={handleRecomputeImportance}
                  disabled={triggeringImportance}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Trigger fresh permutation importance computation"
                >
                  {triggeringImportance
                    ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600" />
                    : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                  Recompute
                </button>
              </div>
              {loadingImportance ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : importance?.importances ? (
                <FeatureImportanceChart
                  importances={importance.importances}
                  axisLabel="Permutation importance"
                  computedAt={importance.computed_at}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  No importance data yet. Click Recompute to generate.
                </div>
              )}
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


// Main MLModels page
const MLModels = () => {
  const mlUrl = '/' + import.meta.env.VITE_ML_HOST;
  const mlflowUrl = import.meta.env.VITE_MLFLOW_URL || 'http://localhost:5000';
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasLoadedRef = useRef(false);

  // Field filter
  const [filterField, setFilterField] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [recentFields, setRecentFields] = useState(() => {
    // Lazy initializer - loads recent fields from localStorage
    try {
      const stored = localStorage.getItem('recent-search-ml-filter-fields');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('Failed to load recent fields from localStorage:', e);
    }
    return [];
  });

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Modal state
  const [showAllJobsModal, setShowAllJobsModal] = useState(false);
  const [forceTarget, setForceTarget] = useState(null);
  const [forceFields, setForceFields] = useState([]);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

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
  const [trainTarget, setTrainTarget] = useState(null);
  const pollingRef = useRef(null);

  // Copy to clipboard
  const [copiedId, setCopiedId] = useState(null);
  const copyToClipboard = (text, id) => {
    const doFallback = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(doFallback);
    } else {
      doFallback();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Track newly created models for highlighting (5 minutes)
  const [newlyCreatedModels, setNewlyCreatedModels] = useState({});
  const isNewlyCreated = useCallback((modelId) => {
    const createdAt = newlyCreatedModels[modelId];
    if (!createdAt) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - createdAt < fiveMinutes;
  }, [newlyCreatedModels]);

  // Fetch fields on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await authFetch(`${mlUrl}/v1/fields?include_model_status=true`);
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
      const forecastResponse = await authFetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error(`HTTP error! status: ${forecastResponse.status}`);
      const forecastData = await forecastResponse.json();
      const forecastModels = (Array.isArray(forecastData) ? forecastData : [forecastData]).map(m => ({
        ...m,
        modelType: 'forecast'
      }));

      // Fetch anomaly models
      let anomalyModels = [];
      try {
        const anomalyResponse = await authFetch(`${mlUrl}/v1/anomaly/models`);
        if (anomalyResponse.ok) {
          const anomalyData = await anomalyResponse.json();
          const summaries = Array.isArray(anomalyData) ? anomalyData : [anomalyData];
          anomalyModels = await Promise.all(
            summaries.map(async (m) => {
              try {
                const detailRes = await authFetch(`${mlUrl}/v1/anomaly/models/${m.id}`);
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

  const fetchModelDetails = useCallback(async (model) => {
    setLoadingModelDetails(true);
    setModelDetails(null);
    try {
      const endpoint = model.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/models/${model.id}`
        : `${mlUrl}/v1/models/${model.id}`;
      const response = await authFetch(endpoint);
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
        const response = await authFetch(endpoint);
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

  const handleModelTraining = useCallback(async (lookbackSeconds) => {
    if (!trainTarget) return;
    setTrainingModelIds(prev => new Set([...prev, trainTarget.id]));
    setTimedTrainingMessage(null);
    try {
      const endpoint = trainTarget.modelType === 'anomaly'
        ? `${mlUrl}/v1/anomaly/training/train`
        : `${mlUrl}/v1/training/train`;
      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: trainTarget.id, lookback_seconds: lookbackSeconds }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTimedTrainingMessage({ type: 'info', text: `Training started for ${trainTarget.name} (job ${data.job_id?.slice(0, 8)}…)` });
      startPollingJob(data.job_id, trainTarget.id, trainTarget.name, trainTarget.modelType);
    } catch (err) {
      console.error('Failed to start training:', err.message);
      setTimedTrainingMessage({ type: 'error', text: `Failed to start training: ${err.message}` });
      setTrainingModelIds(prev => { const next = new Set(prev); next.delete(trainTarget.id); return next; });
    }
  }, [mlUrl, trainTarget, startPollingJob]);

  const setModelAsBest = useCallback(async (model, outputField) => {
    setTimedTrainingMessage(null);
    try {
      const response = await authFetch(`${mlUrl}/v1/performance/${encodeURIComponent(outputField)}/set-best/${model.id}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        throw new Error((detail && typeof detail === 'object' ? detail.message : detail) || `HTTP error! status: ${response.status}`);
      }
      setTimedTrainingMessage({ type: 'success', text: `${model.name} is now the best model for ${outputField}` });
      await fetchModels(filterField);
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to set best model: ${err.message}` });
    }
  }, [mlUrl, fetchModels, filterField]);

  const handleSetAsDefault = useCallback(async (model) => {
    setTimedTrainingMessage(null);
    try {
      const response = await authFetch(`${mlUrl}/v1/models/${model.id}`);
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
      const response = await authFetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        throw new Error((detail && typeof detail === 'object' ? detail.message : detail) || `HTTP error! status: ${response.status}`);
      }
      setTimedTrainingMessage({ type: 'success', text: `Model ${model.name} deleted successfully` });
      await fetchModels(filterField);
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to delete model: ${err.message}` });
    }
  }, [mlUrl, fetchModels, filterField]);

  const handleCreateModel = useCallback(async (formData, isAnomaly = false) => {
    setTimedTrainingMessage(null);
    try {
      const endpoint = isAnomaly
        ? `${mlUrl}/v1/anomaly/models`
        : `${mlUrl}/v1/models`;
      const response = await authFetch(endpoint, {
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
      // Track newly created model for highlighting
      setNewlyCreatedModels(prev => ({ ...prev, [data.id]: Date.now() }));
      setShowCreateModal(false);
      await fetchModels(filterField);
      return true;
    } catch (err) {
      setTimedTrainingMessage({ type: 'error', text: `Failed to create model: ${err.message}` });
      return false;
    }
  }, [mlUrl, fetchModels, filterField]);

  const handleShowDetails = useCallback((model) => {
    setSelectedModel(model);
    setShowDetailsModal(true);
    fetchModelDetails(model);
  }, [fetchModelDetails]);

  const handleTrain = useCallback((model) => {
    setTrainTarget(model);
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
        dataStorageUrl={'/' + import.meta.env.VITE_DATA_STORAGE_HOST}
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
      <ModelDetailsModal
        showModal={showDetailsModal}
        setShowModal={setShowDetailsModal}
        selectedModel={selectedModel}
        loadingDetails={loadingModelDetails}
        modelDetails={modelDetails}
        mlUrl={mlUrl}
      />
      {trainTarget && (
        <TrainingModal
          model={trainTarget}
          mlUrl={mlUrl}
          onClose={() => setTrainTarget(null)}
          onStartTraining={handleModelTraining}
          isTraining={trainingModelIds.has(trainTarget.id)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">ML Registry</h2>
              <p className="text-sm text-gray-600 mt-1">Browse and manage ML models</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowAllJobsModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Training Jobs{activeJobCount > 0 && ` (${activeJobCount})`}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Instance
              </button>

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
              <div className="relative flex-1 min-w-0 w-full sm:w-auto">
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
                    {/* Recent fields section */}
                    {!fieldSearchQuery && recentFields.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100 sticky top-0">
                          Recent
                        </div>
                        {recentFields
                          .filter(f => fields.includes(f))
                          .map(field => (
                            <button
                              key={`recent-${field}`}
                              onClick={() => {
                                setFilterField(field);
                                setFieldSearchQuery('');
                                setShowFieldDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${filterField === field ? 'bg-blue-100 font-medium' : ''
                                }`}
                            >
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {field}
                            </button>
                          ))}
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-t border-b border-gray-100">
                          All Fields
                        </div>
                      </>
                    )}
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
                            // Save to recent fields if a field is selected
                            if (option.value && option.value !== 'anomaly') {
                              try {
                                const updatedRecent = [option.value, ...recentFields.filter(f => f !== option.value)].slice(0, 5);
                                setRecentFields(updatedRecent);
                                localStorage.setItem('recent-search-ml-filter-fields', JSON.stringify(updatedRecent));
                              } catch (e) {
                                console.warn('Failed to save recent field to localStorage:', e);
                              }
                            }
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

              {/* Event type filter */}
              <div className="flex gap-1">
                {['', 'PERF_DATA', 'UE_MOBILITY', 'UE_COMM'].map(evt => (
                  <button
                    key={evt || 'all'}
                    onClick={() => setFilterEvent(evt)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterEvent === evt
                        ? evt === '' ? 'bg-gray-700 text-white' : `${EVENT_COLORS[evt]} ring-1 ring-current`
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {evt || 'All'}
                  </button>
                ))}
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterField || filterEvent) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterField(''); setFilterEvent(''); }}
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
                  if (filterField === 'anomaly') {
                    if (model.modelType !== 'anomaly') return false;
                  } else if (filterField) {
                    if (model.modelType === 'anomaly') return false;
                  }
                  if (filterEvent && model.event_type !== filterEvent) return false;
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    model.name?.toLowerCase().includes(q) ||
                    model.id?.toLowerCase().includes(q) ||
                    model.event_type?.toLowerCase().includes(q)
                  );
                })
                .map((model) => (
                  <ModelCard
                    key={model.id || model.name}
                    model={model}
                    onShowDetails={handleShowDetails}

                    onTrain={handleTrain}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDelete}
                    isTraining={trainingModelIds.has(model.id)}
                    copiedId={copiedId}
                    onCopyId={copyToClipboard}
                    isNew={isNewlyCreated(model.id)}
                    policyUrl={'/policy-api'}
                  />
                ))}
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Total: <span className="font-semibold text-gray-900">{models.length}</span></span>
                <span>Trained: <span className="font-semibold text-green-700">{models.filter(m => m.latest_version != null).length}</span></span>
                <span>Anomaly: <span className="font-semibold text-orange-700">{models.filter(m => m.modelType === 'anomaly').length}</span></span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {['PERF_DATA', 'UE_MOBILITY', 'UE_COMM'].map(evt => {
                  const count = models.filter(m => m.event_type === evt).length;
                  return count > 0 ? (
                    <span key={evt} className={`px-2 py-0.5 rounded font-medium ${EVENT_COLORS[evt]}`}>
                      {evt}: {count}
                    </span>
                  ) : null;
                })}
                {(filterField || filterEvent || searchQuery) && (
                  <span className="text-gray-400 ml-1">
                    showing filtered results
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MLModels;
