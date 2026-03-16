import React from 'react';
import { FaSearch, FaSync, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const FieldDiscoveryPanel = ({
  fieldsByCategory,
  selectedFields,
  onToggleField,
  onToggleCategory,
  onRefresh,
  onSync,
  syncStatus,
  isLoading,
  onDeselectAll,
  onSelectAll
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');

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

  // Filter fields based on search query
  const filteredFields = React.useMemo(() => {
    if (!searchQuery) return allFields;
    return allFields.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allFields, searchQuery]);

  // Get deselected fields as sorted array
  const deselectedFieldsArray = React.useMemo(() => {
    return allFields
      .filter(f => !selectedFields.has(f.name))
      .map(f => f.name)
      .sort();
  }, [allFields, selectedFields]);

  const selectedCount = selectedFields.size;
  const totalFields = allFields.length;

  const isAllSelected = totalFields > 0 && selectedCount === totalFields;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalFields;

  const toggleAll = () => {
    if (isAllSelected) {
      // Deselect all - use dedicated callback if available
      onDeselectAll?.();
    } else {
      // Select all - use dedicated callback if available, otherwise toggle unselected fields
      if (onSelectAll) {
        onSelectAll();
      } else {
        // Fallback: only select fields that aren't already selected
        allFields.forEach(f => {
          if (!selectedFields.has(f.name)) {
            onToggleField(f.name);
          }
        });
      }
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

      {/* Two-Column Layout */}
      {totalFields > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Available Fields */}
          <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
            {/* Header with Select All */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
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
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
                <span className="text-sm text-gray-500">{totalFields} available</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search available fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Fields Grid - bounded with scroll */}
            <div className="p-4 bg-white max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredFields.map(field => (
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
              {filteredFields.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-500">
                  <p>No fields match "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Deselected Fields List */}
          <div className="lg:col-span-1 border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-900">Excluded Fields</span>
                <span className="text-sm text-red-700">{totalFields - selectedCount}</span>
              </div>
            </div>

            {/* Deselected Fields List */}
            <div className="p-4 bg-white max-h-96 overflow-y-auto">
              {totalFields - selectedCount === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">All fields included</p>
                  <p className="text-xs mt-1">No fields are filtered out</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {deselectedFieldsArray.map(fieldName => (
                    <div
                      key={fieldName}
                      className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200 group hover:bg-red-100 transition-colors"
                    >
                      <span className="text-sm text-red-900 truncate flex-1">{fieldName}</span>
                      <button
                        onClick={() => onToggleField(fieldName)}
                        className="flex-shrink-0 p-1 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Include field"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {totalFields - selectedCount > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={onSelectAll}
                  className="w-full text-sm text-green-600 hover:text-green-700 py-2 px-3 rounded border border-green-300 hover:bg-green-50 transition-colors"
                >
                  Include All ({totalFields - selectedCount})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      {totalFields > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Only selected fields will be included in the pipeline.
            Changes are applied when you click "Save Pipeline".
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldDiscoveryPanel;
