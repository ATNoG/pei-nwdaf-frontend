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
    option.toString().toLowerCase().includes(searchTerm.toLowerCase()),
  recentSearchKey = null, // localStorage key for recent searches
  maxRecent = 5, // max number of recent items to show
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent items from localStorage on mount
  useEffect(() => {
    if (!recentSearchKey) return;
    try {
      const stored = localStorage.getItem(`recent-search-${recentSearchKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.warn('Failed to load recent items from localStorage:', e);
    }
  }, [recentSearchKey]);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(option => filterOption(option, searchTerm))
    : options;

  const visibleOptions = filteredOptions.slice(0, maxVisible);
  const remainingCount = filteredOptions.length - maxVisible;

  // Recent items that are valid (exist in current options)
  const validRecentItems = recentItems
    .filter(item => options.some(opt => opt === item))
    .slice(0, maxRecent);

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

    // Save to recent items in localStorage
    if (recentSearchKey && option != null) {
      try {
        const updatedRecent = [option, ...recentItems.filter(item => item !== option)];
        const sliced = updatedRecent.slice(0, maxRecent);
        setRecentItems(sliced);
        localStorage.setItem(`recent-search-${recentSearchKey}`, JSON.stringify(sliced));
      } catch (e) {
        console.warn('Failed to save recent item to localStorage:', e);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    // Calculate total number of visible items
    const recentCount = !searchTerm ? validRecentItems.length : 0;
    const sectionHeaderCount = recentCount > 0 && visibleOptions.length > 0 ? 1 : 0;
    const totalItems = recentCount + sectionHeaderCount + visibleOptions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        // Determine which item is selected based on highlightedIndex
        if (highlightedIndex < recentCount) {
          // Recent item selected
          handleSelect(validRecentItems[highlightedIndex]);
        } else if (highlightedIndex >= recentCount + sectionHeaderCount) {
          // Regular option selected
          const optionIndex = highlightedIndex - recentCount - sectionHeaderCount;
          if (optionIndex < visibleOptions.length) {
            handleSelect(visibleOptions[optionIndex]);
          }
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

  const displayValue = isOpen ? searchTerm : (value ? formatOption(value) : '');

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
          {visibleOptions.length === 0 && validRecentItems.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchTerm ? 'No results found' : 'No options available'}
            </div>
          ) : (
            <>
              {/* Recent searches section */}
              {!searchTerm && validRecentItems.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    Recent
                  </div>
                  {validRecentItems.map((item, index) => (
                    <div
                      key={`recent-${index}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                        index === highlightedIndex
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      } ${
                        value === item ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatOption(item)}
                    </div>
                  ))}
                  {visibleOptions.length > 0 && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-t border-b border-gray-100 mt-1">
                      All Options
                    </div>
                  )}
                </>
              )}

              {/* Regular options */}
              {visibleOptions.map((option, index) => {
                const actualIndex = !searchTerm && validRecentItems.length > 0
                  ? validRecentItems.length + 1 + index // +1 for the section header
                  : index;
                return (
                  <div
                    key={index}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                    className={`px-4 py-2 cursor-pointer transition-colors ${
                      actualIndex === highlightedIndex
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    } ${
                      value === option ? 'bg-blue-100 font-medium' : ''
                    }`}
                  >
                    {formatOption(option)}
                  </div>
                );
              })}
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
