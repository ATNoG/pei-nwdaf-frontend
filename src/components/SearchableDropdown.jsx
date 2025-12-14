import React, { useState, useEffect, useRef } from 'react';

const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  maxVisible = 20,
  loading = false,
  formatOption = (option) => option.toString(),
  filterOption = (option, searchTerm) => 
    option.toString().toLowerCase().includes(searchTerm.toLowerCase())
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(option => filterOption(option, searchTerm))
    : options;

  const visibleOptions = filteredOptions.slice(0, maxVisible);
  const remainingCount = filteredOptions.length - maxVisible;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < visibleOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleOptions.length > 0) {
          handleSelect(visibleOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  const displayValue = searchTerm || (value ? formatOption(value) : '');

  return (
    <div ref={dropdownRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
          {visibleOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchTerm ? 'No results found' : 'No options available'}
            </div>
          ) : (
            <>
              {visibleOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50'
                  } ${
                    value === option ? 'bg-blue-100 font-medium' : ''
                  }`}
                >
                  {formatOption(option)}
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="px-4 py-2 text-sm text-gray-500 border-t border-gray-200 bg-gray-50">
                  + {remainingCount} more results. Keep typing to filter...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
