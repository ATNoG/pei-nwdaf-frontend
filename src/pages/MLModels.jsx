import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useWebSocket } from '../hooks/useWebSocket';
import TrainingStatus from '../components/TrainingStatus';

const MLModels = () => {
  //const mlUrl = import.meta.env.VITE_ML_URL;
  const mlUrl = '/pei-ml'
  const mlflowUrl = import.meta.env.VITE_MLFLOW_URL || 'http://localhost:5000';
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/pei-ml/ws/training/status`;
  const { config, loading: configLoading, error: configError, refetch: refetchConfig } = useConfig();

  //console.log('Config:', config, 'Loading:', configLoading, 'Error:', configError);

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [trainingInfo, setTrainingInfo] = useState(null);
  const [loadingTrainingInfo, setLoadingTrainingInfo] = useState(false);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState(null);

  // Single WebSocket for all training status
  const [trainingStatus, setTrainingStatus] = useState({});
  const [trainingLogs, setTrainingLogs] = useState({});

  useWebSocket(wsUrl, {
    enabled: true,
    onMessage: (message) => {
      if (message.type === 'initial_status') {
        setTrainingStatus(message.data || {});
      } else if (message.type === 'training_update') {
        const { model_name, data } = message;
        
        setTrainingStatus(prev => ({
          ...prev,
          [model_name]: data
        }));
        
        setTrainingLogs(prev => ({
          ...prev,
          [model_name]: [
            ...(prev[model_name] || []),
            {
              timestamp: new Date(),
              ...data
            }
          ]
        }));
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Mock data for demonstration
  const mockModels = [
    {
      name: "latency_prediction_xgboost",
      creation_timestamp: 1702300800,
      last_updated_timestamp: 1702387200,
      description: "XGBoost model for predicting network latency with 60s horizon",
      latest_versions: [
        { version: "1", stage: "Production", run_id: "abc123" }
      ]
    },
    {
      name: "latency_prediction_lstm",
      creation_timestamp: 1702214400,
      last_updated_timestamp: 1702300800,
      description: "LSTM neural network for time-series latency prediction",
      latest_versions: [
        { version: "3", stage: "Staging", run_id: "def456" },
        { version: "2", stage: "Archived", run_id: "ghi789" },
        { version: "1", stage: "Archived", run_id: "mkl789" }

      ]
    },
    {
      name: "latency_prediction_random_forest",
      creation_timestamp: 1702128000,
      last_updated_timestamp: 1702214400,
      description: "Random Forest model for latency prediction",
      latest_versions: [
        { version: "2", stage: "Production", run_id: "jkl012" },
        { version: "1", stage: "Archived", run_id: "mkl789" }
      ]
    }
  ];

  const isDefaultModel = (modelName) => {
    if (!config?.inference_types) return false;
    
    return config.inference_types.some(inference => {
      const expectedName = `${inference.name}_${inference.default_model}_${inference.horizon}`;
      return modelName === expectedName;
    });
  };

  // Extract analytics type from model name (first part before underscore)
  const getAnalyticsType = (modelName) => {
    const parts = modelName.split('_');
    return parts[0] || 'unknown';
  };

  // Extract horizon from model name (last numeric part)
  const getHorizon = (modelName) => {
    const parts = modelName.split('_');
    const lastPart = parts[parts.length - 1];
    const horizon = parseInt(lastPart);
    return !isNaN(horizon) ? horizon : null;
  };

  const fetchModels = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`${mlUrl}/ml/models`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const modelsArray = Array.isArray(data) ? data : [data];
      
      // Sort models: default models first, then alphabetically
      const sortedModels = [...modelsArray].sort((a, b) => {
        const aIsDefault = isDefaultModel(a.name);
        const bIsDefault = isDefaultModel(b.name);
        
        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setModels(sortedModels);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.warn('Using mock data - backend not available:', err.message);
      // Use mock data as fallback
      setModels(mockModels);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null); // Clear error since we have mock data
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Re-sort models when config is loaded
  useEffect(() => {
    if (config && models.length > 0) {
      const sortedModels = [...models].sort((a, b) => {
        const aIsDefault = isDefaultModel(a.name);
        const bIsDefault = isDefaultModel(b.name);
        
        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Only update if the order actually changed
      if (JSON.stringify(sortedModels.map(m => m.name)) !== JSON.stringify(models.map(m => m.name))) {
        setModels(sortedModels);
      }
    }
  }, [config]);

  const fetchTrainingInfo = async (model) => {
    setLoadingTrainingInfo(true);
    setTrainingInfo(null);
    
    try {
      // Extract analytics type, horizon, and model type from model name
      // Expected format: analytics_model_horizon (e.g., latency_lstm_60)
      const parts = model.name.split('_');
      const analytics_type = parts[0] || 'latency';
      const model_type = parts[1] || 'xgboost';
      const horizon = parts[2] || '60';
      
      const response = await fetch(`${mlUrl}/api/v1/training/${analytics_type}/${horizon}/${model_type}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTrainingInfo(data);
    } catch (err) {
      console.warn('Using mock training info - backend not available:', err.message);
      // Use mock data as fallback
      setTrainingInfo({
        model_name: model.name,
        model_version: model.latest_versions?.[0]?.version || 'N/A',
        last_training_time: Date.now() / 1000 - 3600,
        training_loss: 0.08,
        samples_used: 2400,
        features_used: 18,
        run_id: model.latest_versions?.[0]?.run_id || 'N/A'
      });
    } finally {
      setLoadingTrainingInfo(false);
    }
  };



  const handleModelTraining = async (model) => {
    // Extract analytics type, horizon, and model type from model name
    // Expected format: analytics_type_model_type_horizon (e.g., latency_xgboost_60)
    const parts = model.name.split('_');
    const analytics_type = parts[0] || 'latency';
    const model_type = parts[1] || 'xgboost';
    const horizon = parseInt(parts[2]) || 60;

    setIsTraining(true);
    setTrainingMessage(null);
    
    try {
      const response = await fetch(`${mlUrl}/api/v1/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics_type, horizon, model_type }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      setTrainingMessage({ type: 'success', text: `Training started for ${model.name}` });
      
      // Refresh models after a delay
      setTimeout(fetchModels, 2000);
    } catch (err) {
      console.warn('Training request - using mock response:', err.message);
      setTrainingMessage({ type: 'success', text: `Training started for ${model.name} (Mock)` });
    } finally {
      setIsTraining(false);
    }
  };

  const handleSetAsDefault = async (model) => {
    // Extract analytics type, horizon, and model type from model name
    const parts = model.name.split('_');
    const analytics_type = parts[0] || 'latency';
    const model_type = parts[1] || 'xgboost';
    const horizon = parseInt(parts[2]) || 60;

    setTrainingMessage(null);

    try {
      const response = await fetch(`${mlUrl}/api/v1/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics_type, horizon, model_type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTrainingMessage({ 
        type: 'success', 
        text: `${model.name} is now the default model for ${analytics_type} with ${horizon}s horizon` 
      });
      
      // Refresh config from context to get updated default models
      if (refetchConfig) {
        await refetchConfig();
      }
    } catch (err) {
      console.error('Failed to set default model:', err.message);
      setTrainingMessage({ 
        type: 'error', 
        text: `Failed to set as default: ${err.message}` 
      });
    }
  };

  const ModelCard = ({ model }) => {
    const latestVersion = model.latest_versions && model.latest_versions.length > 0 ? model.latest_versions[model.latest_versions.length - 1] : null;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{model.name || 'Unnamed Model'}</h3>
              {isDefaultModel(model.name) && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  default
                </span>
              )}

            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-gray-500">
                Version: <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">v{latestVersion?.version || 'N/A'}</span>
              </p>
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                {getAnalyticsType(model.name)}
              </span>
              {getHorizon(model.name) && (
                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                  {getHorizon(model.name)}s
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setSelectedModel(model);
                  setShowModal(true);
                  fetchTrainingInfo(model);
                }}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Info
              </button>
              <button
                onClick={() => handleModelTraining(model)}
                disabled={isTraining}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Train
              </button>
            </div>
            {!isDefaultModel(model.name) && (
              <button
                onClick={() => handleSetAsDefault(model)}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-950 text-white hover:bg-blue-950 transition-colors flex items-center justify-center gap-1.5"
                title="Set as default model"
              >

                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Set Default
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          {model.creation_timestamp && (
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium text-gray-900">
                {new Date(model.creation_timestamp).toLocaleDateString()}
              </span>
            </div>
          )}
          {model.last_updated_timestamp && (
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="font-medium text-gray-900">
                {new Date(model.last_updated_timestamp).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        
        {model.description && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-200 pt-3">
            {model.description}
          </p>
        )}
        
        {/* Training Status Component - Gets data from parent WebSocket */}
        <TrainingStatus 
          modelName={model.name} 
          trainingStatus={trainingStatus[model.name]} 
          trainingLogs={trainingLogs[model.name]} 
        />
        
        {latestVersion && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Latest Version</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Version:</span>
                <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  v{latestVersion.version}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Stage:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  latestVersion.stage === 'Production' 
                    ? 'bg-green-100 text-green-800' 
                    : latestVersion.stage === 'Staging'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {latestVersion.stage}
                </span>
              </div>
              {latestVersion.run_id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Run ID:</span>
                  <span className="font-mono text-gray-700 text-xs truncate max-w-[180px]" title={latestVersion.run_id}>
                    {latestVersion.run_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Training Info Modal Component
  const TrainingInfoModal = () => {
    if (!showModal || !selectedModel) return null;

    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Last Training Session Info</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedModel.name}</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loadingTrainingInfo ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading training info...</p>
                </div>
              </div>
            ) : trainingInfo ? (
              <>
                {/* Model Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-blue-900">Model: {trainingInfo.model_name}</span>
                  </div>
                </div>

                {/* Training Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Last Training Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(trainingInfo.last_training_time * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Model Version</p>
                    <p className="text-sm font-medium text-gray-900">
                      v{trainingInfo.model_version}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Samples Used</p>
                    <p className="text-sm font-medium text-gray-900">{trainingInfo.samples_used?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Features Used</p>
                    <p className="text-sm font-medium text-gray-900">{trainingInfo.features_used}</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Training Metrics</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Training Loss</p>
                      <p className="text-2xl font-bold text-gray-900">{trainingInfo.training_loss?.toFixed(4)}</p>
                    </div>
                  </div>
                </div>

                {/* Run ID */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">MLflow Run Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Run ID:</span>
                      <span className="font-mono text-gray-900 text-xs break-all">{trainingInfo.run_id}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No training information available</p>
              </div>
            )}
          </div>

          {/* Footer */}
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
  };

  return (
    <>
      <TrainingInfoModal />
      <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">ML Models Registry</h2>
            <p className="text-sm text-gray-600 mt-1">
              Browse and manage ML models
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={mlflowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4v8.82c0 4.52-3.13 8.74-8 9.82-4.87-1.08-8-5.3-8-9.82V8.18l8-4zM11 7v2h2V7h-2zm0 4v6h2v-6h-2z"/>
              </svg>
              Open in MLflow
            </a>

            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchModels}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Training Status */}
      {trainingMessage && (
        <div className={`p-3 rounded-lg ${
          trainingMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : trainingMessage.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm font-medium">{trainingMessage.text}</p>
        </div>
      )}

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
            <button
              onClick={fetchModels}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : models.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 shadow-sm text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">No Models Found</p>
          <p className="text-sm text-gray-600">
            No ML models are currently registered in the MLFlow registry
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model, index) => (
              <ModelCard 
                key={model.name || model.id || index} 
                model={model}
              />
            ))}
          </div>

          
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-600">
              Total Models: <span className="font-semibold text-gray-900">{models.length}</span>
            </p>
          </div>
        </>
      )}
      </div>
    </>
  );
};

export default MLModels;
