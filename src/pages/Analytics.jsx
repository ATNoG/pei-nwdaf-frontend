import React, { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import SearchableDropdown from '../components/SearchableDropdown';

const Analytics = () => {
  //const dataStorageUrl = import.meta.env.VITE_DATA_STORAGE_URL;
  const dataStorageUrl = '/data-storage';
 ///const mlUrl = import.meta.env.VITE_ML_URL;
  const mlUrl = '/pei-ml'
  const { config, loading: configLoading } = useConfig();
  
  const [formData, setFormData] = useState({
    analytics_type: 'latency',
    cell_index: 26379009,
    horizon: 60,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cellList, setCellList] = useState([]);
  const [loadingCells, setLoadingCells] = useState(true);

  // Mock cell data
  const mockCells = [26379009, 26379010, 26379011, 26379012, 26379013];

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
        }
      } catch (err) {
        console.warn('Using mock cell data - backend not available:', err.message);
        // Use mock data as fallback
        setCellList(mockCells);
        if (!formData.cell_index) {
          setFormData(prev => ({ ...prev, cell_index: mockCells[0] }));
        }
      } finally {
        setLoadingCells(false);
      }
    };
    fetchCells();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cell_index' || name === 'horizon' ? Number.parseInt(value) : value,
    }));
  };

  // Mock prediction generator
  const getMockPrediction = () => {
    const baseValue = formData.analytics_type === 'latency' ? 45.5 : 
                     formData.analytics_type === 'throughput' ? 85.2 :
                     formData.analytics_type === 'signal_strength' ? -92.3 : 1.2;
    
    const now = Math.floor(Date.now() / 1000);
    
    return {
      interval: `${formData.horizon}s`,
      predicted_value: baseValue + (Math.random() * 10 - 5),
      confidence: 0.85 + (Math.random() * 0.1),
      data: {
        rsrp_mean: -96.28571428571429,
        rsrp_max: -90,
        rsrp_min: -100,
        rsrp_std: 4.268463449507354,
        sinr_mean: 14.714285714285714,
        sinr_max: 17,
        sinr_min: 12,
        sinr_std: 1.8156825980064073,
        rsrq_mean: -11.642857142857142,
        rsrq_max: -10,
        rsrq_min: -14,
        rsrq_std: 1.5984195491000024,
        cqi_mean: 12.428571428571429,
        cqi_max: 14,
        cqi_min: 10,
        cqi_std: 1.4525460784051258,
        primary_bandwidth: 20000,
        ul_bandwidth: 20000
      },
      target_start_time: now,
      target_end_time: now + formData.horizon
    };
  };

  const fetchPrediction = async (e) => {
    e.preventDefault();
    
    // Check if analytics type is supported
    if (formData.analytics_type !== 'latency') {
      setError(`${formData.analytics_type.charAt(0).toUpperCase() + formData.analytics_type.slice(1)} analytics type will be supported in the future. Currently only 'Latency' is available.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch(`${mlUrl}/api/v1/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      console.warn('Using mock prediction - backend not available:', err.message);
      // Use mock data as fallback
      setPrediction(getMockPrediction());
      setError(null); // Clear error since we have mock data
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Predictions</h2>
        <p className="text-sm text-gray-600">
          Get ML predictions for analytics including latency and more
        </p>
      </div>

      {/* Request Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Parameters</h3>
        <form onSubmit={fetchPrediction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Analytics Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analytics Type
              </label>
              <select
                name="analytics_type"
                value={formData.analytics_type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={configLoading}
              >
                {configLoading ? (
                  <option>Loading...</option>
                ) : config?.inference_types ? (
                  [...new Set(config.inference_types.map(t => t.name))].map(name => (
                    <option key={name} value={name}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="latency">Latency</option>
                    <option value="throughput">Throughput</option>
                  </>
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
                filterOption={(cell, searchTerm) => 
                  cell.toString().includes(searchTerm)
                }
              />
            </div>

            {/* Horizon */}
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
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
            <p className="text-sm text-gray-600">Analytics prediction for Cell ID: {formData.cell_index}</p>
          </div>

          <div className="p-6">
            {/* Key Metrics (neutral styling) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Predicted Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  {prediction.predicted_value?.toFixed(2) ?? 'N/A'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Confidence</p>
                <p className="text-3xl font-bold text-gray-900">
                  {prediction.confidence ? `${(prediction.confidence * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Interval</p>
                <p className="text-3xl font-bold text-gray-900">
                  {prediction.interval || 'N/A'}
                </p>
              </div>
            </div>

            {/* Time Range */}
            {(prediction.target_start_time || prediction.target_end_time) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Time Window</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prediction.target_start_time && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Start Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(prediction.target_start_time * 1000).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {prediction.target_end_time && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">End Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(prediction.target_end_time * 1000).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Used Data */}
            {prediction.data && Object.keys(prediction.data).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Used Data</h4>
                <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-auto max-h-64">
                  {JSON.stringify(prediction.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
