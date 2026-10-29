import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  FileText, 
  IndianRupee, 
  Check, 
  Users, 
  FileCheck2, 
  Plus, 
  X,
  CheckCircle2
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import './AddScheme.css';

const DEFAULT_DOC_OPTIONS = [
  'Aadhaar Card',
  'Ration Card (Orange / Yellow / Antyodaya)',
  'Doctor Consultation / Referral Note',
  'Income Certificate / BPL Certificate',
  'Hospital Cost Estimate & Pre-Auth Form',
  'Pathology & Diagnostic Test Reports',
  'Discharge Summary / Indoor Case Paper',
  'Bank Passbook / DBT Account Proof'
];

export const AddScheme = () => {
  const navigate = useNavigate();
  const { addScheme, showToast } = useAdmin();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'State Flagship Scheme',
    coverageAmount: '₹1,50,000 / family / year',
    maxCoverageVal: '150000',
    description: '',
    eligibility: 'Empanelled card holders and eligible Maharashtrian citizens.',
    hotline: '1800-111-222',
    status: 'Active'
  });

  // Mandatory Required Documents state
  const [selectedDocs, setSelectedDocs] = useState([
    'Aadhaar Card',
    'Ration Card (Orange / Yellow / Antyodaya)',
    'Doctor Consultation / Referral Note'
  ]);
  const [customDocInput, setCustomDocInput] = useState('');

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const toggleDoc = (docName) => {
    setSelectedDocs((prev) => {
      if (prev.includes(docName)) {
        return prev.filter((d) => d !== docName);
      } else {
        return [...prev, docName];
      }
    });
  };

  const handleAddCustomDoc = () => {
    if (!customDocInput.trim()) return;
    const cleanDoc = customDocInput.trim();
    if (!selectedDocs.includes(cleanDoc)) {
      setSelectedDocs((prev) => [...prev, cleanDoc]);
    }
    setCustomDocInput('');
  };

  const removeDoc = (docName) => {
    setSelectedDocs((prev) => prev.filter((d) => d !== docName));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'Scheme code / abbreviation is required';
    if (!formData.name.trim()) newErrors.name = 'Full scheme name is required';
    if (!formData.coverageAmount.trim()) newErrors.coverageAmount = 'Coverage amount text is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill in all mandatory fields (*)', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      if (addScheme) {
        await addScheme({
          code: formData.code.trim().toUpperCase(),
          scheme_code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          category: formData.category,
          coverageAmount: formData.coverageAmount.trim(),
          coverage_amount_text: formData.coverageAmount.trim(),
          maxCoverageVal: Number(formData.maxCoverageVal) || 150000,
          maximum_coverage_amount: Number(formData.maxCoverageVal) || 150000,
          description: formData.description.trim() || 'Healthcare coverage scheme for eligible beneficiaries.',
          eligibility: formData.eligibility.trim() || 'Eligible card holders with valid identification.',
          eligibility_description: formData.eligibility.trim() || 'Eligible card holders with valid identification.',
          hotline: formData.hotline.trim() || '1800-111-222',
          requiredDocuments: selectedDocs.length > 0 ? selectedDocs : ['Aadhaar Card', 'Ration Card (Orange / Yellow)'],
          required_documents: selectedDocs.length > 0 ? selectedDocs : ['Aadhaar Card', 'Ration Card (Orange / Yellow)'],
          status: formData.status
        });
      }
      navigate('/admin/schemes');
    } catch (err) {
      console.error('[AddScheme] Failed to create scheme:', err);
      showToast(err.message || 'Failed to register scheme', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-scheme-page">
      {/* Back Button Link */}
      <div className="add-scheme-header">
        <button 
          className="btn-back-link" 
          onClick={() => navigate('/admin/schemes')}
          type="button"
        >
          <ArrowLeft size={16} />
          Back to Schemes Directory
        </button>

        {/* Title Banner */}
        <div className="add-scheme-title-wrap">
          <div className="add-scheme-icon-badge">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 className="add-scheme-title">Register New Government Healthcare Scheme</h2>
            <p className="add-scheme-subtitle">
              Configure scheme parameters, financial coverage limits, required documents & eligibility criteria
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="add-scheme-form-container">
        
        {/* Section 1: Basic Identifiers */}
        <div className="form-card-section">
          <div className="section-header">
            <FileText size={18} className="text-blue" />
            <h3>1. Scheme Identification & Category</h3>
          </div>

          <div className="form-grid-two">
            {/* Scheme Code */}
            <div className="form-field">
              <label className="field-label">Scheme Code / Abbreviation <span className="req-star">*</span></label>
              <input
                type="text"
                className={`field-input ${errors.code ? 'input-error' : ''}`}
                placeholder="e.g. PM-JAY, MJPJAY, MPKAY"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              />
              {errors.code && <span className="error-text">{errors.code}</span>}
            </div>

            {/* Scheme Category */}
            <div className="form-field">
              <label className="field-label">Scheme Category <span className="req-star">*</span></label>
              <select
                className="field-select"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="State Flagship Scheme">State Flagship Scheme</option>
                <option value="Central Health Insurance">Central Health Insurance</option>
                <option value="Special Welfare Scheme">Special Welfare Scheme</option>
                <option value="Child & Paediatric Health">Child & Paediatric Health</option>
                <option value="Emergency Financial Aid">Emergency Financial Aid</option>
              </select>
            </div>

            {/* Full Scheme Name */}
            <div className="form-field full-width">
              <label className="field-label">Full Official Scheme Title <span className="req-star">*</span></label>
              <input
                type="text"
                className={`field-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Mahatma Jyotirao Phule Jan Arogya Yojana"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Coverage Limits */}
        <div className="form-card-section">
          <div className="section-header">
            <IndianRupee size={18} className="text-green" />
            <h3>2. Financial Coverage & Support Helpline</h3>
          </div>

          <div className="form-grid-two">
            {/* Coverage Amount Text */}
            <div className="form-field">
              <label className="field-label">Financial Coverage Display Text <span className="req-star">*</span></label>
              <input
                type="text"
                className={`field-input ${errors.coverageAmount ? 'input-error' : ''}`}
                placeholder="e.g. ₹5,00,000 / family / year"
                value={formData.coverageAmount}
                onChange={(e) => handleInputChange('coverageAmount', e.target.value)}
              />
              {errors.coverageAmount && <span className="error-text">{errors.coverageAmount}</span>}
            </div>

            {/* Toll-Free Hotline */}
            <div className="form-field">
              <label className="field-label">Toll-Free Helpline / Hotline Contact</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. 14555 / 1800-111-565"
                value={formData.hotline}
                onChange={(e) => handleInputChange('hotline', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Target Eligibility & Scope of Coverage */}
        <div className="form-card-section">
          <div className="section-header">
            <Users size={18} className="text-amber" />
            <h3>3. Target Eligibility & Procedure Scope</h3>
          </div>

          <div className="form-grid-two">
            {/* Eligibility Criteria */}
            <div className="form-field full-width">
              <label className="field-label">Target Beneficiary & Eligibility Criteria</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Yellow, Antyodaya, Annapurna & Orange Ration Card holders of Maharashtra"
                value={formData.eligibility}
                onChange={(e) => handleInputChange('eligibility', e.target.value)}
              />
            </div>

            {/* Description & Scope */}
            <div className="form-field full-width">
              <label className="field-label">Description & Scope of Covered Treatments</label>
              <textarea
                rows="3"
                className="field-textarea"
                placeholder="State sponsored flagship insurance providing coverage for secondary and tertiary medical procedures, surgeries, and ICU care..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Mandatory Required Documents */}
        <div className="form-card-section req-docs-section">
          <div className="section-header">
            <FileCheck2 size={18} className="text-emerald" />
            <div>
              <h3>4. Mandatory Required Documents for Verification</h3>
              <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
                Select or add the document requirements that citizens and ArogyaSevaks must upload for case approval under this scheme.
              </span>
            </div>
          </div>

          {/* Document Presets Checkbox Grid */}
          <div className="doc-presets-grid">
            {DEFAULT_DOC_OPTIONS.map((doc) => {
              const isChecked = selectedDocs.includes(doc);
              return (
                <div 
                  key={doc} 
                  className={`doc-option-card ${isChecked ? 'selected' : ''}`}
                  onClick={() => toggleDoc(doc)}
                >
                  <div className="doc-checkbox">
                    {isChecked && <Check size={14} color="#ffffff" />}
                  </div>
                  <span className="doc-option-name">{doc}</span>
                </div>
              );
            })}
          </div>

          {/* Add Custom Document Input */}
          <div className="custom-doc-input-wrap">
            <input
              type="text"
              className="field-input custom-doc-field"
              placeholder="Add another required document (e.g. Police ID Card, Ayushman Token)..."
              value={customDocInput}
              onChange={(e) => setCustomDocInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomDoc();
                }
              }}
            />
            <button
              type="button"
              className="btn-add-custom-doc"
              onClick={handleAddCustomDoc}
              disabled={!customDocInput.trim()}
            >
              <Plus size={15} /> Add Document
            </button>
          </div>

          {/* Active Selected Documents Summary */}
          {selectedDocs.length > 0 && (
            <div className="selected-docs-summary-box">
              <div className="sds-header">
                <CheckCircle2 size={15} color="#059669" />
                <span>Configured Required Documents ({selectedDocs.length})</span>
              </div>
              <div className="sds-chips-wrap">
                {selectedDocs.map((docName) => (
                  <span key={docName} className="sds-doc-chip">
                    <span>{docName}</span>
                    <button
                      type="button"
                      onClick={() => removeDoc(docName)}
                      title={`Remove ${docName}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="form-field" style={{ marginTop: '16px' }}>
            <label className="field-label">Initial Operational Status</label>
            <select
              className="field-select"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              <option value="Active">Active (Available across all dropdowns & case forms)</option>
              <option value="Inactive">Inactive (Disabled temporarily)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="form-actions-bar">
          <button 
            type="button" 
            className="btn-cancel"
            onClick={() => navigate('/admin/schemes')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-submit-scheme" disabled={submitting}>
            <Check size={17} />
            {submitting ? 'Registering Scheme...' : 'Register Health Scheme'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddScheme;
