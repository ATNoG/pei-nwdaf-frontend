import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

const TRANSFORMER_TYPES = [
  { type: 'filter', label: 'Filter', description: 'Filter fields by whitelist or blacklist' },
  { type: 'hashing', label: 'Hashing', description: 'Hash specified fields (preserves data type)' },
  { type: 'redaction', label: 'Redaction', description: 'Redact sensitive field values (preserves data type)' }
];

const TransformerStepEditor = ({ step, onSave, onCancel, availableFields }) => {
  const [stepType, setStepType] = useState(step?.type || 'filter');
  const [params, setParams] = useState(step?.params || {});

  useEffect(() => {
    // Reset params when type changes if not editing
    if (!step) {
      setParams(getDefaultParamsForType(stepType));
    }
  }, [stepType]);

  const getDefaultParamsForType = (type) => {
    switch (type) {
      case 'filter':
        return { mode: 'whitelist', fields: [] };
      case 'hashing':
        return { fields: [], salt: '' };
      case 'redaction':
        return { fields: [], replacement: '***' };
      default:
        return {};
    }
  };

  const handleSave = () => {
    // Validate params based on type
    if (stepType === 'filter' && params.fields?.length === 0 && params.mode === 'whitelist') {
      alert('Please select at least one field for whitelist mode');
      return;
    }
    if (stepType === 'hashing' && (!params.fields || params.fields.length === 0)) {
      alert('Please select at least one field to hash');
      return;
    }
    if (stepType === 'hashing' && !params.salt) {
      alert('Please enter a salt value for hashing');
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

  const renderFilterParams = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
        <select
          value={params.mode || 'whitelist'}
          onChange={(e) => updateParams('mode', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="whitelist">Whitelist (only selected fields)</option>
          <option value="blacklist">Blacklist (exclude selected fields)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fields ({params.fields?.length || 0} selected)
        </label>
        <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {availableFields.map(field => (
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
        </div>
      </div>
    </div>
  );

  const renderHashingParams = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fields to Hash ({params.fields?.length || 0} selected)
        </label>
        <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {availableFields.map(field => (
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
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Hashed values preserve the original data type (int → int, float → float, str → str)
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Salt</label>
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fields to Redact ({params.fields?.length || 0} selected)
        </label>
        <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {availableFields.map(field => (
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
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Values will be replaced with type-preserving defaults (-1 for int, -1.0 for float, False for bool, "***" for string)
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step ? 'Edit Transformer Step' : 'Add Transformer Step'}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Transformer Type</label>
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

            {/* Type-Specific Parameters */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Parameters</h3>
              {stepType === 'filter' && renderFilterParams()}
              {stepType === 'hashing' && renderHashingParams()}
              {stepType === 'redaction' && renderRedactionParams()}
            </div>

            {/* Preview */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify({ type: stepType, params }, null, 2)}
              </pre>
            </div>
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
            {step ? 'Update' : 'Add'} Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransformerStepEditor;
