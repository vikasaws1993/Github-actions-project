import React from 'react';
// import { Globe } from 'lucide-react';
// import './LanguageSelector.css';

export const LanguageSelector = ({ variant = 'default', className = '' }) => {
  // Language button temporarily commented out
  return null;
  /*
  return (
    <div className={`lang-selector-container ${variant} ${className} lang-selector-disabled`}>
      <button
        type="button"
        className="lang-selector-btn lang-btn-disabled"
        disabled
        title="Language change is temporarily disabled (English only)"
        aria-label="Language: English"
      >
        <Globe size={15} className="lang-globe-icon" />
        <span className="lang-flag">🇬🇧</span>
        <span className="lang-label-text">English</span>
      </button>
    </div>
  );
  */
};

export default LanguageSelector;
