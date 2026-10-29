import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Users,
  Edit2,
  Trash2,
  Power,
  X,
  PhoneCall,
  ShieldCheck,
  Building2,
  Sparkles,
  Check,
  FileCheck2
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useLanguage } from '@/context/LanguageContext';
import Loader from '@/components/common/Loader/Loader';
import './SchemeManagement.css';

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

export const SchemeManagement = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { schemes, addScheme, updateScheme, deleteScheme, toggleSchemeStatus, cases, applicationStats } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('All');

  // Modal local state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [selectedDocModalScheme, setSelectedDocModalScheme] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Central Health Insurance',
    coverageAmount: '',
    maxCoverageVal: '',
    description: '',
    eligibility: '',
    hotline: '',
    requiredDocuments: ['Aadhaar Card', 'Ration Card (Orange / Yellow / Antyodaya)', 'Doctor Consultation / Referral Note'],
    status: 'Active'
  });

  const [customDocInput, setCustomDocInput] = useState('');

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = schemes.length;
    const active = schemes.filter(s => s.status === 'Active').length;
    const inactive = schemes.filter(s => s.status === 'Inactive').length;

    // Dynamically calculate max benefit cap
    let maxVal = 0;
    schemes.forEach((s) => {
      let val = Number(s.maxCoverageVal);
      if (!val || isNaN(val)) {
        const numMatch = (s.coverageAmount || '').replace(/,/g, '').match(/\d+/);
        if (numMatch) val = Number(numMatch[0]);
      }
      if (val && val > maxVal) maxVal = val;
    });

    let maxCapStr = '₹0';
    if (maxVal >= 100000) {
      const inLakhs = maxVal / 100000;
      maxCapStr = `₹${inLakhs % 1 === 0 ? inLakhs.toFixed(0) : inLakhs.toFixed(1)} Lakh`;
    } else if (maxVal > 0) {
      maxCapStr = `₹${maxVal.toLocaleString('en-IN')}`;
    } else {
      maxCapStr = '₹5.0 Lakh';
    }

    // Dynamically calculate total beneficiaries from real registered cases
    const caseList = Array.isArray(cases) ? cases : [];
    const totalBeneficiaryCount = applicationStats?.total || caseList.length;
    const totalBeneficiariesStr = totalBeneficiaryCount > 0
      ? `${totalBeneficiaryCount.toLocaleString('en-IN')}+`
      : '0';

    return { total, active, inactive, maxCapStr, totalBeneficiariesStr };
  }, [schemes, cases, applicationStats]);

  // Categories list derived dynamically
  const categories = useMemo(() => {
    const set = new Set(schemes.map(s => s.category));
    return ['All', ...Array.from(set)];
  }, [schemes]);

  // Filtered schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter(scheme => {
      // Tab filter
      if (statusTab === 'Active' && scheme.status !== 'Active') return false;
      if (statusTab === 'Inactive' && scheme.status !== 'Inactive') return false;

      // Category filter
      if (categoryFilter !== 'All' && scheme.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = scheme.code.toLowerCase().includes(q);
        const matchesName = scheme.name.toLowerCase().includes(q);
        const matchesCategory = scheme.category.toLowerCase().includes(q);
        const matchesDesc = scheme.description.toLowerCase().includes(q);
        const matchesDocs = (scheme.requiredDocuments || []).join(' ').toLowerCase().includes(q);
        return matchesCode || matchesName || matchesCategory || matchesDesc || matchesDocs;
      }

      return true;
    });
  }, [schemes, statusTab, categoryFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingScheme(null);
    setFormData({
      code: '',
      name: '',
      category: 'State Flagship Scheme',
      coverageAmount: '₹1,50,000 / family / year',
      maxCoverageVal: '150000',
      description: '',
      eligibility: 'Empanelled card holders and eligible Maharashtrian citizens.',
      hotline: '1800-111-222',
      requiredDocuments: ['Aadhaar Card', 'Ration Card (Orange / Yellow / Antyodaya)', 'Doctor Consultation / Referral Note'],
      status: 'Active'
    });
    setCustomDocInput('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (scheme) => {
    setEditingScheme(scheme);
    setFormData({
      code: scheme.code || '',
      name: scheme.name || '',
      category: scheme.category || 'General Health Scheme',
      coverageAmount: scheme.coverageAmount || '',
      maxCoverageVal: scheme.maxCoverageVal || '',
      description: scheme.description || '',
      eligibility: scheme.eligibility || '',
      hotline: scheme.hotline || '',
      requiredDocuments: Array.isArray(scheme.requiredDocuments) && scheme.requiredDocuments.length > 0
        ? scheme.requiredDocuments
        : ['Aadhaar Card', 'Ration Card (Orange / Yellow)'],
      status: scheme.status || 'Active'
    });
    setCustomDocInput('');
    setModalOpen(true);
  };

  const toggleModalDoc = (docName) => {
    setFormData((prev) => {
      const cur = prev.requiredDocuments || [];
      const updated = cur.includes(docName)
        ? cur.filter((d) => d !== docName)
        : [...cur, docName];
      return { ...prev, requiredDocuments: updated };
    });
  };

  const handleAddCustomDocInModal = () => {
    if (!customDocInput.trim()) return;
    const cleanDoc = customDocInput.trim();
    setFormData((prev) => {
      const cur = prev.requiredDocuments || [];
      if (!cur.includes(cleanDoc)) {
        return { ...prev, requiredDocuments: [...cur, cleanDoc] };
      }
      return prev;
    });
    setCustomDocInput('');
  };

  const removeModalDoc = (docName) => {
    setFormData((prev) => ({
      ...prev,
      requiredDocuments: (prev.requiredDocuments || []).filter((d) => d !== docName)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert('Please enter Scheme Code and Scheme Name');
      return;
    }

    if (editingScheme) {
      updateScheme(editingScheme.id, formData);
    } else {
      addScheme(formData);
    }
    setModalOpen(false);
  };

  const handleDelete = (scheme) => {
    if (window.confirm(`Are you sure you want to delete scheme "${scheme.code} - ${scheme.name}"?`)) {
      deleteScheme(scheme.id);
    }
  };

  return (
    <div className="scheme-mgmt-container">
      {/* ── 1. KPI Summary Cards ── */}
      <div className="admin-kpi-grid">
        <div className="kpi-card border-blue">
          <div className="kpi-value text-blue">{metrics.total}</div>
          <div className="kpi-label">{t('schemes.empanelledSchemes', 'Empanelled Schemes')}</div>
        </div>

        <div className="kpi-card border-green">
          <div className="kpi-value text-green">{metrics.active}</div>
          <div className="kpi-label">{t('schemes.activeSchemes', 'Active Schemes')}</div>
        </div>

        <div className="kpi-card border-amber">
          <div className="kpi-value text-amber">{metrics.maxCapStr}</div>
          <div className="kpi-label">{t('schemes.maxBenefitCap', 'Max Benefit Cap')}</div>
        </div>

        <div className="kpi-card border-slate">
          <div className="kpi-value text-slate">{metrics.totalBeneficiariesStr}</div>
          <div className="kpi-label">{t('schemes.totalBeneficiaries', 'Total Beneficiaries')}</div>
        </div>
      </div>

      {/* ── 2. Controls & Search Bar ── */}
      <div className="scheme-controls-bar">
        <div className="scheme-search-filter-wrap">
          {/* Search Box */}
          <div className="scheme-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder={t('common.search', 'Search scheme code, title, document, or category...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="scheme-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">{t('schemes.allCategories', 'All Scheme Categories')}</option>
            {categories.filter(c => c !== 'All').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="scheme-tabs-row">
            <button
              className={`scheme-tab-btn ${statusTab === 'All' ? 'active' : ''}`}
              onClick={() => setStatusTab('All')}
            >
              {t('common.all', 'All')} ({schemes.length})
            </button>
            <button
              className={`scheme-tab-btn ${statusTab === 'Active' ? 'active' : ''}`}
              onClick={() => setStatusTab('Active')}
            >
              {t('common.active', 'Active')} ({metrics.active})
            </button>
            <button
              className={`scheme-tab-btn ${statusTab === 'Inactive' ? 'active' : ''}`}
              onClick={() => setStatusTab('Inactive')}
            >
              {t('common.inactive', 'Inactive')} ({metrics.inactive})
            </button>
          </div>
        </div>

        {/* Add Scheme Action Button */}
        <button className="scheme-add-btn" onClick={() => navigate('/admin/schemes/add')}>
          <Plus size={16} /> {t('schemes.addNewScheme', 'Add New Scheme')}
        </button>
      </div>

      {/* ── 3. Data Table ── */}
      <div className="scheme-table-card">
        <table className="scheme-table">
          <thead>
            <tr>
              <th>{t('schemes.schemeCodeTitle', 'SCHEME CODE & TITLE')}</th>
              <th>{t('schemes.category', 'CATEGORY')}</th>
              <th>{t('schemes.coverageAmount', 'COVERAGE AMOUNT')}</th>
              <th>{t('schemes.requiredDocuments', 'REQUIRED DOCUMENTS')}</th>
              <th>{t('schemes.helplineEligibility', 'HELPLINE & ELIGIBILITY')}</th>
              <th>{t('schemes.status', 'STATUS')}</th>
              <th style={{ textAlign: 'right' }}>{t('schemes.actions', 'ACTIONS')}</th>
            </tr>
          </thead>
          <tbody>
            {!schemes || schemes.length === 0 ? (
              <Loader
                asTableRow
                colSpan={7}
                message="Loading Welfare Schemes..."
                subtext="Syncing empanelled government and trust healthcare programs"
              />
            ) : filteredSchemes.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  No schemes found matching your search filters.
                </td>
              </tr>
            ) : (
              filteredSchemes.map((scheme) => {
                const docs = scheme.requiredDocuments && scheme.requiredDocuments.length > 0
                  ? scheme.requiredDocuments
                  : ['Aadhaar Card', 'Ration Card (Orange / Yellow)'];
                const firstTwoDocs = docs.slice(0, 2);
                const extraDocCount = docs.length - 2;

                return (
                  <tr key={scheme.id}>
                    {/* SCHEME CODE & TITLE */}
                    <td>
                      <div>
                        <span className="scheme-code-badge">{scheme.code}</span>
                        <span className="scheme-name-text">{scheme.name}</span>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td>
                      <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569' }}>
                        {scheme.category}
                      </span>
                    </td>

                    {/* COVERAGE AMOUNT */}
                    <td>
                      <div className="scheme-coverage-pill">
                        <IndianRupee size={13} />
                        {scheme.coverageAmount}
                      </div>
                    </td>

                    {/* REQUIRED DOCUMENTS */}
                    <td>
                      <div 
                        className="scheme-docs-cell-wrap"
                        onClick={() => setSelectedDocModalScheme(scheme)}
                        title="Click to view all required documents"
                      >
                        {firstTwoDocs.map((doc, dIdx) => (
                          <span key={dIdx} className="scheme-doc-badge">
                            <FileCheck2 size={11} color="#059669" />
                            {doc}
                          </span>
                        ))}
                        {extraDocCount > 0 && (
                          <button
                            type="button"
                            className="scheme-doc-more-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocModalScheme(scheme);
                            }}
                            title={`View all ${docs.length} required documents`}
                          >
                            +{extraDocCount} more
                          </button>
                        )}
                      </div>
                    </td>

                    {/* HELPLINE & ELIGIBILITY */}
                    <td>
                      <div className="scheme-hotline-wrap">
                        <span className="scheme-hotline-num">
                          <PhoneCall size={12} color="#166534" />
                          {scheme.hotline || '1800-111-222'}
                        </span>
                        <span className="scheme-eligibility-text" title={scheme.eligibility}>
                          {scheme.eligibility}
                        </span>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td>
                      <span className={`scheme-status-pill ${scheme.status === 'Active' ? 'active' : 'inactive'}`}>
                        <span className="status-dot-glow" />
                        {scheme.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="scheme-action-btns" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="scheme-icon-btn edit-btn"
                          title="Edit Scheme"
                          onClick={() => handleOpenEditModal(scheme)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="scheme-icon-btn toggle-btn"
                          title={scheme.status === 'Active' ? 'Deactivate Scheme' : 'Activate Scheme'}
                          onClick={() => toggleSchemeStatus(scheme.id)}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          className="scheme-icon-btn delete-btn"
                          title="Delete Scheme"
                          onClick={() => handleDelete(scheme)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 4. Add / Edit Scheme Modal ── */}
      {modalOpen && (
        <div className="scheme-modal-overlay">
          <div className="scheme-modal-card">
            <div className="scheme-modal-header">
              <div className="scheme-modal-title">
                <ShieldCheck size={20} color="#22c55e" />
                {editingScheme ? `Edit Scheme: ${editingScheme.code}` : 'Register New Health Scheme'}
              </div>
              <button className="scheme-modal-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="scheme-modal-body">
                <div className="scheme-form-row">
                  {/* Scheme Code */}
                  <div className="scheme-form-group">
                    <label>Scheme Code / Abbreviation <span>*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. PM-JAY, MJPJAY"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="scheme-form-group">
                    <label>Scheme Category <span>*</span></label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Central Health Insurance">Central Health Insurance</option>
                      <option value="State Flagship Scheme">State Flagship Scheme</option>
                      <option value="Special Welfare Scheme">Special Welfare Scheme</option>
                      <option value="Child & Paediatric Health">Child & Paediatric Health</option>
                      <option value="Emergency Financial Aid">Emergency Financial Aid</option>
                    </select>
                  </div>
                </div>

                {/* Scheme Full Name */}
                <div className="scheme-form-group full-width">
                  <label>Full Scheme Name <span>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Pradhan Mantri Jan Arogya Yojana"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="scheme-form-row">
                  {/* Coverage Amount Text */}
                  <div className="scheme-form-group">
                    <label>Financial Coverage Text <span>*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. ₹5,00,000 / family / year"
                      value={formData.coverageAmount}
                      onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                      required
                    />
                  </div>

                  {/* Hotline */}
                  <div className="scheme-form-group">
                    <label>Toll-Free Helpline / Hotline</label>
                    <input
                      type="text"
                      placeholder="e.g. 14555 / 1800-111-565"
                      value={formData.hotline}
                      onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                    />
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div className="scheme-form-group full-width">
                  <label>Eligibility Criteria</label>
                  <input
                    type="text"
                    placeholder="e.g. Orange & Yellow Ration Card Holders of Maharashtra"
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="scheme-form-group full-width">
                  <label>Description & Scope of Coverage</label>
                  <textarea
                    rows="2"
                    placeholder="Provide details about covered medical procedures, surgeries, and benefits..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Mandatory Required Documents Selection */}
                <div className="scheme-form-group full-width" style={{ marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 800 }}>
                    <FileCheck2 size={16} /> Mandatory Required Documents
                  </label>
                  
                  <div className="modal-doc-presets-grid">
                    {DEFAULT_DOC_OPTIONS.map((doc) => {
                      const isChecked = (formData.requiredDocuments || []).includes(doc);
                      return (
                        <div
                          key={doc}
                          className={`modal-doc-card ${isChecked ? 'selected' : ''}`}
                          onClick={() => toggleModalDoc(doc)}
                        >
                          <div className="doc-chk">
                            {isChecked && <Check size={12} color="#ffffff" />}
                          </div>
                          <span className="doc-title">{doc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Document add in modal */}
                  <div className="modal-custom-doc-row" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Type custom document name (e.g. Police ID, Ayushman Card)..."
                      value={customDocInput}
                      onChange={(e) => setCustomDocInput(e.target.value)}
                      style={{ flex: 1, padding: '7px 12px', fontSize: '0.8rem', borderRadius: '7px', border: '1px solid #cbd5e1' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomDocInModal();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDocInModal}
                      style={{ padding: '7px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  </div>

                  {/* Configured Chips in Modal */}
                  {(formData.requiredDocuments || []).length > 0 && (
                    <div className="modal-doc-chips-wrap" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(formData.requiredDocuments || []).map((docName) => (
                        <span key={docName} className="modal-doc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span>{docName}</span>
                          <button type="button" onClick={() => removeModalDoc(docName)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0 }}>
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="scheme-form-group" style={{ marginTop: '10px' }}>
                  <label>Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="scheme-modal-footer">
                <button type="button" className="scheme-cancel-btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="scheme-submit-btn">
                  <Check size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Required Documents View Modal ── */}
      {selectedDocModalScheme && (
        <div className="scheme-modal-overlay" onClick={() => setSelectedDocModalScheme(null)}>
          <div className="scheme-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="scheme-modal-header">
              <div className="scheme-modal-title">
                <FileCheck2 size={20} color="#059669" />
                Required Documents: {selectedDocModalScheme.code}
              </div>
              <button className="scheme-modal-close" onClick={() => setSelectedDocModalScheme(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="scheme-modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.825rem', color: '#64748b' }}>
                Mandatory document requirements configured for <strong>{selectedDocModalScheme.name}</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedDocModalScheme.requiredDocuments || ['Aadhaar Card', 'Ration Card (Orange / Yellow)']).map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="scheme-modal-footer">
              <button 
                type="button" 
                className="scheme-submit-btn" 
                onClick={() => setSelectedDocModalScheme(null)}
                style={{ background: '#475569' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemeManagement;
