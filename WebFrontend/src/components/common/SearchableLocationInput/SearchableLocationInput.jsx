import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import './SearchableLocationInput.css';

export const SearchableLocationInput = ({
  id,
  value = '',
  onChange,
  onSelect,
  options = [],
  placeholder = 'Type to search...',
  disabled = false,
  required = false,
  hasError = false,
  className = '',
  prefixMatch = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter options based on typed value
  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) return [];
    const clean = (value || '').trim().toLowerCase();
    if (!clean) return options;

    return options.filter((opt) => {
      const lower = opt.toLowerCase();
      return prefixMatch ? lower.startsWith(clean) : lower.includes(clean);
    });
  }, [options, value, prefixMatch]);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (opt) => {
    onChange(opt);
    if (onSelect) onSelect(opt);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    if (onSelect) onSelect('');
    setIsOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleOptionClick(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`sli-container ${disabled ? 'sli-disabled' : ''}`}
    >
      <div className="sli-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={`sli-input ${hasError ? 'sli-input-error' : ''} ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />

        <div className="sli-icons-box">
          {value && !disabled ? (
            <button
              type="button"
              className="sli-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear value"
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className="sli-chevron-btn"
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            tabIndex={-1}
            disabled={disabled}
            aria-label="Toggle suggestions"
          >
            <ChevronDown size={15} className={isOpen ? 'sli-chevron-open' : ''} />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && !disabled && (
        <ul className="sli-dropdown-menu" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected =
                (value || '').trim().toLowerCase() === opt.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={isSelected}
                  className={`sli-dropdown-item ${isSelected ? 'sli-item-selected' : ''} ${isHighlighted ? 'sli-item-highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur before click registers
                    handleOptionClick(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className="sli-item-text">{opt}</span>
                  {isSelected && <span className="sli-checkmark">✓</span>}
                </li>
              );
            })
          ) : (
            <li className="sli-no-results">
              No matching locations starting with "{value}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableLocationInput;
