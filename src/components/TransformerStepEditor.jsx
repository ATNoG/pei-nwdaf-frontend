import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

const TRANSFORMER_TYPES = [
  { type: 'hashing', label: 'Hashing', description: 'Hash specified fields (preserves data type)' },
  { type: 'redaction', label: 'Redaction', description: 'Redact sensitive field values (preserves data type)' }
];

const TransformerStepEditor = ({ step, onSave, onCancel, availableFields }) => {
  const [stepType, setStepType] = useState(step?.type || '');
  const [params, setParams] = useState(step?.params || {});
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const initialStepType = React.useRef(step?.type);

  // Initialize params from step when component mounts or step changes
  useEffect(() => {
    if (step) {
      // Editing mode - set type and params from step
      setStepType(step.type);
      setParams(step.params || getDefaultParamsForType(step.type));
      initialStepType.current = step.type;
    }
  }, [step]); // Only run when step object changes

  // Handle type changes
  useEffect(() => {
    // Skip if stepType is empty (initial state)
    if (!stepType) return;

    const isEditing = !!step;
    const originalType = initialStepType.current;

    // For new steps, or when type changes in edit mode (and different from original)
    if (!isEditing || (isEditing && stepType !== originalType)) {
      setParams(getDefaultParamsForType(stepType));
    }
  }, [stepType, step]); // Depend on stepType and step

  const getDefaultParamsForType = (type) => {
    switch (type) {
      case 'hashing':
        return { fields: [], salt: '' };
      case 'redaction':
        return { fields: [], replacement: '***' };
      default:
        return {};
    }
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    // Validate that a type is selected
    if (!stepType) {
      showToast('Please select a transformation type', 'error');
      return;
    }

    // Validate params based on type
    if (stepType === 'hashing' && (!params.fields || params.fields.length === 0)) {
      showToast('Please select at least one field to hash', 'error');
      return;
    }
    if (stepType === 'hashing' && !params.salt) {
      showToast('Please enter a salt value for hashing', 'error');
      return;
    }

    onSave({
      type: stepType,
      params
    });
  };

  const updateParams = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleFieldInList = (fieldName) => {
    const fields = params.fields || [];
    if (fields.includes(fieldName)) {
      updateParams('fields', fields.filter(f => f !== fieldName));
    } else {
      updateParams('fields', [...fields, fieldName]);
    }
  };

  const filteredFields = React.useMemo(() => {
    if (!searchQuery) return availableFields;
    return availableFields.filter(f =>
      f.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableFields, searchQuery]);

  const renderSelectedFieldsSummary = () => {
    const selectedFields = params.fields || [];
    if (selectedFields.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={() => updateParams('fields', [])}
            className="text-xs text-blue-700 hover:text-blue-900 underline"
          >
            Clear all
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {selectedFields.slice(0, 10).map(field => (
            <span
              key={field}
              className="inline-flex items-center px-2 py-1 bg-white rounded text-xs text-blue-800 border border-blue-300"
            >
              {field}
              <button
                type="button"
                onClick={() => toggleFieldInList(field)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedFields.length > 10 && (
            <span className="text-xs text-blue-600">+{selectedFields.length - 10} more</span>
          )}
        </div>
      </div>
    );
  };

  const renderFieldSelector = (label) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} ({params.fields?.length || 0} selected)
      </label>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-2 border-b border-gray-200 bg-gray-50">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="p-3 max-h-48 overflow-y-auto">
          {filteredFields.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No fields match "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredFields.map(field => (
                <label
                  key={field}
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                    params.fields?.includes(field) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={params.fields?.includes(field) || false}
                    onChange={() => toggleFieldInList(field)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm truncate">{field}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHashingParams = () => (
    <div className="space-y-4">
      {renderFieldSelector('Fields to Hash')}
      <p className="text-xs text-gray-500">
        Hashed values preserve the original data type (int → int, float → float, str → str)
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Salt <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={params.salt || ''}
          onChange={(e) => updateParams('salt', e.target.value)}
          placeholder="Enter salt value"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">A unique salt ensures secure hashing</p>
      </div>
    </div>
  );

  const renderRedactionParams = () => (
    <div className="space-y-4">
      {renderFieldSelector('Fields to Redact')}
      <p className="text-xs text-gray-500">
        Values will be replaced with type-preserving defaults (-1 for int, -1.0 for float, False for bool, "***" for string)
      </p>
    </div>
  );

  const renderPreview = () => (
    <div className="bg-gray-50 rounded-lg p-4 h-full">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Configuration data preview</h3>
      <p className="text-xs text-gray-500 mb-3">This is the configuration that will be sent to components when transforming.</p>
      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs">
        {JSON.stringify({ type: stepType, params }, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <FaTimes className="flex-shrink-0" />
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="flex-shrink-0 hover:opacity-75 ml-2"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step ? 'Edit Field Transformation' : 'Add Field Transformation'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Step Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transformation Type</label>
              <div className="grid grid-cols-2 gap-3">
                {TRANSFORMER_TYPES.map(({ type, label, description }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setStepType(type)}
                    className={`p-4 text-left rounded-lg border-2 transition-colors ${
                      stepType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-sm text-gray-500 mt-1">{description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Type-Specific Parameters - only show after type is selected */}
            {stepType && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Parameters Section - 2 columns */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Parameters</h3>
                    {renderSelectedFieldsSummary()}
                    {stepType === 'hashing' && renderHashingParams()}
                    {stepType === 'redaction' && renderRedactionParams()}
                  </div>
                </div>

                {/* Preview Section - 1 column on the right */}
                <div className="lg:col-span-1">
                  {renderPreview()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {step ? 'Update' : 'Add'} Transformation
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransformerStepEditor;
