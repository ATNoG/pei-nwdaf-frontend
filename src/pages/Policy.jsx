import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaPlus, FaTrash, FaEdit, FaSave, FaSearch, FaSync, FaTimes, FaArrowRight, FaSearchPlus, FaChevronDown } from 'react-icons/fa';
import FieldDiscoveryPanel from '../components/FieldDiscoveryPanel';
import TransformerStepEditor from '../components/TransformerStepEditor';

// Use Vite proxy - requests go from frontend container to policy-service container
const POLICY_SERVICE_URL = '/policy-api';

// Available components in the system - can be overridden via VITE_AVAILABLE_COMPONENTS env var
// Format: JSON array of {id, name, group} objects
//
// Components can also declare resourceTypes (sink types) they support.
// For example, data-storage supports "influx" (raw data) and "clickhouse" (processed data).
// When creating a pipeline, you can select: "data-storage:influx" or "data-storage:clickhouse"
const DEFAULT_AVAILABLE_COMPONENTS = [
  { id: 'ingestion-service', name: 'Ingestion Service', group: 'Data' },
  { id: 'data-processor-60s', name: 'Data Processor (60s)', group: 'Processing' },
  { id: 'data-processor-300s', name: 'Data Processor (300s)', group: 'Processing' },
  {
    id: 'data-storage',
    name: 'Data Storage',
    group: 'Storage',
    resourceTypes: [
      { id: 'influx', name: 'Raw Data (InfluxDB)', description: 'Raw network measurements' },
      { id: 'clickhouse', name: 'Processed Data (ClickHouse)', description: 'Aggregated metrics' }
    ]
  },
  { id: 'ml-service', name: 'ML Service', group: 'ML' },
  { id: 'decision', name: 'Decision Service', group: 'Decision' },
  { id: 'kafka', name: 'Kafka', group: 'Messaging' },
  { id: 'frontend', name: 'Frontend', group: 'UI' },
  { id: 'grafana', name: 'Grafana', group: 'Monitoring' },
  { id: 'mlflow-server', name: 'MLflow', group: 'ML' },
];

const parseAvailableComponents = () => {
  try {
    const envComponents = import.meta.env.VITE_AVAILABLE_COMPONENTS;
    if (envComponents) {
      return JSON.parse(envComponents);
    }
  } catch (e) {
    console.warn('Failed to parse VITE_AVAILABLE_COMPONENTS:', e);
  }
  return DEFAULT_AVAILABLE_COMPONENTS;
};

// Fetch registered components from Policy Service and merge with defaults.
// Registered data is the source of truth but defaults fill in components
// that haven't registered yet and provide richer display names / groups.
// Resource types are extracted from allowed_fields keys using the
// "{component_id}:subtype" pattern so they work for BOTH source and sink.
const fetchRegisteredComponents = async () => {
  const defaults = parseAvailableComponents();

  // Build a lookup of defaults by id for fast merging
  const defaultsById = {};
  defaults.forEach(c => { defaultsById[c.id] = c; });

  let registeredComponents = [];
  try {
    const response = await fetch(`${POLICY_SERVICE_URL}/components`);
    if (!response.ok) throw new Error('Failed to fetch components');
    const data = await response.json();

    // Transform registered components into the format expected by the UI
    registeredComponents = data.components.map(comp => {
      // Start from the default entry (if it exists) to keep nice display names
      const defaultEntry = defaultsById[comp.component_id];
      const base = {
        id: comp.component_id,
        name: defaultEntry?.name
          || comp.component_id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        group: defaultEntry?.group
          || (comp.component_type === 'ml_model' ? 'ML Models' : comp.component_type || 'General')
      };

      // Attach ML model metadata for tooltip/display in pipeline modal
      if (comp.component_type === 'ml_model' && comp.attributes) {
        base.mlModelMeta = {
          architecture: comp.attributes.architecture,
          inputFields: comp.attributes.input_fields || [],
          outputFields: comp.attributes.output_fields || [],
          dataType: comp.attributes.data_type,
          windowDuration: comp.attributes.window_duration_seconds,
          modelId: comp.attributes.model_id,
        };
      }

      // Extract resourceTypes from allowed_fields keys that match pattern "{component_id}:"
      // e.g., "data-storage:influx" -> resourceType: "influx" for data-storage component
      //       "ingestion-service:producer_label" -> resourceType: "producer_label" for ingestion-service
      const componentPrefix = `${comp.component_id}:`;
      if (comp.allowed_fields && Object.keys(comp.allowed_fields).length > 0) {
        const discovered = Object.keys(comp.allowed_fields)
          .filter(key => key.startsWith(componentPrefix))
          .map(key => {
            const resourceType = key.substring(componentPrefix.length);
            return {
              id: resourceType,
              name: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
              description: `Category: ${resourceType}`
            };
          });

        if (discovered.length > 0) {
          // Merge with default resourceTypes so hand-written descriptions aren't lost
          const defaultRTs = defaultEntry?.resourceTypes || [];
          const byId = {};
          defaultRTs.forEach(rt => { byId[rt.id] = rt; });
          discovered.forEach(rt => {
            // Discovered takes precedence, but inherit richer name/description from default
            byId[rt.id] = { ...rt, ...(byId[rt.id] || {}), id: rt.id };
          });
          base.resourceTypes = Object.values(byId);
        } else if (defaultEntry?.resourceTypes?.length > 0) {
          // Component registered without self-referencing keys but default
          // declares resource types (e.g. data-storage before DB connects) — keep defaults
          base.resourceTypes = defaultEntry.resourceTypes;
        }
      } else if (defaultEntry?.resourceTypes?.length > 0) {
        // No allowed_fields at all — preserve hardcoded defaults
        base.resourceTypes = defaultEntry.resourceTypes;
      }

      return base;
    });
  } catch (e) {
    console.warn('Failed to fetch registered components, returning empty list:', e);
    return [];
  }

  // Only return registered components - no ghost defaults
  return registeredComponents;
};

// Start with defaults, will be updated with fetched components
let AVAILABLE_COMPONENTS = parseAvailableComponents();

// Field categories for grouping
const FIELD_CATEGORIES = {
  location: {
    label: 'Location',
    fields: ['latitude', 'longitude', 'altitude', 'location_accuracy', 'velocity', 'velocity_accuracy', 'bearing', 'bearing_accuracy']
  },
  signal: {
    label: 'Signal Quality',
    fields: ['rsrp', 'rsrq', 'rssi', 'sinr', 'ta', 'cqi', 'ss_rsrp', 'ss_rsrq', 'ss_sinr']
  },
  network: {
    label: 'Network',
    fields: ['network', 'mcc', 'mnc', 'earfcn', 'cell_index', 'physical_cellid', 'tracking_area_code', 'primary_bandwidth', 'ul_bandwidth', 'cellbandwidths']
  },
  latency: {
    label: 'Latency',
    fields: ['mean_latency', 'min_latency', 'max_latency', 'mean_dev_latency']
  },
  other: {
    label: 'Other',
    fields: ['packet_loss', 'no_pings', 'server_ip', 'device', 'MNO', 'timestamp']
  }
};

// Available transformer types
const TRANSFORMER_TYPES = [
  { type: 'hashing', label: 'Hashing', description: 'Hash specified fields (preserves data type)' },
  { type: 'redaction', label: 'Redaction', description: 'Redact sensitive field values (preserves data type)' }
];

const Policy = () => {
  // Pipeline selection
  const [pipelines, setPipelines] = useState({});
  const [selectedPipeline, setSelectedPipeline] = useState('');

  // Field discovery state
  const [discoveredFields, setDiscoveredFields] = useState([]);
  const [fieldSyncStatus, setFieldSyncStatus] = useState(null);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Pipeline configuration state
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isNewPipeline, setIsNewPipeline] = useState(false);

  // UI state
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [showStepDetailModal, setShowStepDetailModal] = useState(false);
  const [detailStep, setDetailStep] = useState(null);
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
  const [showNewPipelineModal, setShowNewPipelineModal] = useState(false);
  const [newPipelineSource, setNewPipelineSource] = useState('');
  const [newPipelineSink, setNewPipelineSink] = useState('');
  const [newPipelineSourceResourceType, setNewPipelineSourceResourceType] = useState('');
  const [newPipelineSinkResourceType, setNewPipelineSinkResourceType] = useState('');
  const [notification, setNotification] = useState(null);
  const [availableComponents, setAvailableComponents] = useState([]);

  // Fetch all pipelines on mount
  useEffect(() => {
    fetchPipelines();
    fetchRegisteredComponents().then(components => {
      setAvailableComponents(components);
    });
  }, []);

  // Fetch discovered fields when pipeline is selected
  useEffect(() => {
    if (selectedPipeline) {
      fetchDiscoveredFields();
      loadPipelineConfiguration();
    }
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch(`${POLICY_SERVICE_URL}/transformers`);
      if (!response.ok) throw new Error('Failed to fetch pipelines');
      const data = await response.json();
      setPipelines(data);
    } catch (error) {
      showNotification('error', `Failed to load pipelines: ${error.message}`);
    }
  };

  const fetchDiscoveredFields = async () => {
    setIsLoadingFields(true);
    try {
      const [source, sink] = parsePipelineId(selectedPipeline);
      const response = await fetch(
        `${POLICY_SERVICE_URL}/transformers/fields/${source}/${sink}`
      );
      if (!response.ok) throw new Error('Failed to discover fields');
      const fields = await response.json();
      setDiscoveredFields(fields);
      // Initialize selected fields with all fields
      setSelectedFields(new Set(fields.map(f => f.name)));
    } catch (error) {
      showNotification('error', `Field discovery failed: ${error.message}`);
      setDiscoveredFields([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const loadPipelineConfiguration = async () => {
    try {
      const response = await fetch(`${POLICY_SERVICE_URL}/transformers/${selectedPipeline}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Pipeline doesn't exist yet, start fresh
          setPipelineSteps([]);
          return;
        }
        throw new Error('Failed to load pipeline');
      }
      const data = await response.json();
      setPipelineSteps(data.steps || []);

      // Extract selected fields from filter steps (whitelist mode)
      const filterStep = data.steps?.find(s => s.type === 'filter' && s.params?.mode === 'whitelist');
      if (filterStep?.params?.fields) {
        setSelectedFields(new Set(filterStep.params.fields));
      }
    } catch (error) {
      showNotification('error', `Failed to load pipeline config: ${error.message}`);
    }
  };

  const syncFieldsToPermit = async () => {
    setIsLoadingFields(true);
    try {
      const [source, sink] = parsePipelineId(selectedPipeline);
      const response = await fetch(`${POLICY_SERVICE_URL}/transformers/fields/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, sink })
      });
      if (!response.ok) throw new Error('Failed to sync fields');
      const result = await response.json();
      setFieldSyncStatus(result);
      showNotification('success', `Synced ${result.created_attributes?.length || 0} field attributes to Permit.io`);
    } catch (error) {
      showNotification('error', `Field sync failed: ${error.message}`);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handlePipelineSelect = (pipelineId) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to switch pipelines?')) {
        return;
      }
    }
    setSelectedPipeline(pipelineId);
    setHasUnsavedChanges(false);
  };

  const savePipeline = async () => {
    setIsSaving(true);
    try {
      const steps = [];

      // Add filter step for field selection
      if (selectedFields.size < discoveredFields.length) {
        steps.push({
          type: 'filter',
          params: {
            mode: 'whitelist',
            fields: Array.from(selectedFields)
          }
        });
      }

      // Add any additional transformer steps
      steps.push(...pipelineSteps);

      const response = await fetch(`${POLICY_SERVICE_URL}/transformers/${selectedPipeline}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_id: selectedPipeline, steps })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail?.message || errorData.detail || 'Failed to save pipeline');
      }

      showNotification('success', 'Pipeline saved successfully');
      setHasUnsavedChanges(false);
      setIsNewPipeline(false);
      await fetchPipelines(); // Refresh pipeline list
    } catch (error) {
      showNotification('error', `Failed to save pipeline: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePipeline = async (pipelineId) => {
    if (!confirm(`Delete pipeline "${pipelineId}"?`)) return;

    try {
      const response = await fetch(`${POLICY_SERVICE_URL}/transformers/${pipelineId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete pipeline');
      showNotification('success', 'Pipeline deleted');
      if (selectedPipeline === pipelineId) {
        setSelectedPipeline('');
        setPipelineSteps([]);
        setDiscoveredFields([]);
        setIsNewPipeline(false);
      }
      await fetchPipelines();
    } catch (error) {
      showNotification('error', `Failed to delete pipeline: ${error.message}`);
    }
  };

  const addStep = (step) => {
    if (editingStepIndex !== null) {
      const updated = [...pipelineSteps];
      updated[editingStepIndex] = step;
      setPipelineSteps(updated);
      setEditingStepIndex(null);
    } else {
      setPipelineSteps([...pipelineSteps, step]);
    }
    setHasUnsavedChanges(true);
    setShowStepEditor(false);
  };

  const editStep = (index) => {
    setEditingStepIndex(index);
    setShowStepEditor(true);
  };

  const deleteStep = (index) => {
    setPipelineSteps(pipelineSteps.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const toggleField = (fieldName) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldName)) {
      newSelected.delete(fieldName);
    } else {
      newSelected.add(fieldName);
    }
    setSelectedFields(newSelected);
    setHasUnsavedChanges(true);
  };

  const deselectAllFields = () => {
    setSelectedFields(new Set());
    setHasUnsavedChanges(true);
  };

  const selectAllFields = () => {
    const allFieldNames = Object.values(fieldsByCategory).flat();
    setSelectedFields(new Set(allFieldNames));
    setHasUnsavedChanges(true);
  };

  const toggleCategory = (category) => {
    const newSelected = new Set(selectedFields);
    const fieldsInCategory = fieldsByCategory[category] || [];
    const allSelected = fieldsInCategory.every(f => newSelected.has(f));

    if (allSelected) {
      // Deselect all in category
      fieldsInCategory.forEach(f => newSelected.delete(f));
    } else {
      // Select all in category
      fieldsInCategory.forEach(f => newSelected.add(f));
    }
    setSelectedFields(newSelected);
    setHasUnsavedChanges(true);
  };

  const parsePipelineId = (pipelineId) => {
    // Parse "source_to_sink" or "source_to_sink:resourceType" format
    const match = pipelineId.match(/^(.+)_to_(.+)$/);
    if (match) {
      return [match[1], match[2]];
    }
    return ['unknown', 'unknown'];
  };

  const createNewPipeline = () => {
    setShowNewPipelineModal(true);
  };

  const confirmNewPipeline = () => {
    if (!newPipelineSource || !newPipelineSink) {
      showNotification('error', 'Please select both source and sink components');
      return;
    }
    if (newPipelineSource === newPipelineSink) {
      showNotification('error', 'Source and sink cannot be the same');
      return;
    }

    // Check if source requires a resource type selection
    const sourceComponent = availableComponents.find(c => c.id === newPipelineSource);
    const sourceRequiresResourceType = sourceComponent?.resourceTypes?.length > 0;

    if (sourceRequiresResourceType && !newPipelineSourceResourceType) {
      showNotification('error', `Please select a resource type for ${sourceComponent.name}`);
      return;
    }

    // Check if sink requires a resource type selection
    const sinkComponent = availableComponents.find(c => c.id === newPipelineSink);
    const requiresResourceType = sinkComponent?.resourceTypes?.length > 0;

    if (requiresResourceType && !newPipelineSinkResourceType) {
      showNotification('error', `Please select a resource type for ${sinkComponent.name}`);
      return;
    }

    // Build pipeline ID: "source[:resourceType]_to_sink[:resourceType]"
    const sourcePart = newPipelineSourceResourceType
      ? `${newPipelineSource}:${newPipelineSourceResourceType}`
      : newPipelineSource;
    const sinkPart = newPipelineSinkResourceType
      ? `${newPipelineSink}:${newPipelineSinkResourceType}`
      : newPipelineSink;

    const newId = `${sourcePart}_to_${sinkPart}`;
    setSelectedPipeline(newId);
    setPipelineSteps([]);
    setDiscoveredFields([]);
    setSelectedFields(new Set());
    setHasUnsavedChanges(true);
    setIsNewPipeline(true);
    setShowNewPipelineModal(false);
    setNewPipelineSource('');
    setNewPipelineSink('');
    setNewPipelineSourceResourceType('');
    setNewPipelineSinkResourceType('');
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Group discovered fields by category - use discovered fields directly
  const fieldsByCategory = React.useMemo(() => {
    const grouped = {};
    discoveredFields.forEach(field => {
      const category = field.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(field.name);
    });
    return grouped;
  }, [discoveredFields]);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-[100] ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaShieldAlt className="text-2xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Policy Configuration</h2>
              <p className="text-sm text-gray-600">Configure transformer pipelines and field permissions</p>
            </div>
          </div>
          <button
            onClick={createNewPipeline}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>New Pipeline</span>
          </button>
        </div>
      </div>

      {/* Pipeline Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <label className="text-sm font-medium text-gray-700">Selected Pipeline:</label>
            <div className="relative flex-1 max-w-md">
              <button
                onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <span className={selectedPipeline ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedPipeline || 'Select a pipeline...'}
                </span>
                <FaChevronDown className={`ml-2 text-gray-400 transition-transform ${showPipelineDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showPipelineDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPipelineDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {Object.keys(pipelines).length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No pipelines configured
                      </div>
                    ) : (
                      Object.keys(pipelines).map(pipelineId => (
                        <div
                          key={pipelineId}
                          className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group"
                          onClick={() => {
                            handlePipelineSelect(pipelineId);
                            setShowPipelineDropdown(false);
                          }}
                        >
                          <span className={`text-sm ${selectedPipeline === pipelineId ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                            {pipelineId}
                          </span>
                          {selectedPipeline === pipelineId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePipeline(pipelineId);
                                setShowPipelineDropdown(false);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete pipeline"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Current Pipeline Info */}
          {selectedPipeline && (
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>{Object.keys(pipelines).length} pipeline{Object.keys(pipelines).length !== 1 ? 's' : ''} total</span>
              {isNewPipeline && (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  New - Unsaved
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      {selectedPipeline ? (
        <>
          {/* Field Discovery Panel */}
          <FieldDiscoveryPanel
            fieldsByCategory={fieldsByCategory}
            selectedFields={selectedFields}
            onToggleField={toggleField}
            onToggleCategory={toggleCategory}
            onRefresh={fetchDiscoveredFields}
            onSync={syncFieldsToPermit}
            syncStatus={fieldSyncStatus}
            isLoading={isLoadingFields}
            onDeselectAll={deselectAllFields}
            onSelectAll={selectAllFields}
          />

          {/* Field Transformations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Field Transformations</h3>
                <p className="text-sm text-gray-600 mt-1">Hashing and redaction transformations (field filtering is handled above)</p>
              </div>
              <button
                onClick={() => { setEditingStepIndex(null); setShowStepEditor(true); }}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaPlus />
                <span>Add Transformation</span>
              </button>
            </div>

            {pipelineSteps.filter(s => s.type !== 'filter').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No field transformations configured.</p>
                <p className="text-sm">Add hashing or redaction transformations to protect sensitive data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineSteps
                  .map((step, index) => ({ step, index, originalIndex: index }))
                  .filter(({ step }) => step.type !== 'filter')
                  .map(({ step, index, originalIndex }) => (
                    <div key={originalIndex} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center space-x-3 mb-2">
                          {step.type === 'hashing' ? (
                            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                              <span>Hashing</span>
                            </span>
                          ) : step.type === 'redaction' ? (
                            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              <span>Redaction</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {step.type}
                            </span>
                          )}
                          <span className="text-sm text-gray-700 font-medium">
                            {TRANSFORMER_TYPES.find(t => t.type === step.type)?.description || step.type}
                          </span>
                        </div>
                        {step.params?.fields && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium text-gray-500">Fields:</span>{' '}
                            <span className="inline-flex flex-wrap gap-1 mt-1">
                              {Array.isArray(step.params.fields) ? (
                                step.params.fields.length <= 3 ? (
                                  step.params.fields.map((field, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">
                                      {field}
                                    </span>
                                  ))
                                ) : (
                                  <>
                                    {step.params.fields.slice(0, 3).map((field, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">
                                        {field}
                                      </span>
                                    ))}
                                    <span className="px-1.5 py-0.5 bg-gray-300 rounded text-gray-600 font-medium">
                                      +{step.params.fields.length - 3} more
                                    </span>
                                  </>
                                )
                              ) : (
                                <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">
                                  {step.params.fields}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setDetailStep(step);
                            setShowStepDetailModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-200 hover:text-gray-800 rounded-lg transition-colors"
                          title="View details"
                        >
                          <FaSearchPlus />
                        </button>
                        <button
                          onClick={() => editStep(originalIndex)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit step"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteStep(originalIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete step"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-3">
            {hasUnsavedChanges && (
              <button
                onClick={() => {
                  if (confirm('Discard unsaved changes?')) {
                    setSelectedPipeline('');
                    setPipelineSteps([]);
                    setDiscoveredFields([]);
                    setSelectedFields(new Set());
                    setHasUnsavedChanges(false);
                    setIsNewPipeline(false);
                  }
                }}
                className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
            )}
            <button
              onClick={savePipeline}
              disabled={isSaving}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <FaSave />
              <span>{isSaving ? 'Saving...' : 'Save Pipeline'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 shadow-sm text-center">
          <p className="text-gray-500">Select a pipeline to configure</p>
        </div>
      )}

      {/* Step Editor Modal */}
      {showStepEditor && (
        <TransformerStepEditor
          step={editingStepIndex !== null ? pipelineSteps[editingStepIndex] : null}
          onSave={addStep}
          onCancel={() => { setShowStepEditor(false); setEditingStepIndex(null); }}
          availableFields={discoveredFields.map(f => f.name)}
        />
      )}

      {/* Transformation Detail Modal */}
      {showStepDetailModal && detailStep && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {detailStep.type === 'hashing' ? (
                  <span className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
                    <span>Hashing Transformation</span>
                  </span>
                ) : detailStep.type === 'redaction' ? (
                  <span className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    <span>Redaction Transformation</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    {detailStep.type}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowStepDetailModal(false); setDetailStep(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-600 mb-6">
                {TRANSFORMER_TYPES.find(t => t.type === detailStep.type)?.description || detailStep.type}
              </p>

              {detailStep.params && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Parameters</h4>
                  {Object.entries(detailStep.params).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-gray-800">
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-2">
                            {value.map((item, i) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-sm font-mono">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : typeof value === 'object' ? (
                          <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-sm font-mono">{String(value)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { setShowStepDetailModal(false); setDetailStep(null); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Pipeline Modal */}
      {showNewPipelineModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">Create New Pipeline</h2>
                <button
                  onClick={async () => {
                    const components = await fetchRegisteredComponents();
                    setAvailableComponents(components);
                    showNotification('success', 'Component list refreshed');
                  }}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Refresh available components"
                >
                  <FaSync />
                  <span>Refresh Components</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setShowNewPipelineModal(false);
                  setNewPipelineSource('');
                  setNewPipelineSink('');
                  setNewPipelineSourceResourceType('');
                  setNewPipelineSinkResourceType('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-600 mb-6">Select the source and sink components for this data pipeline:</p>

              {/* Pipeline Flow Visualization */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source Component</label>
                  <select
                    value={newPipelineSource}
                    onChange={(e) => {
                      setNewPipelineSource(e.target.value);
                      setNewPipelineSourceResourceType(''); // Reset resource type when source changes
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select source...</option>
                    {Object.entries(
                      availableComponents.reduce((groups, comp) => {
                        const g = comp.group || 'General';
                        if (!groups[g]) groups[g] = [];
                        groups[g].push(comp);
                        return groups;
                      }, {})
                    ).map(([group, comps]) => (
                      <optgroup key={group} label={group}>
                        {comps.map(comp => (
                          <option key={comp.id} value={comp.id} disabled={comp.id === newPipelineSink}>
                            {comp.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center pt-6">
                  <FaArrowRight className="text-2xl text-gray-400" />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sink Component</label>
                  <select
                    value={newPipelineSink}
                    onChange={(e) => {
                      setNewPipelineSink(e.target.value);
                      setNewPipelineSinkResourceType(''); // Reset resource type when sink changes
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select sink...</option>
                    {Object.entries(
                      availableComponents.reduce((groups, comp) => {
                        const g = comp.group || 'General';
                        if (!groups[g]) groups[g] = [];
                        groups[g].push(comp);
                        return groups;
                      }, {})
                    ).map(([group, comps]) => (
                      <optgroup key={group} label={group}>
                        {comps.map(comp => (
                          <option key={comp.id} value={comp.id} disabled={comp.id === newPipelineSource}>
                            {comp.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* ML Model Metadata — shown when source is an ML model */}
              {newPipelineSource && (() => {
                const sourceComp = availableComponents.find(c => c.id === newPipelineSource);
                if (!sourceComp?.mlModelMeta) return null;
                const meta = sourceComp.mlModelMeta;
                return (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">
                      🤖 ML Model: {sourceComp.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-purple-800">
                      {meta.architecture && <div><span className="font-medium">Architecture:</span> {meta.architecture}</div>}
                      {meta.windowDuration && <div><span className="font-medium">Window:</span> {meta.windowDuration}s</div>}
                      <div className="col-span-2">
                        <span className="font-medium">Input fields:</span>{' '}
                        {meta.inputFields.join(', ') || '(none)'}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Output fields:</span>{' '}
                        {meta.outputFields.join(', ') || '(none)'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ML Model Metadata — shown when sink is an ML model */}
              {newPipelineSink && (() => {
                const sinkComp = availableComponents.find(c => c.id === newPipelineSink);
                if (!sinkComp?.mlModelMeta) return null;
                const meta = sinkComp.mlModelMeta;
                return (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">
                      🤖 ML Model: {sinkComp.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-purple-800">
                      {meta.architecture && <div><span className="font-medium">Architecture:</span> {meta.architecture}</div>}
                      {meta.windowDuration && <div><span className="font-medium">Window:</span> {meta.windowDuration}s</div>}
                      <div className="col-span-2">
                        <span className="font-medium">Input fields:</span>{' '}
                        {meta.inputFields.join(', ') || '(none)'}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Output fields:</span>{' '}
                        {meta.outputFields.join(', ') || '(none)'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Source Resource Type Selector - shown when source has resourceTypes */}
              {newPipelineSource && (() => {
                const sourceComponent = availableComponents.find(c => c.id === newPipelineSource);
                const resourceTypes = sourceComponent?.resourceTypes;

                if (!resourceTypes || resourceTypes.length === 0) {
                  return null;
                }

                return (
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Resource Type for {sourceComponent.name} (Source)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {sourceComponent.name} supports multiple data types. Select which type this pipeline reads from.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {resourceTypes.map(resourceType => (
                        <label
                          key={resourceType.id}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                            newPipelineSourceResourceType === resourceType.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sourceResourceType"
                            value={resourceType.id}
                            checked={newPipelineSourceResourceType === resourceType.id}
                            onChange={(e) => setNewPipelineSourceResourceType(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{resourceType.name}</div>
                            {resourceType.description && (
                              <div className="text-sm text-gray-500">{resourceType.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Sink Resource Type Selector - shown only when sink has resourceTypes */}
              {newPipelineSink && (() => {
                const sinkComponent = availableComponents.find(c => c.id === newPipelineSink);
                const resourceTypes = sinkComponent?.resourceTypes;

                if (!resourceTypes || resourceTypes.length === 0) {
                  return null;
                }

                return (
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Resource Type for {sinkComponent.name} (Sink)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {sinkComponent.name} supports multiple data types. Select which type this pipeline writes to.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {resourceTypes.map(resourceType => (
                        <label
                          key={resourceType.id}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                            newPipelineSinkResourceType === resourceType.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sinkResourceType"
                            value={resourceType.id}
                            checked={newPipelineSinkResourceType === resourceType.id}
                            onChange={(e) => setNewPipelineSinkResourceType(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{resourceType.name}</div>
                            {resourceType.description && (
                              <div className="text-sm text-gray-500">{resourceType.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Pipeline Preview */}
              {(newPipelineSource || newPipelineSink) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Pipeline Preview</h3>
                  <div className="flex items-center justify-center gap-3 text-blue-800">
                    <span className="font-medium">
                      {newPipelineSource
                        ? (newPipelineSourceResourceType
                            ? `${newPipelineSource}:${newPipelineSourceResourceType}`
                            : newPipelineSource)
                        : '(source)'}
                    </span>
                    <span className="text-blue-400">→</span>
                    <span className="font-medium">
                      {newPipelineSink
                        ? (newPipelineSinkResourceType
                            ? `${newPipelineSink}:${newPipelineSinkResourceType}`
                            : newPipelineSink)
                        : '(sink)'}
                    </span>
                  </div>
                  {(newPipelineSource && newPipelineSink) && (
                    <p className="text-sm text-blue-600 mt-2 text-center">
                      Pipeline ID: <code className="bg-blue-100 px-2 py-1 rounded">
                        {newPipelineSourceResourceType ? `${newPipelineSource}:${newPipelineSourceResourceType}` : newPipelineSource}_to_{newPipelineSinkResourceType ? `${newPipelineSink}:${newPipelineSinkResourceType}` : newPipelineSink}
                      </code>
                    </p>
                  )}
                </div>
              )}

              {/* Existing Pipelines Warning */}
              {newPipelineSource && newPipelineSink && (() => {
                const sourcePart = newPipelineSourceResourceType
                  ? `${newPipelineSource}:${newPipelineSourceResourceType}`
                  : newPipelineSource;
                const sinkPart = newPipelineSinkResourceType
                  ? `${newPipelineSink}:${newPipelineSinkResourceType}`
                  : newPipelineSink;
                const existingPipelineId = `${sourcePart}_to_${sinkPart}`;

                if (pipelines[existingPipelineId]) {
                  return (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ A pipeline from <strong>{newPipelineSource}</strong> to <strong>{sinkPart}</strong> already exists.
                        It will be replaced with the new configuration.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowNewPipelineModal(false);
                  setNewPipelineSource('');
                  setNewPipelineSink('');
                  setNewPipelineSourceResourceType('');
                  setNewPipelineSinkResourceType('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmNewPipeline}
                disabled={!newPipelineSource || !newPipelineSink || (() => {
                  const sourceComponent = availableComponents.find(c => c.id === newPipelineSource);
                  if (sourceComponent?.resourceTypes?.length > 0 && !newPipelineSourceResourceType) return true;
                  const sinkComponent = availableComponents.find(c => c.id === newPipelineSink);
                  return sinkComponent?.resourceTypes?.length > 0 && !newPipelineSinkResourceType;
                })()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !newPipelineSource || !newPipelineSink || (() => {
                    const sourceComponent = availableComponents.find(c => c.id === newPipelineSource);
                    if (sourceComponent?.resourceTypes?.length > 0 && !newPipelineSourceResourceType) return true;
                    const sinkComponent = availableComponents.find(c => c.id === newPipelineSink);
                    return sinkComponent?.resourceTypes?.length > 0 && !newPipelineSinkResourceType;
                  })()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Create Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Policy;
