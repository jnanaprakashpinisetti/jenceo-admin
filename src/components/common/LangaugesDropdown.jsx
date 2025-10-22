import React, { useRef, useState, useEffect } from "react";

const LanguagesDropdown = ({ value, onChange, error }) => {
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const languageOptions = [
    "Telugu", "English", "Hindi", "Urdu", "Kannada", 
    "Malayalam", "Tamil", "Bengali", "Marathi"
  ];

  // Get selected languages as array
  const selectedLanguages = Array.isArray(value) ? value : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLanguageToggle = (language) => {
    const newSelected = selectedLanguages.includes(language)
      ? selectedLanguages.filter(l => l !== language)
      : [...selectedLanguages, language];
    
    onChange(newSelected);
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectAll = () => {
    onChange([...languageOptions]);
  };

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        className={`form-select text-start ${error ? 'is-invalid' : ''}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer',
          backgroundImage: 'none', // Remove default dropdown arrow
          position: 'relative'
        }}
      >
        {selectedLanguages.length > 0 
          ? `Languages (${selectedLanguages.length})`
          : "Select Languages"
        }
        <span 
          className="position-absolute end-0 top-50 translate-middle-y me-2"
          style={{ pointerEvents: 'none' }}
        >
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {error && <div className="invalid-feedback">{error}</div>}

      {isOpen && (
        <div 
          className="dropdown-menu dropdown-menu-dark p-3 show" 
          style={{ width: '100%', marginBottom: "20px" }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="text-warning mb-0">Select Languages</h6>
            <div>
              <button
                className="btn btn-sm btn-outline-warning me-1"
                onClick={selectAll}
              >
                All
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={clearAll}
              >
                None
              </button>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <div className="d-flex flex-column gap-2">
            {languageOptions.map((language) => {
              const isSelected = selectedLanguages.includes(language);
              return (
                <div key={language} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`lang-${language}`}
                    checked={isSelected}
                    onChange={() => handleLanguageToggle(language)}
                  />
                  <label 
                    className="form-check-label text-white" 
                    htmlFor={`lang-${language}`}
                  >
                    {language}
                  </label>
                </div>
              );
            })}
          </div>
          
          <div className="dropdown-divider mt-2"></div>
          <div className="d-flex justify-content-between">
            <button
              className="btn btn-sm btn-outline-warning"
              onClick={clearAll}
            >
              Clear
            </button>
            <button
              className="btn btn-sm btn-outline-info"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguagesDropdown;