import React from 'react';
import { FaSearch, FaSync, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const FieldDiscoveryPanel = ({
  fieldsByCategory,
  selectedFields,
  onToggleField,
  onToggleCategory,
  onRefresh,
  onSync,
  syncStatus,
  isLoading
}) => {
  // Flatten all fields into a single array with their category info
  const allFields = React.useMemo(() => {
    const flat = [];
    Object.entries(fieldsByCategory).forEach(([category, fields]) => {
      fields.forEach(fieldName => {
        flat.push({ name: fieldName, category });
      });
    });
    return flat.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [fieldsByCategory]);

  const selectedCount = selectedFields.size;
  const totalFields = allFields.length;

  const isAllSelected = totalFields > 0 && selectedCount === totalFields;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalFields;

  const toggleAll = () => {
    if (isAllSelected) {
      // Deselect all
      allFields.forEach(f => onToggleField(f.name));
    } else {
      // Select all
      allFields.forEach(f => onToggleField(f.name));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Field Discovery</h3>
          <p className="text-sm text-gray-600 mt-1">
            {selectedCount} of {totalFields} fields selected
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Refresh fields from Data Storage"
          >
            <FaSync className={isLoading ? 'animate-spin' : ''} />
            <span>Discover</span>
          </button>
          <button
            onClick={onSync}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title="Sync field attributes to Permit.io"
          >
            <FaSearch />
            <span>Sync to Permit</span>
          </button>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className={`mb-4 p-4 rounded-lg ${
          syncStatus.status === 'success'
            ? 'bg-green-50 border border-green-200'
            : syncStatus.status === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            {syncStatus.status === 'success' ? (
              <FaCheckCircle className="text-green-600" />
            ) : (
              <FaExclamationTriangle className="text-yellow-600" />
            )}
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {syncStatus.status === 'success'
                  ? 'Fields synced successfully'
                  : syncStatus.status === 'error'
                  ? 'Sync failed'
                  : 'Partial sync completed'}
              </p>
              <p className="text-gray-600 mt-1">
                {syncStatus.total_fields} fields discovered, {syncStatus.created_attributes?.length || 0} attributes created
                {syncStatus.failed_attributes?.length > 0 && ` (${syncStatus.failed_attributes.length} failed)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalFields === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <FaSearch className="mx-auto text-4xl mb-4 text-gray-300" />
          <p className="font-medium">No fields discovered</p>
          <p className="text-sm mt-1">Click "Discover" to fetch available fields from Data Storage</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && totalFields === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FaSync className="mx-auto text-4xl mb-4 text-gray-300 animate-spin" />
          <p className="font-medium">Discovering fields...</p>
        </div>
      )}

      {/* All Fields */}
      {totalFields > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header with Select All */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isPartiallySelected;
                  }
                }}
                onChange={toggleAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">
                {isAllSelected ? 'Deselect All' : 'Select All'} ({totalFields} fields)
              </span>
            </label>
          </div>

          {/* Fields Grid */}
          <div className="p-4 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {allFields.map(field => (
                <label
                  key={field.name}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedFields.has(field.name)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  title={field.name}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.name)}
                    onChange={() => onToggleField(field.name)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate">{field.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      {totalFields > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Unchecked fields will be filtered out before data reaches the destination.
            Changes are applied when you click "Save Pipeline".
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldDiscoveryPanel;
