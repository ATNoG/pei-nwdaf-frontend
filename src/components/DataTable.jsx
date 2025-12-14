import React, { useState, useEffect } from 'react';

const DataTable = ({ title, apiEndpoint, columns, refreshInterval = 30000 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      // Extract data from the nested structure
      let extractedData = [];
      
      if (jsonData.results && Array.isArray(jsonData.results)) {
        // Extract from {results: [{status, data: {...}}, ...]}
        extractedData = jsonData.results
          .filter(item => item.data)
          .map(item => item.data);
      } else if (jsonData.data) {
        // Single item: {status, data: {...}}
        extractedData = [jsonData.data];
      } else if (Array.isArray(jsonData)) {
        // Already an array
        extractedData = jsonData;
      } else {
        // Single object
        extractedData = [jsonData];
      }
      
      // Reverse to show most recent first
      setData(extractedData.reverse());
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh if interval is provided
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [apiEndpoint, refreshInterval]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <p className="text-sm font-medium text-gray-900 mb-2">Error loading data</p>
            <p className="text-xs text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap"
                      style={{ minWidth: '120px' }}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {column.render
                          ? column.render(row[column.accessor], row)
                          : (row[column.accessor] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Showing {data.length} {data.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DataTable;
