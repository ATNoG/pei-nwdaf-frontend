
import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
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
import { MdSignalWifiConnectedNoInternet4, MdSignalWifiStatusbar4Bar } from 'react-icons/md';
import { useWebSocket } from '../hooks/useWebSocket';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Performance = () => {
  const [performanceData, setPerformanceData] = useState({});
  const [windowSizes, setWindowSizes] = useState([]);
  const [error, setError] = useState(null);
  const pingIntervalRef = useRef(null);
  
  // Use the same WebSocket URL pattern as other parts of the app
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/pei-ml/ws/performance/status`;
  
  // Extract window sizes from the data
  const extractWindowSizes = (data) => {
    const windowSizes = new Set();
    Object.keys(data).forEach(key => {
      const match = key.match(/window_(\d+)/);
      if (match) {
        windowSizes.add(parseInt(match[1], 10));
      }
    });
    return Array.from(windowSizes).sort((a, b) => a - b);
  };

  // Use WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(wsUrl, {
    enabled: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onOpen: () => {
      console.log('Performance WebSocket connected');
      // Start sending ping messages every 30 seconds to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 30000);
    },
    onClose: () => {
      console.log('Performance WebSocket disconnected');
      // Clear ping interval when connection closes
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    },
    onError: (err) => {
      console.error('Performance WebSocket error:', err);
      setError('Error connecting to WebSocket. Please check your network connection.');
    },
    onMessage: (message) => {
      try {
        if (message.type === 'initial_status' || message.type === 'status_response') {
          setPerformanceData(message.data);
          const sizes = extractWindowSizes(message.data);
          setWindowSizes(sizes);
          setError(null); // Clear any previous errors when we receive data
        } else if (message.type === 'performance_update') {
          setPerformanceData(prevData => {
            const updatedData = { ...prevData };
            updatedData[message.model_key] = message.data;
            
            // If new window size detected, add to window sizes
            const allSizes = extractWindowSizes(updatedData);
            setWindowSizes(allSizes);
            
            return updatedData;
          });
          setError(null); // Clear any previous errors when we receive updates
        } else if (message.type === 'pong') {
          // Heartbeat response received
          console.log('WebSocket heartbeat');
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  });

  // Prepare chart data for a specific window size
  const prepareChartData = (windowSize) => {
    // Filter cells by window size
    const cellKeys = Object.keys(performanceData).filter(key => 
      key.includes(`window_${windowSize}`)
    );
    
    if (cellKeys.length === 0) {
      return null;
    }

    // Extract all timestamps across all cells for this window size
    const allTimestamps = new Set();
    const cellData = {};
    
    cellKeys.forEach(key => {
      const cell = performanceData[key];
      const cellId = cell.cell_index;
      
      cellData[cellId] = {
        data: [],
        latest_mse: cell.latest_mse
      };
      
      cell.history.forEach(item => {
        allTimestamps.add(item.timestamp);
        cellData[cellId].data.push({
          x: item.timestamp,
          y: item.mse
        });
      });
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Prepare datasets for each cell
    const datasets = [];
    const colors = [
      'rgb(75, 192, 192)',
      'rgb(54, 162, 235)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)',
      'rgb(255, 99, 132)',
      'rgb(201, 203, 207)',
      'rgb(75, 192, 192)',
      'rgb(54, 162, 235)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)'
    ];
    
    let colorIndex = 0;
    Object.keys(cellData).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(cellId => {
      const cell = cellData[cellId];
      
      // Sort data by timestamp
      const sortedData = [...cell.data].sort((a, b) => a.x - b.x);
      
      datasets.push({
        label: `Cell ${cellId}`,
        data: sortedData,
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '20', // Add transparency
        tension: 0.2,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      });
      
      colorIndex++;
    });
    
    return {
      labels: sortedTimestamps,
      datasets
    };
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          callback: formatTimestamp
        }
      },
      y: {
        title: {
          display: true,
          text: 'MSE'
        },
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            return `Time: ${formatTimestamp(context[0].parsed.x)}`;
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Monitoring</h2>
            <p className="text-sm text-gray-600">
              Real-time MSE (Mean Squared Error) values for ML models across different cells
            </p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? (
              <MdSignalWifiStatusbar4Bar className="h-4 w-4" />
            ) : (
              <MdSignalWifiConnectedNoInternet4 className="h-4 w-4" />
            )}
            <span className="text-sm font-medium capitalize">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
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

      {/* Charts for each window size */}
      {windowSizes.map(windowSize => {
        const chartData = prepareChartData(windowSize);
        
        if (!chartData || chartData.datasets.length === 0) {
          return null;
        }
        
        return (
          <div key={windowSize} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance for Window Size: {windowSize}s
            </h3>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        );
      })}

      {/* No Data State */}
      {isConnected && Object.keys(performanceData).length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="text-center py-8">
            <p className="text-gray-600">Connected to WebSocket. Waiting for performance data...</p>
          </div>
        </div>
      )}

      {/* Connecting State */}
      {!isConnected && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Connecting to WebSocket...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
