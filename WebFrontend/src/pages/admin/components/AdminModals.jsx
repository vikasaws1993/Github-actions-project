import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  FileText,
  FolderPlus,
  CheckCircle,
  Building2,
  AlertCircle,
  Eye,
  Send,
  PhoneCall,
  Clock,
  Pencil,
  Check,
  FileCheck2,
  Trash2,
  UserPlus,
  UserCheck,
  Shield,
  CalendarPlus,
  ExternalLink,
  Download,
  ShieldCheck,
  CheckCheck,
  PhoneOff,
  RotateCcw,
  GraduationCap,
  Stethoscope,
  User
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { isCaseAssigned } from '../../../services/applicationService';
import { locationDirectoryService } from '../../../services/locationDirectoryService';
import { SearchableLocationInput } from '../../../components/common/SearchableLocationInput/SearchableLocationInput';
import { resolveDocFileUrl } from '../../../utils/docUtils';
import './AdminModals.css';

// Sub-component for rendering document previews with graceful fallback on broken image URLs
const DocPreviewViewer = ({
  fileUrl,
  isPdfFile,
  isImageFile,
  docName,
  patientName,
  caseId,
  docFile,
  docSize,
  isDocVerified
}) => {
  const [imgLoadError, setImgLoadError] = useState(false);
  const [docLoading, setDocLoading] = useState(Boolean(fileUrl));

  useEffect(() => {
    setImgLoadError(false);
    if (fileUrl) {
      setDocLoading(true);
      // Auto-clear loading after 1200ms so that PDF iframes in Chrome never stay permanently blocked behind the spinner
      const timer = setTimeout(() => setDocLoading(false), 1200);
      return () => clearTimeout(timer);
    } else {
      setDocLoading(false);
    }
  }, [fileUrl]);

  if (fileUrl && isImageFile && !imgLoadError) {
    return (
      <div style={{ textAlign: 'center', background: '#0f172a', padding: '16px', borderRadius: '6px', position: 'relative', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {docLoading && (
          <div className="am-doc-preview-loader" style={{ background: 'rgba(15, 23, 42, 0.88)' }}>
            <div className="am-doc-preview-spinner" />
            <p className="am-doc-preview-text" style={{ color: '#ffffff' }}>Loading Image...</p>
            <span className="am-doc-preview-subtext" style={{ color: '#94a3b8' }}>Fetching secure file from storage</span>
          </div>
        )}
        <img
          src={fileUrl}
          alt={docName}
          onLoad={() => setDocLoading(false)}
          onError={() => { setImgLoadError(true); setDocLoading(false); }}
          style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', opacity: docLoading ? 0 : 1, transition: 'opacity 0.2s ease' }}
        />
      </div>
    );
  }

  if (fileUrl && isPdfFile) {
    return (
      <div style={{ width: '100%', height: '440px', borderRadius: '6px', overflow: 'hidden', position: 'relative', background: '#f8fafc' }}>
        {docLoading && (
          <div className="am-doc-preview-loader">
            <div className="am-doc-preview-spinner" />
            <p className="am-doc-preview-text">Loading PDF Document...</p>
            <span className="am-doc-preview-subtext">Fetching secure file from storage</span>
          </div>
        )}
        <iframe
          src={fileUrl}
          title={docName}
          onLoad={() => setDocLoading(false)}
          onError={() => setDocLoading(false)}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }


  return (
    <div className="doc-mock-paper" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', position: 'relative' }}>
      <div className="doc-mock-header" style={{ borderBottom: '2px solid #047857', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#047857', letterSpacing: '0.5px' }}>
            GOVERNMENT OF MAHARASHTRA
          </div>
          <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '600' }}>
            PUBLIC HEALTH DEPARTMENT · AYUSHMAN BHARAT (PM-JAY) & MJPJAY
          </div>
        </div>
        <span className="doc-date" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontSize: '0.725rem', fontWeight: '800' }}>
          OFFICIAL RECORD
        </span>
      </div>

      <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {docName}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.825rem' }}>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', fontWeight: 600 }}>PATIENT / APPLICANT</span>
          <strong style={{ color: '#1e293b' }}>{patientName}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', fontWeight: 600 }}>CASE REFERENCE</span>
          <strong style={{ color: '#0284c7' }}>{caseId}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', fontWeight: 600 }}>FILE NAME & SIZE</span>
          <strong style={{ color: '#1e293b' }}>{docFile} ({docSize})</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', fontWeight: 600 }}>VERIFICATION STATUS</span>
          <strong className={isDocVerified ? 'text-green' : 'text-orange'} style={{ fontWeight: 800 }}>
            {isDocVerified ? '✓ Verified by Health Authority' : '⏳ Pending Verification'}
          </strong>
        </div>
      </div>

      {/* Verification checklist block */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#ffffff', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="#16a34a" /> Official Verification Checklist
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={14} color="#16a34a" strokeWidth={3} />
            <span>Identity matches applicant record in database</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={14} color="#16a34a" strokeWidth={3} />
            <span>Valid for PM-JAY / MJPJAY scheme empanelment</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={14} color="#16a34a" strokeWidth={3} />
            <span>Document verified and recorded in case dossier</span>
          </div>
        </div>
      </div>

      <div className="doc-mock-seal" style={{ textAlign: 'center', padding: '10px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.5px', fontSize: '0.825rem', background: isDocVerified ? '#f0fdf4' : '#fff7ed', color: isDocVerified ? '#166534' : '#c2410c', border: isDocVerified ? '1px solid #bbf7d0' : '1px solid #fed7aa' }}>
        {isDocVerified ? '✓ VERIFIED OFFICIAL STATE RECORD · AROGYA MITRA PORTAL' : '⏳ PENDING OFFICIAL ADMIN VERIFICATION'}
      </div>
    </div>
  );
};

// Sub-component for registering new System Admin
const AddAdminModalContent = ({ closeModal, addAdmin }) => {
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    mobile: '',
    streetAddress: '',
    city: '',
    taluka: '',
    district: '',
    landmark: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please provide a valid 10-digit Indian mobile number.');
      return;
    }

    if (!form.district.trim() || !locationDirectoryService.isValidDistrict(form.district)) {
      setError('Please select a valid Maharashtra district.');
      return;
    }

    if (!form.taluka.trim() || !locationDirectoryService.isValidTaluka(form.district, form.taluka)) {
      setError('Please select a valid taluka for the selected district.');
      return;
    }

    if (!form.city.trim()) {
      setError('City / Locality is required.');
      return;
    }

    setLoading(true);
    try {
      const formattedAddress = [
        form.streetAddress,
        form.landmark ? `Landmark: ${form.landmark}` : null,
        form.city,
        form.taluka ? `Taluka: ${form.taluka}` : null,
        form.district ? `District: ${form.district}` : null
      ].filter(Boolean).join(', ');

      await addAdmin({
        ...form,
        mobile: cleanMobile,
        address: formattedAddress
      });
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to register Admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hosp-modal-content">
      {error && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '0.8rem', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      <div className="form-col-full">
        <label className="form-label">Full Name *</label>
        <input
          className="form-input"
          value={form.fullname}
          onChange={(e) => setForm({ ...form, fullname: e.target.value })}
          placeholder="e.g. Rajesh Deshmukh"
          required
        />
      </div>

      <div className="form-row" style={{ marginTop: '0.85rem' }}>
        <div className="form-col">
          <label className="form-label">Email Address *</label>
          <input
            type="email"
            className="form-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. rajesh.deshmukh@arogyamitra.gov.in"
            required
          />
        </div>
        <div className="form-col">
          <label className="form-label">Mobile Number *</label>
          <input
            className="form-input"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="e.g. 98220 99887"
            maxLength="10"
            required
          />
        </div>
      </div>

      {/* Address Format Fields */}
      <div className="form-col-full" style={{ marginTop: '0.85rem' }}>
        <label className="form-label">Full Street Address (Plot No., Road, Area) *</label>
        <input
          className="form-input"
          value={form.streetAddress}
          onChange={(e) => setForm({ ...form, streetAddress: e.target.value })}
          placeholder="Plot No. 45, MG Road, Kothrud"
        />
      </div>

      <div className="form-row" style={{ marginTop: '0.85rem', display: 'flex', gap: '10px' }}>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">District *</label>
          <SearchableLocationInput
            placeholder="e.g. Pune..."
            options={locationDirectoryService.getDistricts()}
            value={form.district}
            onChange={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            disabled={loading}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Taluka *</label>
          <SearchableLocationInput
            placeholder={!form.district ? 'Select District first' : 'e.g. Haveli...'}
            options={form.district ? locationDirectoryService.getTalukas(form.district) : []}
            value={form.taluka}
            onChange={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            disabled={loading || !form.district}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">City *</label>
          <input
            className="form-input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Pune"
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-col-full" style={{ marginTop: '0.85rem' }}>
        <label className="form-label">Nearest Landmark</label>
        <input
          className="form-input"
          value={form.landmark}
          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
          placeholder="e.g. Near Maruti Temple / Opposite Bus Stand"
        />
      </div>

      <div className="admin-modal-actions" style={{ marginTop: '1.25rem' }}>
        <button className="btn-secondary" onClick={closeModal} disabled={loading}>
          Cancel
        </button>
        <button
          className="btn-emerald"
          disabled={loading || !form.fullname.trim() || !form.email.trim() || form.mobile.replace(/\D/g, '').length !== 10}
          onClick={handleSubmit}
        >
          {loading ? 'Adding...' : '+ Add Admin'}
        </button>
      </div>
    </div>
  );
};

// Sub-component for adding new Follow-Up record
const AddFollowUpModalContent = ({ payload, closeModal, addFollowUp, cases }) => {
  const initialCaseId = payload?.caseId || (cases && cases.length > 0 ? cases[0].id : '');
  const initialCaseObj = (cases || []).find((c) => c.id === initialCaseId) || (cases && cases[0]);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [callTarget, setCallTarget] = useState('applicant'); // 'applicant', 'relative', 'admin'
  const [name, setName] = useState(initialCaseObj ? initialCaseObj.applicant : '');
  const [phone, setPhone] = useState(initialCaseObj ? initialCaseObj.contact : '');
  const [priority, setPriority] = useState('Medium');
  const [note, setNote] = useState('');

  const handleCaseChange = (caseId) => {
    setSelectedCaseId(caseId);
    const foundCase = (cases || []).find((c) => c.id === caseId);
    if (foundCase) {
      if (callTarget === 'relative') {
        setName(foundCase.relativeName ? `${foundCase.relativeName} (${foundCase.relativeRelation || 'Relative'})` : 'Relative Contact');
        setPhone(foundCase.relativeContact || foundCase.contact || '');
      } else {
        setName(foundCase.applicant || foundCase.patient || '');
        setPhone(foundCase.contact || '');
      }
    }
  };

  const handleTargetChange = (target) => {
    setCallTarget(target);
    const foundCase = (cases || []).find((c) => c.id === selectedCaseId);
    if (foundCase) {
      if (target === 'relative') {
        setName(foundCase.relativeName ? `${foundCase.relativeName} (${foundCase.relativeRelation || 'Relative'})` : 'Relative Contact');
        setPhone(foundCase.relativeContact || foundCase.contact || '');
      } else if (target === 'applicant') {
        setName(foundCase.applicant || foundCase.patient || '');
        setPhone(foundCase.contact || '');
      } else {
        setName('System Admin Follow-Up');
        setPhone(foundCase ? foundCase.contact : '');
      }
    }
  };

  const currentCase = (cases || []).find((c) => c.id === selectedCaseId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    addFollowUp({
      caseId: selectedCaseId || 'AM-2026-00124',
      name: name.trim() || 'Target Contact',
      phone: phone.trim() || '98765 43210',
      callTarget,
      type: callTarget === 'relative' ? 'call_relative' : callTarget === 'applicant' ? 'call_applicant' : 'admin_followup',
      priority,
      note: note.trim(),
      hospital: currentCase?.hospitalShort || currentCase?.hospital || 'Empanelled Hospital',
      scheme: currentCase?.scheme || 'PM-JAY'
    });

    closeModal();
  };

  return (
    <form onSubmit={handleSubmit} className="hosp-modal-content">
      <div className="form-row">
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Select Case ID *</label>
          <select
            className="form-input"
            value={selectedCaseId}
            onChange={(e) => handleCaseChange(e.target.value)}
          >
            {(cases || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.applicant} ({c.condition || 'General'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Follow-Up Type / Target *</label>
          <select
            className="form-input"
            value={callTarget}
            onChange={(e) => handleTargetChange(e.target.value)}
          >
            <option value="applicant">📱 Applicant / Patient Call</option>
            <option value="relative">👨‍👩‍👧 Relative / Emergency Contact Call</option>
            <option value="admin">📌 Manual Admin Internal Follow-Up</option>
          </select>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Contact Person Name *</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Phone Number *</label>
          <input
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 98765 43210"
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Priority Level *</label>
          <select
            className="form-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="Urgent">🚨 Urgent Priority</option>
            <option value="High">🔥 High Priority</option>
            <option value="Medium">⏱️ Medium Priority</option>
            <option value="Normal">✅ Normal Priority</option>
          </select>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col-full">
          <label className="form-label">Follow-Up Reason & Instructions *</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Call relative to confirm hospital pre-admission token arrival or document re-submission..."
          />
        </div>
      </div>

      <div className="admin-modal-actions" style={{ marginTop: '1.25rem' }}>
        <button type="button" className="btn-secondary" onClick={closeModal}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-emerald"
          disabled={!note.trim()}
        >
          Save Follow-Up Record
        </button>
      </div>
    </form>
  );
};

// Sub-component for editing ArogyaSevak details
const EditSevakModalContent = ({ payload, closeModal, updateArogyaSevak }) => {
  const [form, setForm] = useState({
    name: payload?.name || payload?.full_name || '',
    mobile: (payload?.mobile === '—' ? '' : (payload?.mobile || payload?.phone || '')).replace(/\D/g, '').slice(0, 10),
    email: payload?.email || '',
    address: payload?.address || payload?.street_address || '',
    city: payload?.city || 'Pune',
    taluka: payload?.taluka || 'Haveli',
    district: payload?.district || 'Pune',
    landmark: payload?.landmark || '',
    status: (payload?.rawStatus || payload?.status || 'Active').toUpperCase() === 'INACTIVE' ? 'Inactive' : 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.mobile.trim().length === 10 &&
    form.address.trim().length >= 3 &&
    form.city.trim().length >= 2 &&
    locationDirectoryService.isValidDistrict(form.district) &&
    locationDirectoryService.isValidTaluka(form.district, form.taluka);

  const handleSave = async (e) => {
    e?.preventDefault();
    setErrorMessage('');

    if (!form.name.trim() || form.name.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
      return;
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    }

    if (!form.address.trim() || form.address.trim().length < 3) {
      setErrorMessage('Full street address must be at least 3 characters long.');
      return;
    }

    if (!form.city.trim()) {
      setErrorMessage('City is required.');
      return;
    }

    if (!form.district.trim() || !locationDirectoryService.isValidDistrict(form.district)) {
      setErrorMessage('Please select a valid Maharashtra district.');
      return;
    }

    if (!form.taluka.trim() || !locationDirectoryService.isValidTaluka(form.district, form.taluka)) {
      setErrorMessage('Please select a valid taluka for the selected district.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = payload?.sevakId || payload?.id;
      await updateArogyaSevak(targetId, {
        name: form.name.trim(),
        full_name: form.name.trim(),
        mobile: cleanMobile,
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        taluka: form.taluka.trim(),
        district: form.district.trim(),
        landmark: form.landmark.trim(),
        status: form.status === 'Inactive' ? 'INACTIVE' : 'ACTIVE',
      });
      closeModal();
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to update Arogya Sevak details'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hosp-modal-content">
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="form-row">
        <div className="form-col">
          <label className="form-label">ArogyaSevak Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Suresh Jadhav"
            disabled={isSubmitting}
          />
        </div>
        <div className="form-col">
          <label className="form-label">Mobile Number *</label>
          <input
            className="form-input"
            value={form.mobile}
            onChange={(e) =>
              setForm({
                ...form,
                mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
              })
            }
            placeholder="e.g. 9876500001"
            maxLength="10"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col-full">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. suresh.jadhav@arogyamitra.gov.in (optional)"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col-full">
          <label className="form-label">Full Street Address (Plot No., Road, Area) *</label>
          <input
            className="form-input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Plot No. 45, MG Road, Kothrud"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">District *</label>
          <SearchableLocationInput
            placeholder="e.g. Pune..."
            options={locationDirectoryService.getDistricts()}
            value={form.district}
            onChange={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            disabled={isSubmitting}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Taluka *</label>
          <SearchableLocationInput
            placeholder={!form.district ? 'Select District first' : 'e.g. Haveli...'}
            options={form.district ? locationDirectoryService.getTalukas(form.district) : []}
            value={form.taluka}
            onChange={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            disabled={isSubmitting || !form.district}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">City *</label>
          <input
            className="form-input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Pune"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col-full">
          <label className="form-label">Nearest Landmark</label>
          <input
            className="form-input"
            value={form.landmark}
            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
            placeholder="e.g. Near Maruti Temple"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col" style={{ width: '100%' }}>
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            disabled={isSubmitting}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="admin-modal-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
          Cancel
        </button>
        <button
          className="btn-dark-green"
          disabled={!isFormValid || isSubmitting}
          onClick={handleSave}
        >
          {isSubmitting ? 'Saving Details...' : 'Save Details'}
        </button>
      </div>
    </div>
  );
};

// Sub-component for registering new ArogyaSevak
const AddSevakModalContent = ({ closeModal, addArogyaSevak }) => {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    taluka: '',
    district: '',
    landmark: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid =
    form.name.trim() &&
    form.mobile.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    locationDirectoryService.isValidDistrict(form.district) &&
    locationDirectoryService.isValidTaluka(form.district, form.taluka);

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!form.name.trim() || form.name.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
      return;
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    }

    if (!form.address.trim() || form.address.trim().length < 3) {
      setErrorMessage('Full street address must be at least 3 characters long.');
      return;
    }

    if (!form.city.trim()) {
      setErrorMessage('City is required.');
      return;
    }

    if (!form.district.trim() || !locationDirectoryService.isValidDistrict(form.district)) {
      setErrorMessage('Please select a valid Maharashtra district.');
      return;
    }

    if (!form.taluka.trim() || !locationDirectoryService.isValidTaluka(form.district, form.taluka)) {
      setErrorMessage('Please select a valid taluka for the selected district.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addArogyaSevak({
        ...form,
        mobile: cleanMobile,
        email: form.email.trim() || undefined,
      });
      closeModal();
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to register Arogya Sevak'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hosp-modal-content">
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Row 1: Full Name & Mobile */}
      <div className="form-row">
        <div className="form-col">
          <label className="form-label">ArogyaSevak Full Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Anand Shinde"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="form-col">
          <label className="form-label">Mobile Number *</label>
          <input
            className="form-input"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="e.g. 98765 00005"
            maxLength="10"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Row 2: Email Address */}
      <div className="form-row" style={{ marginTop: '0.85rem' }}>
        <div className="form-col-full">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. anand.shinde@arogyamitra.gov.in (optional)"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Row 3: Full Street Address */}
      <div className="form-row" style={{ marginTop: '0.85rem' }}>
        <div className="form-col-full">
          <label className="form-label">Full Street Address (Plot No., Road, Area) *</label>
          <input
            className="form-input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Plot No. 45, MG Road, Kothrud"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">District *</label>
          <SearchableLocationInput
            placeholder="e.g. Pune..."
            options={locationDirectoryService.getDistricts()}
            value={form.district}
            onChange={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, district: val, taluka: '' }))}
            disabled={isSubmitting}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">Taluka *</label>
          <SearchableLocationInput
            placeholder={!form.district ? 'Select District first' : 'e.g. Haveli...'}
            options={form.district ? locationDirectoryService.getTalukas(form.district) : []}
            value={form.taluka}
            onChange={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            onSelect={(val) => setForm((prev) => ({ ...prev, taluka: val }))}
            disabled={isSubmitting || !form.district}
            className="form-input"
          />
        </div>
        <div className="form-col" style={{ flex: 1 }}>
          <label className="form-label">City *</label>
          <input
            className="form-input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Pune"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-col-full">
          <label className="form-label">Nearest Landmark</label>
          <input
            className="form-input"
            value={form.landmark}
            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
            placeholder="e.g. Near Maruti Temple / Opposite Bus Stand"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="admin-modal-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
        <button
          className="btn-emerald"
          disabled={!isFormValid || isSubmitting}
          onClick={handleRegister}
        >
          {isSubmitting ? 'Registering...' : '+ Register Sevak'}
        </button>
      </div>
    </div>
  );
};

// Sub-component for rejecting case with scheme-ineligibility presets
const RejectCaseModalContent = ({ payload, closeModal, rejectCase }) => {
  const caseId = payload?.caseId || payload?.id;
  const patientName = payload?.patientName || payload?.patient || 'Applicant';

  const PRESET_REASONS = [
    {
      id: 'no_scheme_fit',
      label: 'Does not fit into any Government Healthcare Scheme (पात्रता निकषात बसत नाही)',
      detail: 'The patient, income or medical condition does not meet eligibility guidelines for PM-JAY, MJPJAY, or related empanelled schemes.'
    },
    {
      id: 'income_limit',
      label: 'Annual household income exceeds scheme ceiling limit (उत्पन्न मर्यादा ओलांडली आहे)',
      detail: 'Applicant income exceeds the threshold defined under government health scheme norms.'
    },
    {
      id: 'treatment_not_covered',
      label: 'Ailment / treatment not covered under scheme package (सदर उपचार योजनेत समाविष्ट नाही)',
      detail: 'The required medical or surgical procedure is not covered under the official empanelled package list.'
    },
    {
      id: 'docs_invalid',
      label: 'Incomplete or unverified identity / income documentation (अपूर्ण किंवा अवैध कागदपत्रे)',
      detail: 'Uploaded documents failed statutory verification or required eligibility proofs are missing.'
    },
    {
      id: 'custom',
      label: 'Other Custom Rejection Reason (इतर सविस्तर कारण)',
      detail: 'Specify a customized reason for the applicant.'
    }
  ];

  const [selectedPreset, setSelectedPreset] = useState('no_scheme_fit');
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    let finalReason = '';
    const foundPreset = PRESET_REASONS.find((p) => p.id === selectedPreset);
    if (selectedPreset === 'custom') {
      finalReason = customNote.trim() || 'Application rejected per administrative scheme eligibility review.';
    } else {
      finalReason = foundPreset ? foundPreset.label : 'Application does not fit any government scheme criteria.';
      if (customNote.trim()) {
        finalReason += ` — Tip/Note: ${customNote.trim()}`;
      }
    }

    try {
      if (payload?.onConfirm) {
        await payload.onConfirm(finalReason);
      } else {
        await rejectCase(caseId, finalReason);
      }
      closeModal();
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}
      >
        <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.9rem' }}>
            Reject Application: {caseId} {patientName ? `(${patientName})` : ''}
          </div>
          <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '2px' }}>
            This decision will immediately update the status on the Citizen's mobile application and send a push notification with the reason.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
          Select Reason for Rejection *
        </label>

        {PRESET_REASONS.map((preset) => (
          <label
            key={preset.id}
            onClick={() => setSelectedPreset(preset.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1.5px solid ${selectedPreset === preset.id ? '#dc2626' : '#e2e8f0'}`,
              background: selectedPreset === preset.id ? '#fff1f2' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="radio"
              name="rejectionPresetOption"
              checked={selectedPreset === preset.id}
              onChange={() => setSelectedPreset(preset.id)}
              style={{ marginTop: '3px', accentColor: '#dc2626' }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: selectedPreset === preset.id ? '#991b1b' : '#334155'
                }}
              >
                {preset.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {preset.detail}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569' }}>
          {selectedPreset === 'custom' ? 'Provide Detailed Reason *' : 'Additional Remarks / Citizen Guidance (Optional)'}
        </label>
        <textarea
          rows={3}
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder={
            selectedPreset === 'custom'
              ? 'Please specify exact reason why the application cannot be accommodated...'
              : 'Add any guidance for citizen (e.g. contact civil hospital, re-apply with yellow ration card, etc.)...'
          }
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.825rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 60-Day Reopen Policy Information */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <RotateCcw size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.4 }}>
          <strong>60-Day Reopen Policy:</strong> After rejection, this case enters a 60-day window during which the citizen can appeal or upload missing proofs, and an administrator can reopen and reconsider the case before it is permanently archived.
        </div>
      </div>

      <div className="admin-modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn-secondary" onClick={closeModal} disabled={loading}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={loading || (selectedPreset === 'custom' && !customNote.trim())}
          onClick={handleConfirm}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
          {loading ? 'Rejecting...' : 'Confirm Rejection'}
        </button>
      </div>
    </div>
  );
};

export const AdminModals = () => {
  const {
    activeModal,
    setActiveModal,
    updateCaseStatus,
    addCaseNote,
    requestDocument,
    verifyDocument,
    rejectCase,
    addHospital,
    updateArogyaSevak,
    deleteArogyaSevak,
    addArogyaSevak,
    addAdmin,
    deleteAdmin,
    updateAdmin,
    recordCallFollowUp,
    addFollowUp,
    cases,
    hospitals,
    arogyaSevaks = [],
    schemes = [],
    toastMessage
  } = useAdmin();

  // Local form states
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState('DOCS_VERIFIED');
  const [docToRequest, setDocToRequest] = useState('');
  const [otherDocName, setOtherDocName] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [sendAppNotice, setSendAppNotice] = useState(true);

  // Hospital form state
  const [hospForm, setHospForm] = useState({
    name: '',
    type: 'Government',
    location: 'Pune',
    city: 'Pune',
    district: 'Pune',
    address: '',
    areaTaluka: 'Haveli Taluka',
    pincode: '411004',
    nearestLandmark: '',
    scheme: 'PM-JAY, MJPJAY',
    selectedSevaks: [], // Multi-select array for ArogyaSevaks (empty by default)
    contact: '',
    doctors: []
  });
  const [isHospSubmitting, setIsHospSubmitting] = useState(false);
  const [showHospDocForm, setShowHospDocForm] = useState(false);
  const [hospDocInput, setHospDocInput] = useState({
    name: '',
    number: '',
    altNumber: '',
    specialities: 'General Medicine',
    qualification: 'MBBS',
    address: ''
  });

  useEffect(() => {
    if (activeModal?.type === 'update-status' && activeModal.payload?.status) {
      const s = String(activeModal.payload.status).toUpperCase().replace(/[-\s/]+/g, '_');
      if (['DOCS_VERIFIED', 'DOCUMENTS_VERIFIED', 'DOC_VERIFIED'].includes(s)) setNewStatus('DOCS_VERIFIED');
      else if (['COORDINATED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'REASSIGNED'].includes(s)) setNewStatus('COORDINATED');
      else if (['TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT'].includes(s)) setNewStatus('TREATMENT_STARTED');
      else if (['CLOSED', 'DISCHARGED'].includes(s)) setNewStatus('CLOSED');
      else if (['SUBMITTED', 'NEW'].includes(s)) setNewStatus('SUBMITTED');
      else setNewStatus('DOCS_VERIFIED');
    }
    if (activeModal?.type === 'request-docs') {
      setRequestNote('');
      setDocToRequest('');
      setOtherDocName('');
    }
  }, [activeModal]);

  if (!activeModal && !toastMessage) return null;

  const closeModal = () => setActiveModal(null);

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast admin-toast-${toastMessage.type}`}>
          <CheckCircle size={18} />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Modal Backdrop & Dialog */}
      {activeModal && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className={`admin-modal-card ${activeModal.type === 'view-doc' ? 'modal-card-wide' : ''} ${activeModal.type === 'call' ? 'modal-card-call' : ''}`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                {activeModal.type === 'call' && <Phone size={18} className="modal-icon text-green" />}
                {activeModal.type === 'add-note' && <FileText size={20} className="modal-icon text-blue" />}
                {activeModal.type === 'request-docs' && <FolderPlus size={20} className="modal-icon text-orange" />}
                {activeModal.type === 'update-status' && <CheckCircle size={20} className="modal-icon text-indigo" />}
                {activeModal.type === 'add-hospital' && <Building2 size={20} className="modal-icon text-emerald" />}
                {activeModal.type === 'view-doc' && <Eye size={20} className="modal-icon text-blue" />}
                {activeModal.type === 'edit-sevak' && <Pencil size={20} className="modal-icon text-blue" />}
                {activeModal.type === 'delete-sevak' && <AlertCircle size={20} className="modal-icon text-red" />}
                {activeModal.type === 'add-sevak' && <UserPlus size={20} className="modal-icon text-emerald" />}
                {activeModal.type === 'add-admin' && <Shield size={20} className="modal-icon text-emerald" />}
                {activeModal.type === 'delete-admin' && <AlertCircle size={20} className="modal-icon text-red" />}
                {activeModal.type === 'add-followup' && <CalendarPlus size={20} className="modal-icon text-emerald" />}
                {activeModal.type === 'reject-case' && <AlertCircle size={20} className="modal-icon text-red" />}

                <h3>
                  {activeModal.type === 'call' && `Call ${activeModal.payload?.callTarget || 'Applicant'} — ${activeModal.payload?.applicant || activeModal.payload?.name}`}
                  {activeModal.type === 'add-note' && `Add Case Note — ${activeModal.payload?.id || ''}`}
                  {activeModal.type === 'request-docs' && (() => {
                    const isAssigned = isCaseAssigned(activeModal.payload) || activeModal.payload?.status === 'Approved' || activeModal.payload?.status === 'APPROVED' || activeModal.payload?.status === 'Treatment Started';
                    return isAssigned
                      ? `Request Documents from ArogyaSevak — ${activeModal.payload?.id || ''}`
                      : `Request Documents from Citizen — ${activeModal.payload?.id || ''}`;
                  })()}
                  {activeModal.type === 'update-status' && `Update Case Status — ${activeModal.payload?.id || ''}`}
                  {activeModal.type === 'add-hospital' && 'Empanel New Hospital'}
                  {activeModal.type === 'view-doc' && `Document: ${activeModal.payload?.name || 'Document Preview'}`}
                  {activeModal.type === 'edit-sevak' && `Edit ArogyaSevak — ${activeModal.payload?.name}`}
                  {activeModal.type === 'delete-sevak' && `Delete ArogyaSevak`}
                  {activeModal.type === 'add-sevak' && 'Register New ArogyaSevak'}
                  {activeModal.type === 'add-admin' && 'Register New System Admin'}
                  {activeModal.type === 'edit-admin' && `Edit System Admin — ${activeModal.payload?.name}`}
                  {activeModal.type === 'delete-admin' && 'Delete System Admin'}
                  {activeModal.type === 'add-followup' && 'Create New Follow-Up & Call Log'}
                  {activeModal.type === 'reject-case' && `Reject Application — ${activeModal.payload?.caseId || activeModal.payload?.id || ''}`}
                </h3>
              </div>
              <button className="admin-modal-close" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="admin-modal-body">
              {/* Call Modal */}
              {activeModal.type === 'call' && (
                <div className="call-modal-content">
                  <div className="call-info-badge">
                    <PhoneCall size={26} className="pulse-icon" />
                    <div className="call-info-text">
                      <span className="call-label">Dialing {activeModal.payload?.callTarget === 'relative' ? 'Relative / Emergency Contact' : 'Applicant / Patient'}:</span>
                      <strong className="call-phone">{activeModal.payload?.phoneToCall || activeModal.payload?.contact || activeModal.payload?.phone || '98765 43210'}</strong>
                      <div className="call-meta-row">
                        <span className="call-person-name">
                          {activeModal.payload?.callTarget === 'relative' && activeModal.payload?.relativeName
                            ? `${activeModal.payload.relativeName} (${activeModal.payload.relativeRelation || 'Relative'})`
                            : activeModal.payload?.applicant || activeModal.payload?.name}
                        </span>
                        <span className="call-case-pill">
                          Case ID: <strong>{activeModal.payload?.id || activeModal.payload?.caseId}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="call-guide">
                    Connected via Operator CTI Gateway. Speak clearly and identify as ArogyaMitra Health Support Desk.
                  </p>
                  <div className="admin-modal-actions" style={{ justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      className="btn-hangup"
                      onClick={closeModal}
                    >
                      <PhoneOff size={15} />
                      <span>Hang Up</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add Note Modal */}
              {activeModal.type === 'add-note' && (
                <div className="note-modal-content">
                  {activeModal.payload?.assignedSevak && activeModal.payload.assignedSevak !== 'Not assigned' && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '7px',
                        marginBottom: '12px',
                        fontSize: '0.8rem',
                        color: '#14532d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <UserCheck size={16} color="#166534" />
                      <div>
                        <strong>Target Recipient: New ArogyaSevak ({activeModal.payload.assignedSevak})</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#15803d' }}>
                          This note will be transmitted directly to {activeModal.payload.assignedSevak}'s Sevak Portal task feed.
                        </span>
                      </div>
                    </div>
                  )}

                  <label className="form-label">Internal Admin Instruction / Note:</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder={`Enter observation or instructions for ${activeModal.payload?.assignedSevak || 'ArogyaSevak'}...`}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <span className="form-hint">Notes are visible to operators, ArogyaSevaks, and case reviewers.</span>
                  <div className="admin-modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button
                      className="btn-primary"
                      disabled={!noteText.trim()}
                      onClick={() => {
                        const targetCaseId = activeModal.payload?.id || activeModal.payload?.caseId || activeModal.payload?.applicationNumber;
                        addCaseNote(targetCaseId, noteText.trim());
                        setNoteText('');
                        closeModal();
                      }}
                    >
                      Save & Send Note
                    </button>
                  </div>
                </div>
              )}

              {activeModal.type === 'request-docs' && (() => {
                const targetCase = activeModal.payload || {};
                const isAssigned = isCaseAssigned(targetCase) || targetCase.status === 'Approved' || targetCase.status === 'APPROVED' || targetCase.status === 'Treatment Started' || targetCase.status === 'TREATMENT_STARTED' || targetCase.status === 'Coordinated';
                const assignedSevakName = targetCase.assignedSevak || targetCase.sevak || 'Akanksha Pawashe';
                const targetApplicantName = targetCase.applicant || targetCase.patient || 'Citizen';

                return (
                  <div className="request-modal-content">
                    {/* Dynamic Recipient Target Banner */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: isAssigned ? '#f0fdf4' : '#eff6ff',
                        border: `1px solid ${isAssigned ? '#bbf7d0' : '#bfdbfe'}`,
                        borderRadius: '8px',
                        marginBottom: '14px',
                        fontSize: '0.825rem',
                        color: isAssigned ? '#14532d' : '#1e40af'
                      }}
                    >
                      <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isAssigned ? (
                          <>
                            <span>🏥 Recipient: Assigned ArogyaSevak ({assignedSevakName})</span>
                          </>
                        ) : (
                          <>
                            <span>📱 Recipient: Citizen / Applicant ({targetApplicantName})</span>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.775rem', opacity: 0.9, lineHeight: '1.4' }}>
                        {isAssigned
                          ? `Case is approved & assigned. Document request will be routed directly to ArogyaSevak ${assignedSevakName} via Sevak Portal Task for clinical/hospital record upload.`
                          : `Case is pending initial approval. Document request will be sent directly to citizen ${targetApplicantName} via SMS & Citizen Portal App.`}
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label className="form-label">Select Document to Request: *</label>
                      <select
                        className="form-select"
                        value={docToRequest}
                        onChange={(e) => {
                          setDocToRequest(e.target.value);
                          if (e.target.value !== 'Other') {
                            setOtherDocName('');
                          }
                        }}
                      >
                        <option value="">Select document...</option>
                        {isAssigned ? (
                          <>
                            <option value="ICU Intake & Vitals Chart">ICU Intake & Vitals Chart</option>
                            <option value="Surgery Consent & Scheme Pre-Auth Form">Surgery Consent & Scheme Pre-Auth Form</option>
                            <option value="Discharge Summary & Medical Bills">Discharge Summary & Medical Bills</option>
                            <option value="Lab Test & Pathology Report">Lab Test & Pathology Report</option>
                            <option value="Other">Other Document (Specify Custom Name)</option>
                          </>
                        ) : (
                          <>
                            <option value="Medical Report">Medical Report / Doctor Referral</option>
                            <option value="Income Certificate">Income Certificate / Tahsildar Proof</option>
                            <option value="Ration Card (Yellow/Orange)">Ration Card (Yellow / Orange)</option>
                            <option value="Aadhaar Card Photo">Aadhaar Card Photo</option>
                            <option value="Other">Other Document (Specify Custom Name)</option>
                          </>
                        )}
                      </select>

                      {docToRequest === 'Other' && (
                        <div style={{ marginTop: '10px' }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 700 }}>
                            Specify Custom Document Name *
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Blood Bank Verification Certificate, Organ Donor Clearance..."
                            value={otherDocName}
                            onChange={(e) => setOtherDocName(e.target.value)}
                            style={{ width: '100%', marginTop: '4px' }}
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label className="form-label">Admin Note / Special Instructions (Optional):</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder={`Enter specific notes or instructions for ${isAssigned ? `ArogyaSevak (${assignedSevakName})` : `Citizen (${targetApplicantName})`} regarding this document request...`}
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                      <span className="form-hint" style={{ marginTop: '4px', display: 'block' }}>
                        This note will be transmitted directly with the document request task notification.
                      </span>
                    </div>

                    <div className="admin-modal-actions" style={{ marginTop: '18px' }}>
                      <button className="btn-secondary" onClick={() => { setRequestNote(''); setDocToRequest(''); setOtherDocName(''); closeModal(); }}>Cancel</button>
                      <button
                        className="btn-orange"
                        disabled={!docToRequest || (docToRequest === 'Other' && !otherDocName.trim())}
                        onClick={() => {
                          const finalDocName = docToRequest === 'Other' ? otherDocName.trim() : docToRequest;
                          const targetId = activeModal.payload?.id || activeModal.payload?.caseId || activeModal.payload?.applicationNumber;
                          requestDocument(targetId, finalDocName, null, requestNote);
                          setRequestNote('');
                          setDocToRequest('');
                          setOtherDocName('');
                          closeModal();
                        }}
                      >
                        <Send size={15} />
                        {isAssigned ? 'Send Task to ArogyaSevak' : 'Send Request to Citizen'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Update Status Modal */}
              {activeModal.type === 'update-status' && (() => {
                const targetCase = activeModal.payload;
                const isCaseClosed = targetCase?.status === 'Closed' || targetCase?.status === 'Closed (Expired)';
                const hasPendingRequestedDocs = (targetCase?.documents || []).some(
                  (d) => d.requested && !d.verified
                );
                const isPendingDocHold = targetCase?.status === 'Docs Required' || hasPendingRequestedDocs;
                const hasHospitalAssigned = Boolean(
                  targetCase &&
                  targetCase.hospital &&
                  targetCase.hospital !== '—' &&
                  targetCase.hospital !== 'Not assigned' &&
                  targetCase.assignedSevak &&
                  targetCase.assignedSevak !== 'Not assigned'
                );

                if (isCaseClosed) {
                  return (
                    <div className="status-modal-content">
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', color: '#166534', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Check size={20} color="#166534" />
                        <div>
                          <strong>✓ Case Closed & Resolved</strong>
                          <div style={{ marginTop: '2px', fontSize: '0.775rem', color: '#14532d' }}>
                            This case has been completed and closed. Status cannot be modified.
                          </div>
                        </div>
                      </div>
                      <div className="admin-modal-actions" style={{ marginTop: '16px' }}>
                        <button className="btn-secondary" onClick={closeModal}>Close</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="status-modal-content">
                    {/* Stage Banner */}
                    {isPendingDocHold ? (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', color: '#b45309', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                        <div>
                          <strong>📄 Case Currently On Hold (Docs Required):</strong>
                          <div style={{ marginTop: '3px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                            Document request is pending. Selecting a new status below will transition the case timeline stage and notify citizen & ArogyaSevak.
                          </div>
                        </div>
                      </div>
                    ) : hasHospitalAssigned ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', color: '#14532d', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#16a34a' }} />
                        <div>
                          <strong>🏥 Hospital Assigned Stage ({targetCase.hospital}):</strong>
                          <div style={{ marginTop: '3px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                            ArogyaSevak <strong>{targetCase.assignedSevak}</strong> is active on this case. Updating status will sync clinical & ward timeline stages.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', color: '#1e40af', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <FileText size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
                        <div>
                          <strong>📱 Citizen Application Stage (Initial Review):</strong>
                          <div style={{ marginTop: '3px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                            Application for <strong>{targetCase.applicant || targetCase.patient}</strong> is undergoing verification prior to hospital empanelment.
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="form-label">Select New Case Status: *</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="SUBMITTED">Application Received / Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="DOCS_VERIFIED">Documents Verified</option>
                      <option value="COORDINATED">Hospital & Sevak Assigned</option>
                      <option value="APPROVED">Approved</option>
                      <option value="TREATMENT_STARTED">Treatment Started</option>
                      <option value="DOCS_REQUIRED">Docs Required / On Hold</option>
                      <option value="CLOSURE_REQUESTED">Closure Requested (By Sevak)</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CLOSED">Closed / Discharged</option>
                    </select>

                    <div className="admin-modal-actions" style={{ marginTop: '18px' }}>
                      <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                      <button
                        className="btn-primary"
                        onClick={async () => {
                          const targetId = targetCase?.id || targetCase?.uuid || targetCase?.caseId || targetCase?.applicationNumber;
                          await updateCaseStatus(targetId, newStatus);
                          closeModal();
                        }}
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Add Hospital Modal */}
              {activeModal.type === 'add-hospital' && (
                <div className="hosp-modal-content">
                  {/* Row 1: Hospital Name & Type */}
                  <div className="form-row">
                    <div className="form-col">
                      <label className="form-label">Hospital Name *</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Deenanath Mangeshkar Hospital"
                        value={hospForm.name}
                        onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-col">
                      <label className="form-label">Hospital Type *</label>
                      <select
                        className="form-select"
                        value={hospForm.type}
                        onChange={(e) => setHospForm({ ...hospForm, type: e.target.value })}
                      >
                        <option value="Government">Government (Govt)</option>
                        <option value="Non-Government">Non-Government / Private (Non-Govt)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: District & Taluka */}
                  <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-col" style={{ flex: 1 }}>
                      <label className="form-label">District *</label>
                      <SearchableLocationInput
                        placeholder="e.g. Pune..."
                        options={locationDirectoryService.getDistricts()}
                        value={hospForm.district || ''}
                        onChange={(val) => setHospForm((prev) => ({ ...prev, district: val, areaTaluka: '', pincode: '' }))}
                        onSelect={(val) => setHospForm((prev) => ({ ...prev, district: val, areaTaluka: '', pincode: '' }))}
                        className="form-input"
                      />
                    </div>
                    <div className="form-col" style={{ flex: 1 }}>
                      <label className="form-label">Taluka / Sub-district *</label>
                      <SearchableLocationInput
                        placeholder={!hospForm.district ? 'Select District first' : 'e.g. Haveli...'}
                        options={hospForm.district ? locationDirectoryService.getTalukas(hospForm.district) : []}
                        value={hospForm.areaTaluka || ''}
                        onChange={(val) => setHospForm((prev) => ({ ...prev, areaTaluka: val, pincode: '' }))}
                        onSelect={(val) => setHospForm((prev) => ({ ...prev, areaTaluka: val, pincode: '' }))}
                        disabled={!hospForm.district}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Row 3: Full Width Street Address */}
                  <div className="form-col-full">
                    <label className="form-label">Full Street Address (Plot No., Road, Area) *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Plot 42, Senapati Bapat Road, Erandwane"
                      value={hospForm.address}
                      onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                    />
                  </div>

                  {/* Row 4: City & Pincode */}
                  <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-col" style={{ flex: 1 }}>
                      <label className="form-label">City / Location *</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Pune"
                        value={hospForm.city || ''}
                        onChange={(e) => setHospForm({ ...hospForm, city: e.target.value, location: e.target.value })}
                      />
                    </div>
                    <div className="form-col" style={{ flex: 1 }}>
                      <label className="form-label">Pincode *</label>
                      <input
                        className="form-input"
                        placeholder={!hospForm.areaTaluka ? 'Select Taluka first' : '6-digit PIN (e.g. 411004)'}
                        value={hospForm.pincode}
                        onChange={(e) => setHospForm({ ...hospForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        disabled={!hospForm.areaTaluka}
                        maxLength={6}
                      />
                    </div>
                  </div>

                  {/* Row 4: Schemes & Nearest Landmark */}
                  <div className="form-row">
                    <div className="form-col">
                      <label className="form-label">Empanelled Schemes *</label>
                      <select
                        className="form-select"
                        value={hospForm.scheme}
                        onChange={(e) => setHospForm({ ...hospForm, scheme: e.target.value })}
                      >
                        <option value="PM-JAY, MJPJAY">PM-JAY & MJPJAY (All Core Schemes)</option>
                        {schemes.map(s => (
                          <option key={s.id} value={s.code}>{s.code} — {s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-col">
                      <label className="form-label">Nearest Landmark / Station</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Near Swargate Bus Stand (500m)"
                        value={hospForm.nearestLandmark}
                        onChange={(e) => setHospForm({ ...hospForm, nearestLandmark: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 5: Full Width Designated ArogyaSevak(s) */}
                  <div className="form-col-full">
                    <label className="form-label">Designated ArogyaSevak(s) (Optional - Select Multiple)</label>
                    <div className="multi-sevak-picker">
                      {((arogyaSevaks && arogyaSevaks.length > 0)
                        ? arogyaSevaks.map((s) => s.name || s.full_name).filter(Boolean)
                        : ['Suresh Jadhav', 'Meera Patil', 'Anand Shinde', 'Pooja Nimkar']
                      ).map((sevakName) => {
                        const isSelected = hospForm.selectedSevaks.includes(sevakName);

                        const toggleSevak = () => {
                          let updated;
                          if (isSelected) {
                            updated = hospForm.selectedSevaks.filter(s => s !== sevakName);
                          } else {
                            updated = [...hospForm.selectedSevaks, sevakName];
                          }
                          setHospForm({ ...hospForm, selectedSevaks: updated });
                        };

                        return (
                          <label key={sevakName} className={`sevak-checkbox-pill ${isSelected ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={toggleSevak}
                              style={{ display: 'none' }}
                            />
                            <span className="chk-mark">{isSelected ? '✓' : '+'}</span>
                            <span>{sevakName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 6: Contact Phone */}
                  <div className="form-col-full">
                    <label className="form-label">Contact Phone</label>
                    <input
                      className="form-input"
                      placeholder="020-xxxxxxxx"
                      value={hospForm.contact}
                      onChange={(e) => setHospForm({ ...hospForm, contact: e.target.value })}
                    />
                  </div>

                  {/* Row 7: Doctors Management */}
                  <div className="form-col-full" style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Stethoscope size={15} color="#2563eb" />
                        <span>Empanelled Doctors ({hospForm.doctors?.length || 0})</span>
                      </label>
                      <button
                        type="button"
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => setShowHospDocForm(!showHospDocForm)}
                      >
                        {showHospDocForm ? 'Cancel' : '+ Add Doctor'}
                      </button>
                    </div>

                    {/* Added Doctors List */}
                    {hospForm.doctors && hospForm.doctors.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {hospForm.doctors.map((doc, dIdx) => (
                          <div
                            key={dIdx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.name} <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.75rem' }}>({doc.qualification})</span></div>
                              <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '2px' }}>
                                <span style={{ color: '#0284c7', fontWeight: 600 }}>{doc.specialities}</span> • Ph: {doc.number}{doc.altNumber ? ` / Alt: ${doc.altNumber}` : ''}
                              </div>
                              {doc.address && <div style={{ color: '#64748b', fontSize: '0.725rem' }}>📍 {doc.address}</div>}
                            </div>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              onClick={() => setHospForm(prev => ({ ...prev, doctors: prev.doctors.filter((_, i) => i !== dIdx) }))}
                              title="Remove Doctor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Add Doctor Form */}
                    {showHospDocForm && (
                      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0369a1' }}>New Doctor Details</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="form-input"
                            placeholder="Doctor Name (e.g. Dr. Rajesh Kulkarni) *"
                            value={hospDocInput.name}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, name: e.target.value })}
                            style={{ flex: 1 }}
                          />
                          <input
                            className="form-input"
                            placeholder="Qualification (e.g. MBBS, MD) *"
                            value={hospDocInput.qualification}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, qualification: e.target.value })}
                            style={{ flex: 1 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="form-input"
                            placeholder="Primary Number (e.g. 9822011223) *"
                            value={hospDocInput.number}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, number: e.target.value })}
                            style={{ flex: 1 }}
                          />
                          <input
                            className="form-input"
                            placeholder="Alternative Number (e.g. 020-25678900)"
                            value={hospDocInput.altNumber}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, altNumber: e.target.value })}
                            style={{ flex: 1 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="form-input"
                            placeholder="Specialities (e.g. Cardiology, Critical Care) *"
                            value={hospDocInput.specialities}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, specialities: e.target.value })}
                            style={{ flex: 1 }}
                          />
                          <input
                            className="form-input"
                            placeholder="Address / OPD Chamber *"
                            value={hospDocInput.address}
                            onChange={(e) => setHospDocInput({ ...hospDocInput, address: e.target.value })}
                            style={{ flex: 1 }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            onClick={() => setShowHospDocForm(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                            disabled={!hospDocInput.name.trim() || !hospDocInput.number.trim() || !hospDocInput.specialities.trim() || !hospDocInput.qualification.trim() || !hospDocInput.address.trim()}
                            onClick={() => {
                              if (!hospDocInput.name.trim() || !hospDocInput.number.trim()) return;
                              setHospForm(prev => ({
                                ...prev,
                                doctors: [...(prev.doctors || []), { ...hospDocInput }]
                              }));
                              setHospDocInput({
                                name: '',
                                number: '',
                                altNumber: '',
                                specialities: 'General Medicine',
                                qualification: 'MBBS',
                                address: ''
                              });
                              setShowHospDocForm(false);
                            }}
                          >
                            + Add to Hospital
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="admin-modal-actions">
                    <button className="btn-secondary" onClick={closeModal} disabled={isHospSubmitting}>Cancel</button>
                    <button
                      className="btn-emerald"
                      disabled={
                        isHospSubmitting ||
                        !hospForm.name.trim() ||
                        !locationDirectoryService.isValidDistrict(hospForm.district) ||
                        !locationDirectoryService.isValidTaluka(hospForm.district, hospForm.areaTaluka) ||
                        !/^[1-9][0-9]{5}$/.test((hospForm.pincode || '').trim())
                      }
                      onClick={async () => {
                        if (isHospSubmitting) return;
                        setIsHospSubmitting(true);
                        try {
                          const sevakString = hospForm.selectedSevaks.length > 0
                            ? hospForm.selectedSevaks.join(', ')
                            : 'Not assigned';
                          await addHospital({
                            ...hospForm,
                            sevak: sevakString
                          });
                          closeModal();
                        } finally {
                          setIsHospSubmitting(false);
                        }
                      }}
                    >
                      {isHospSubmitting ? 'Empanelling...' : '+ Empanel Hospital'}
                    </button>
                  </div>
                </div>
              )}

              {/* View Document Modal */}
              {activeModal.type === 'view-doc' && (() => {
                const docObj = activeModal.payload?.doc || activeModal.payload || {};
                const rawName = String(docObj.name || docObj.file_name || docObj.fileName || docObj.title || activeModal.payload?.name || activeModal.payload?.title || 'Document Record');
                const docFile = String(docObj.file || docObj.file_name || docObj.fileName || activeModal.payload?.file || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
                const rawFileUrl = docObj.file_url || docObj.fileUrl || activeModal.payload?.file_url || activeModal.payload?.fileUrl || docObj.url || '';
                const fileUrl = resolveDocFileUrl(rawFileUrl, docObj.s3_key || docObj.s3Key || activeModal.payload?.s3_key || activeModal.payload?.s3Key);
                const docCategory = docObj.category || 'Identity & Verification';
                const docSize = docObj.size || docObj.file_size || '1.2 MB';
                const caseId = activeModal.payload?.caseId || 'AM-2026-00124';
                const patientName = activeModal.payload?.patientName || activeModal.payload?.patient || 'Applicant / Patient';
                const isDocVerified = Boolean(
                  docObj.verified ||
                  activeModal.payload?.verified ||
                  docObj.document_status === 'VERIFIED' ||
                  docObj.status === 'VERIFIED'
                );

                // Format friendly display title if raw name is an auto-generated file hash
                let displayTitle = rawName;
                if (rawName.startsWith('rn_image_picker_') || rawName.startsWith('doc_record_') || rawName.length > 32) {
                  const cat = String(docCategory || '').toLowerCase();
                  if (cat.includes('medical') || cat.includes('doctor') || cat.includes('referral') || cat.includes('prescription')) {
                    displayTitle = 'Doctor Medical Referral & Prescription Slip';
                  } else if (cat.includes('identity') || cat.includes('aadhaar') || cat.includes('id')) {
                    displayTitle = 'Citizen Identity Document (Aadhaar / ID Proof)';
                  } else if (cat.includes('income') || cat.includes('ration') || cat.includes('financial')) {
                    displayTitle = 'Income & Ration Card Eligibility Proof';
                  } else if (cat.includes('hospital') || cat.includes('discharge') || cat.includes('bill')) {
                    displayTitle = 'Hospital Record / Clinical Pre-Auth';
                  } else {
                    displayTitle = 'Applicant Uploaded Document';
                  }
                }

                const docName = displayTitle;

                const isPdfFile = Boolean(
                  (fileUrl && (/\.pdf($|\?)/i.test(fileUrl) || fileUrl.startsWith('data:application/pdf'))) ||
                  /\.pdf($|\?)/i.test(docFile) ||
                  /\.pdf($|\?)/i.test(rawName) ||
                  docObj.mimeType === 'application/pdf' ||
                  docObj.mime_type === 'application/pdf' ||
                  String(docCategory || '').toLowerCase().includes('pdf') ||
                  String(docCategory || '').toLowerCase().includes('clinical') ||
                  String(docCategory || '').toLowerCase().includes('discharge')
                );

                const isImageFile = Boolean(
                  (fileUrl && !isPdfFile) ||
                  /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl) ||
                  /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(docFile) ||
                  /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(rawName) ||
                  rawName.startsWith('rn_image_picker_')
                );


                return (
                  <div className="view-doc-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Header info badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        gap: '12px',
                        flexWrap: 'nowrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            border: '1px solid #dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <FileText size={20} color="#0284c7" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div
                            style={{
                              fontSize: '0.925rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={displayTitle}
                          >
                            {displayTitle}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              minWidth: 0,
                              overflow: 'hidden'
                            }}
                          >
                            <span
                              style={{
                                background: '#e2e8f0',
                                color: '#334155',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                flexShrink: 0
                              }}
                            >
                              {docCategory}
                            </span>
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '260px'
                              }}
                              title={docFile}
                            >
                              {docFile}
                            </span>
                            <span style={{ flexShrink: 0 }}>· {docSize}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: isDocVerified ? '#dcfce7' : '#fff7ed',
                            color: isDocVerified ? '#166534' : '#c2410c',
                            border: `1px solid ${isDocVerified ? '#86efac' : '#fed7aa'}`,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isDocVerified ? '✓ Verified Official' : '⏳ Pending Verification'}
                        </span>

                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              color: '#0284c7',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ExternalLink size={12} /> Open File ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Document Preview Box */}
                    <div className="doc-preview-box" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', maxHeight: '520px', overflowY: 'auto' }}>
                      <DocPreviewViewer
                        fileUrl={fileUrl}
                        isPdfFile={isPdfFile}
                        isImageFile={isImageFile}
                        docName={docName}
                        patientName={patientName}
                        caseId={caseId}
                        docFile={docFile}
                        docSize={docSize}
                        isDocVerified={isDocVerified}
                      />
                    </div>

                    {/* Modal Actions */}
                    <div className="admin-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <button className="btn-secondary" onClick={closeModal} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                        Close Preview
                      </button>

                      {(() => {
                        const targetCaseId = activeModal.payload?.caseId;
                        const targetCaseObj = cases?.find(c => c.id === targetCaseId);
                        const isCaseRejectedState = targetCaseObj?.status === 'Rejected' || targetCaseObj?.status === 'Closed (Expired)' || targetCaseObj?.status === 'Closed';

                        if (isCaseRejectedState) {
                          return (
                            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '700', padding: '7px 12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fee2e2', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔒 Case is Rejected (Read Only)
                            </span>
                          );
                        }

                        if (activeModal.payload?.isClaimedByOther) {
                          return (
                            <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', padding: '7px 12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔒 Claimed by Reviewer (Read Only)
                            </span>
                          );
                        }

                        if (!isDocVerified) {
                          return (
                            <button
                              className="btn-primary"
                              style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', boxShadow: '0 2px 4px rgba(22, 101, 52, 0.2)' }}
                              onClick={() => {
                                const caseId = activeModal.payload?.caseId;
                                const docObj = activeModal.payload?.doc || activeModal.payload;
                                if (typeof activeModal.payload?.onVerify === 'function') {
                                  activeModal.payload.onVerify(docObj);
                                } else {
                                  const docTarget =
                                    docObj?.id ||
                                    docObj?.docId ||
                                    docObj?.file_url ||
                                    docObj?.file_name ||
                                    docObj?.name ||
                                    activeModal.payload?.id ||
                                    activeModal.payload?.name;
                                  if (caseId && docTarget) {
                                    verifyDocument(caseId, docTarget);
                                  }
                                }
                                closeModal();
                              }}
                            >
                              <Check size={16} />
                              Verify Document ✓
                            </button>
                          );
                        }

                        return (
                          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '800', background: '#dcfce7', padding: '8px 14px', borderRadius: '6px', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCheck size={16} /> Verified Official Document
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Edit ArogyaSevak Modal */}
              {activeModal.type === 'edit-sevak' && (
                <EditSevakModalContent
                  payload={activeModal.payload}
                  closeModal={closeModal}
                  updateArogyaSevak={updateArogyaSevak}
                  hospitals={hospitals}
                />
              )}

              {/* Add ArogyaSevak Modal */}
              {activeModal.type === 'add-sevak' && (
                <AddSevakModalContent
                  closeModal={closeModal}
                  addArogyaSevak={addArogyaSevak}
                  hospitals={hospitals}
                />
              )}

              {/* Delete ArogyaSevak Confirmation Modal */}
              {activeModal.type === 'delete-sevak' && (
                <div className="delete-modal-content" style={{ padding: '8px' }}>
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <AlertCircle size={22} style={{ color: '#dc2626', marginBottom: '6px' }} />
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: 700, fontSize: '0.925rem' }}>
                      Are you sure you want to delete ArogyaSevak "{activeModal.payload?.name}"?
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px', display: 'inline-block' }}>
                      This action will remove them from assigned hospital patient lists.
                    </span>
                  </div>

                  <div className="admin-modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        deleteArogyaSevak(activeModal.payload?.id);
                        closeModal();
                      }}
                    >
                      <Trash2 size={15} />
                      Delete Sevak
                    </button>
                  </div>
                </div>
              )}

              {/* Add System Admin Modal */}
              {activeModal.type === 'add-admin' && (
                <AddAdminModalContent
                  closeModal={closeModal}
                  addAdmin={addAdmin}
                />
              )}

              {/* Edit System Admin Modal */}
              {activeModal.type === 'edit-admin' && (
                <div className="hosp-modal-content">
                  <div className="form-col-full">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      defaultValue={activeModal.payload?.name || ''}
                      id="edit-admin-name"
                      placeholder="Full Name"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        className="form-input"
                        defaultValue={activeModal.payload?.email || ''}
                        id="edit-admin-email"
                        placeholder="email@arogyamitra.gov.in"
                      />
                    </div>
                    <div className="form-col">
                      <label className="form-label">Mobile Number *</label>
                      <input
                        className="form-input"
                        defaultValue={activeModal.payload?.phone || ''}
                        id="edit-admin-phone"
                        placeholder="Mobile Number"
                      />
                    </div>
                  </div>

                  <div className="form-col-full">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      defaultValue={activeModal.payload?.status || 'Active'}
                      id="edit-admin-status"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="admin-modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button
                      className="btn-emerald"
                      onClick={() => {
                        const name = document.getElementById('edit-admin-name')?.value;
                        const email = document.getElementById('edit-admin-email')?.value;
                        const phone = document.getElementById('edit-admin-phone')?.value;
                        const status = document.getElementById('edit-admin-status')?.value;
                        updateAdmin(activeModal.payload?.id, { name, email, phone, status });
                        closeModal();
                      }}
                    >
                      Save Admin Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Delete System Admin Confirmation Modal */}
              {activeModal.type === 'delete-admin' && (
                <div className="delete-modal-content" style={{ padding: '8px' }}>
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <AlertCircle size={22} style={{ color: '#dc2626', marginBottom: '6px' }} />
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: 700, fontSize: '0.925rem' }}>
                      Are you sure you want to delete Admin "{activeModal.payload?.name}"?
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px', display: 'inline-block' }}>
                      This action will revoke their administrative credentials and access to the portal.
                    </span>
                  </div>

                  <div className="admin-modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        deleteAdmin(activeModal.payload?.id);
                        closeModal();
                      }}
                    >
                      <Trash2 size={15} />
                      Delete Admin
                    </button>
                  </div>
                </div>
              )}

              {/* Add Follow-Up Modal */}
              {activeModal.type === 'add-followup' && (
                <AddFollowUpModalContent
                  payload={activeModal.payload}
                  closeModal={closeModal}
                  addFollowUp={addFollowUp}
                  cases={cases}
                />
              )}

              {/* Reject Application Modal with Scheme Ineligibility options */}
              {activeModal.type === 'reject-case' && (
                <RejectCaseModalContent
                  payload={activeModal.payload}
                  closeModal={closeModal}
                  rejectCase={rejectCase}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminModals;
