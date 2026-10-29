import React, { useRef, useState, useEffect } from 'react';
import {
  Award,
  Camera,
  RotateCcw,
  Loader2,
  ExternalLink,
  Smartphone,
  Globe,
  CheckCircle2,
  Sparkles,
  Check,
  Eye,
  Undo2,
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { autoTranslateToMarathiAndHindi } from '../../../services/translationService';
import logoImg from '@/assets/images/arogya_mitra_logo.png';
import './HonRavindraChavan.css';

export const HonRavindraChavan = () => {
  const {
    mlaPhoto,
    mlaProfile,
    updateMlaPhoto,
    updateMlaProfile,
  } = useAdmin();

  const fileInputRef = useRef(null);
  const translationTimers = useRef({});
  const [translatingFields, setTranslatingFields] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [previewLang, setPreviewLang] = useState('mr'); // 'mr' | 'en' | 'hi'

  // Local pending photo state for instant preview before confirmation
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form State for editing MLA leadership details with English, Marathi, Hindi
  const [formData, setFormData] = useState({
    name: 'Hon. Ravindra Dattatray Chavan',
    nameMr: 'मा. ना. श्री. रवींद्र चव्हाण',
    nameHi: 'मा. ना. श्री. रवींद्र चव्हाण',
    designation: 'Member of Legislative Assembly (MLA)',
    constituency: 'Dombivli Assembly, Thane District',
    partyTitle: 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
    partyTitleMr: 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
    partyTitleHi: 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
    tagline: 'Dedicated to your health, we are committed.',
    taglineMr: 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
    taglineHi: 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
    initiativeTitle: 'Special Initiative',
    initiativeTitleMr: 'विशेष पुढाकार',
    initiativeTitleHi: 'विशेष पहल',
    patronTitle: 'ArogyaMitra Welfare Patron',
    assemblyTerms: '14th Maharashtra Legislative Assembly',
    publicPortfolio: 'Public Welfare & Health Infrastructure',
    visionQuote: 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care.',
    officeAddress: 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
    officeContact: '0251-2800000 / +91 98220 00000',
  });

  // Populate form when mlaProfile loads
  useEffect(() => {
    if (mlaProfile) {
      setFormData({
        name: mlaProfile.name || 'Hon. Ravindra Dattatray Chavan',
        nameMr: mlaProfile.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण',
        nameHi: mlaProfile.nameHi || mlaProfile.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण',
        designation: mlaProfile.designation || 'Member of Legislative Assembly (MLA)',
        constituency: mlaProfile.constituency || 'Dombivli Assembly, Thane District',
        partyTitle: mlaProfile.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
        partyTitleMr: mlaProfile.partyTitleMr || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
        partyTitleHi: mlaProfile.partyTitleHi || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
        tagline: mlaProfile.tagline || 'Dedicated to your health, we are committed.',
        taglineMr: mlaProfile.taglineMr || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
        taglineHi: mlaProfile.taglineHi || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
        initiativeTitle: mlaProfile.initiativeTitle || 'Special Initiative',
        initiativeTitleMr: mlaProfile.initiativeTitleMr || 'विशेष पुढाकार',
        initiativeTitleHi: mlaProfile.initiativeTitleHi || 'विशेष पहल',
        patronTitle: mlaProfile.patronTitle || 'ArogyaMitra Welfare Patron',
        assemblyTerms: mlaProfile.assemblyTerms || '14th Maharashtra Legislative Assembly',
        publicPortfolio: mlaProfile.publicPortfolio || 'Public Welfare & Health Infrastructure',
        visionQuote: mlaProfile.visionQuote || 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care.',
        officeAddress: mlaProfile.officeAddress || 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
        officeContact: mlaProfile.officeContact || '0251-2800000 / +91 98220 00000',
      });
    }
  }, [mlaProfile]);

  // Handle local photo selection for preview without immediate server commit
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPendingPhotoFile(file);
    setPendingPhotoPreview(previewUrl);
    setHasUnsavedChanges(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle reset photo to default with preview
  const handleResetPhotoPreview = () => {
    setPendingPhotoFile('RESET');
    setPendingPhotoPreview('/ravindra_chavan.png');
    setHasUnsavedChanges(true);
  };

  // Discard local preview changes
  const handleDiscardChanges = () => {
    if (pendingPhotoPreview && pendingPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(pendingPhotoPreview);
    }
    setPendingPhotoFile(null);
    setPendingPhotoPreview(null);
    if (mlaProfile) {
      setFormData({
        name: mlaProfile.name || 'Hon. Ravindra Dattatray Chavan',
        nameMr: mlaProfile.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण',
        nameHi: mlaProfile.nameHi || mlaProfile.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण',
        designation: mlaProfile.designation || 'Member of Legislative Assembly (MLA)',
        constituency: mlaProfile.constituency || 'Dombivli Assembly, Thane District',
        partyTitle: mlaProfile.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
        partyTitleMr: mlaProfile.partyTitleMr || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
        partyTitleHi: mlaProfile.partyTitleHi || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
        tagline: mlaProfile.tagline || 'Dedicated to your health, we are committed.',
        taglineMr: mlaProfile.taglineMr || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
        taglineHi: mlaProfile.taglineHi || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
        initiativeTitle: mlaProfile.initiativeTitle || 'Special Initiative',
        initiativeTitleMr: mlaProfile.initiativeTitleMr || 'विशेष पुढाकार',
        initiativeTitleHi: mlaProfile.initiativeTitleHi || 'विशेष पहल',
        patronTitle: mlaProfile.patronTitle || 'ArogyaMitra Welfare Patron',
        assemblyTerms: mlaProfile.assemblyTerms || '14th Maharashtra Legislative Assembly',
        publicPortfolio: mlaProfile.publicPortfolio || 'Public Welfare & Health Infrastructure',
        visionQuote: mlaProfile.visionQuote || 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care.',
        officeAddress: mlaProfile.officeAddress || 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
        officeContact: mlaProfile.officeContact || '0251-2800000 / +91 98220 00000',
      });
    }
    setHasUnsavedChanges(false);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Real-time auto-conversion from English to Marathi and Hindi on change
  const handleEnglishInputChange = (englishFieldKey, value) => {
    // 1. Immediately update the English form field
    setFormData((prev) => ({ ...prev, [englishFieldKey]: value }));
    setHasUnsavedChanges(true);

    // 2. Clear previous debounce timer for this field
    if (translationTimers.current[englishFieldKey]) {
      clearTimeout(translationTimers.current[englishFieldKey]);
    }

    if (!value || !value.trim()) {
      return;
    }

    // 3. Mark this field as actively translating
    setTranslatingFields((prev) => ({ ...prev, [englishFieldKey]: true }));

    // 4. Debounce (350ms) and execute auto translation to Marathi and Hindi
    translationTimers.current[englishFieldKey] = setTimeout(async () => {
      try {
        const { mr, hi } = await autoTranslateToMarathiAndHindi(value);
        setFormData((prev) => {
          const next = { ...prev };
          if (englishFieldKey === 'name') {
            if (mr) next.nameMr = mr;
            if (hi) next.nameHi = hi;
          } else if (englishFieldKey === 'partyTitle') {
            if (mr) next.partyTitleMr = mr;
            if (hi) next.partyTitleHi = hi;
          } else if (englishFieldKey === 'tagline') {
            if (mr) next.taglineMr = mr;
            if (hi) next.taglineHi = hi;
          } else if (englishFieldKey === 'initiativeTitle') {
            if (mr) next.initiativeTitleMr = mr;
            if (hi) next.initiativeTitleHi = hi;
          }
          return next;
        });
      } catch (err) {
        console.warn('[HonRavindraChavan] Auto-translate error:', err);
      } finally {
        setTranslatingFields((prev) => ({ ...prev, [englishFieldKey]: false }));
      }
    }, 350);
  };

  // Immediate manual trigger for auto-conversion
  const triggerTranslation = async (englishFieldKey) => {
    const value = formData[englishFieldKey];
    if (!value || !value.trim()) return;

    setTranslatingFields((prev) => ({ ...prev, [englishFieldKey]: true }));
    try {
      const { mr, hi } = await autoTranslateToMarathiAndHindi(value);
      setFormData((prev) => {
        const next = { ...prev };
        if (englishFieldKey === 'name') {
          if (mr) next.nameMr = mr;
          if (hi) next.nameHi = hi;
        } else if (englishFieldKey === 'partyTitle') {
          if (mr) next.partyTitleMr = mr;
          if (hi) next.partyTitleHi = hi;
        } else if (englishFieldKey === 'tagline') {
          if (mr) next.taglineMr = mr;
          if (hi) next.taglineHi = hi;
        } else if (englishFieldKey === 'initiativeTitle') {
          if (mr) next.initiativeTitleMr = mr;
          if (hi) next.initiativeTitleHi = hi;
        }
        return next;
      });
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn('[HonRavindraChavan] Manual translate error:', err);
    } finally {
      setTranslatingFields((prev) => ({ ...prev, [englishFieldKey]: false }));
    }
  };

  // Confirm and update all pending photo & text changes in one click
  const handleConfirmAndUpdate = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingProfile(true);

      // 1. If a new photo is selected or reset, commit photo first
      if (pendingPhotoFile === 'RESET') {
        await updateMlaPhoto('/ravindra_chavan.png');
      } else if (pendingPhotoFile instanceof File) {
        await updateMlaPhoto(pendingPhotoFile);
      }

      // 2. Commit all updated multilingual text details
      if (updateMlaProfile) {
        await updateMlaProfile(formData);
      }

      // 3. Clear pending photo state
      if (pendingPhotoPreview && pendingPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(pendingPhotoPreview);
      }
      setPendingPhotoFile(null);
      setPendingPhotoPreview(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to confirm and update leadership profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Active photo source (pending preview takes precedence so user sees changes live!)
  const currentPhotoSrc = pendingPhotoPreview || mlaPhoto || mlaProfile?.photoUrl || '/ravindra_chavan.png';
  const isCustomPhoto = Boolean(
    (pendingPhotoPreview && pendingPhotoPreview !== '/ravindra_chavan.png') ||
    (!pendingPhotoPreview && mlaPhoto && mlaPhoto !== '/ravindra_chavan.png' && mlaPhoto !== '/ravindra_chavan.svg')
  );

  // Localized preview text resolution helper (reads directly from formData for real-time live preview!)
  const getPreviewLeaderName = () => {
    if (previewLang === 'mr') return formData.nameMr || mlaProfile?.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण';
    if (previewLang === 'hi') return formData.nameHi || formData.nameMr || mlaProfile?.nameHi || 'माननीय श्री रवींद्र चव्हाण';
    return formData.name || mlaProfile?.name || 'Hon. Ravindra Dattatray Chavan';
  };

  const getPreviewPartyTitle = () => {
    if (previewLang === 'mr') return formData.partyTitleMr || mlaProfile?.partyTitleMr || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा';
    if (previewLang === 'hi') return formData.partyTitleHi || formData.partyTitleMr || mlaProfile?.partyTitleHi || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा';
    return formData.partyTitle || mlaProfile?.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency';
  };

  const getPreviewTagline = () => {
    if (previewLang === 'mr') return formData.taglineMr || mlaProfile?.taglineMr || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.';
    if (previewLang === 'hi') return formData.taglineHi || formData.taglineMr || mlaProfile?.taglineHi || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।';
    return formData.tagline || mlaProfile?.tagline || 'Dedicated to your health, we are committed.';
  };

  const getPreviewInitiative = () => {
    if (previewLang === 'mr') return formData.initiativeTitleMr || mlaProfile?.initiativeTitleMr || 'विशेष पुढाकार';
    if (previewLang === 'hi') return formData.initiativeTitleHi || formData.initiativeTitleMr || mlaProfile?.initiativeTitleHi || 'विशेष पहल';
    return formData.initiativeTitle || mlaProfile?.initiativeTitle || 'Special Initiative';
  };

  const getPreviewStartBtn = () => {
    if (previewLang === 'mr') return 'सुरू करा';
    if (previewLang === 'hi') return 'शुरू करें';
    return 'Get Started';
  };

  const getPreviewFooter = () => {
    const n = getPreviewLeaderName();
    if (previewLang === 'mr') return `सहकार्य: ${n}`;
    if (previewLang === 'hi') return `सहयोग: ${n}`;
    return `Supported by: ${n}`;
  };

  return (
    <div className="mla-profile-container">
      {/* Hidden File Input for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* Official Top Banner */}
      <div className="mla-header-banner">
        <div className="mla-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Award size={18} color="#fef08a" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fef08a', letterSpacing: '0.5px' }}>
              OFFICIAL LEADERSHIP & APP / WEB CONTENT MANAGEMENT
            </span>
          </div>
          <h2>{formData.name || 'Hon. Ravindra Dattatray Chavan'}</h2>
          <p>{formData.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency'}</p>
        </div>

        <div className="mla-badges-wrap">
          {hasUnsavedChanges && (
            <button
              type="button"
              className="mla-header-discard-btn"
              onClick={handleDiscardChanges}
              disabled={isSavingProfile}
              title="Discard unsaved changes and revert to saved profile"
            >
              <Undo2 size={15} />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            className={`mla-header-save-btn ${hasUnsavedChanges ? 'highlight-pulse' : ''}`}
            onClick={handleConfirmAndUpdate}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
            <span>{isSavingProfile ? 'Updating...' : 'Confirm & Update'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Notification Banner */}
      {hasUnsavedChanges && (
        <div className="preview-active-alert-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={16} color="#0d9488" />
            <span className="alert-bar-text">
              <strong>Live Preview Active:</strong> All photo & text changes are displayed live on the right. Click <strong>Confirm & Update</strong> to finalize and publish.
            </span>
          </div>
          <button
            type="button"
            className="btn-alert-confirm"
            onClick={handleConfirmAndUpdate}
            disabled={isSavingProfile}
          >
            <Check size={14} /> Confirm & Update
          </button>
        </div>
      )}

      {/* Two-Column Responsive Workspace: Left Content Editor + Right Live Previews */}
      <div className="mla-workspace-grid">
        {/* Left Column: Photo Card & Multilingual Form */}
        <div className="mla-editor-column">
          {/* 1. Patron Photo & Info Bar */}
          <div className="mla-photo-identity-card">
            <div className="mla-photo-thumb-box">
              <img
                src={currentPhotoSrc}
                alt={formData.name || 'Hon. Ravindra Chavan'}
                className="mla-photo-thumb"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/ravindra_chavan.svg';
                }}
              />
            </div>

            <div className="mla-photo-identity-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span className="mla-photo-badge">Leadership Display</span>
                {pendingPhotoFile && (
                  <span className="mla-photo-pending-badge">
                    <Eye size={10} /> Photo Previewing
                  </span>
                )}
              </div>
              <h3 className="mla-photo-name">{formData.name || 'Hon. Ravindra Dattatray Chavan'}</h3>
              <p className="mla-photo-title">{formData.partyTitle || 'State President of BJP Maharashtra'}</p>

              <div className="mla-photo-actions">
                <button
                  type="button"
                  className="btn-change-photo"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSavingProfile}
                >
                  <Camera size={14} />
                  <span>{pendingPhotoFile ? 'Choose Different Photo' : 'Change Photo'}</span>
                </button>
                {isCustomPhoto && (
                  <button
                    type="button"
                    className="btn-reset-photo"
                    onClick={handleResetPhotoPreview}
                    disabled={isSavingProfile}
                    title="Reset to default photo"
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Embedded Multilingual Content Management Form */}
          <form onSubmit={handleConfirmAndUpdate} className="mla-inline-form">
            {/* SECTION 1: Leader / Dignitary Name */}
            <div className="mla-multilang-section-card">
              <div className="section-card-header">
                <span className="section-card-num">1</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="section-card-title">Leader / Dignitary Name (नेत्यांचे नाव)</h4>
                    {translatingFields['name'] && (
                      <span className="translating-indicator">
                        <Loader2 size={12} className="spin-icon" /> Auto-converting...
                      </span>
                    )}
                  </div>
                  <p className="section-card-sub">Type in English to auto-convert to Marathi and Hindi below (both fully editable)</p>
                </div>
              </div>

              <div className="multilang-inputs-stack">
                {/* English */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag en">EN · English</span>
                  <div className="input-with-action-container">
                    <input
                      type="text"
                      className="mla-form-input"
                      value={formData.name}
                      onChange={(e) => handleEnglishInputChange('name', e.target.value)}
                      placeholder="e.g. Hon. Ravindra Dattatray Chavan"
                      required
                    />
                    <button
                      type="button"
                      className="btn-translate-quick"
                      onClick={() => triggerTranslation('name')}
                      title="Re-convert English name to Marathi & Hindi"
                    >
                      <Sparkles size={11} /> Auto Convert
                    </button>
                  </div>
                </div>

                {/* Marathi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag mr">MR · मराठी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.nameMr}
                    onChange={(e) => handleInputChange('nameMr', e.target.value)}
                    placeholder="उदा. मा. ना. श्री. रवींद्र चव्हाण"
                    required
                  />
                </div>

                {/* Hindi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag hi">HI · हिंदी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.nameHi}
                    onChange={(e) => handleInputChange('nameHi', e.target.value)}
                    placeholder="उदा. माननीय श्री रवींद्र दत्तात्रेय चव्हाण"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Party Title & Constituency */}
            <div className="mla-multilang-section-card">
              <div className="section-card-header">
                <span className="section-card-num">2</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="section-card-title">Party Title & Constituency (पक्ष पद व मतदारसंघ)</h4>
                    {translatingFields['partyTitle'] && (
                      <span className="translating-indicator">
                        <Loader2 size={12} className="spin-icon" /> Auto-converting...
                      </span>
                    )}
                  </div>
                  <p className="section-card-sub">Displays below photo on both Web & Mobile app landing screens</p>
                </div>
              </div>

              <div className="multilang-inputs-stack">
                {/* English */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag en">EN · English</span>
                  <div className="input-with-action-container">
                    <input
                      type="text"
                      className="mla-form-input"
                      value={formData.partyTitle}
                      onChange={(e) => handleEnglishInputChange('partyTitle', e.target.value)}
                      placeholder="e.g. State President of BJP Maharashtra | Dombivli Assembly Constituency"
                      required
                    />
                    <button
                      type="button"
                      className="btn-translate-quick"
                      onClick={() => triggerTranslation('partyTitle')}
                      title="Re-convert English title to Marathi & Hindi"
                    >
                      <Sparkles size={11} /> Auto Convert
                    </button>
                  </div>
                </div>

                {/* Marathi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag mr">MR · मराठी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.partyTitleMr}
                    onChange={(e) => handleInputChange('partyTitleMr', e.target.value)}
                    placeholder="उदा. प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा"
                    required
                  />
                </div>

                {/* Hindi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag hi">HI · हिंदी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.partyTitleHi}
                    onChange={(e) => handleInputChange('partyTitleHi', e.target.value)}
                    placeholder="उदा. प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Tagline & Commitment */}
            <div className="mla-multilang-section-card">
              <div className="section-card-header">
                <span className="section-card-num">3</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="section-card-title">Health Tagline & Commitment (घोषवाक्य / संदेश)</h4>
                    {translatingFields['tagline'] && (
                      <span className="translating-indicator">
                        <Loader2 size={12} className="spin-icon" /> Auto-converting...
                      </span>
                    )}
                  </div>
                  <p className="section-card-sub">Appears above the Start App button on landing page</p>
                </div>
              </div>

              <div className="multilang-inputs-stack">
                {/* English */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag en">EN · English</span>
                  <div className="input-with-action-container">
                    <input
                      type="text"
                      className="mla-form-input"
                      value={formData.tagline}
                      onChange={(e) => handleEnglishInputChange('tagline', e.target.value)}
                      placeholder="e.g. Dedicated to your health, we are committed."
                    />
                    <button
                      type="button"
                      className="btn-translate-quick"
                      onClick={() => triggerTranslation('tagline')}
                      title="Re-convert English tagline to Marathi & Hindi"
                    >
                      <Sparkles size={11} /> Auto Convert
                    </button>
                  </div>
                </div>

                {/* Marathi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag mr">MR · मराठी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.taglineMr}
                    onChange={(e) => handleInputChange('taglineMr', e.target.value)}
                    placeholder="उदा. आपल्या आरोग्यासाठी, आम्ही वचनबद्ध."
                  />
                </div>

                {/* Hindi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag hi">HI · हिंदी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.taglineHi}
                    onChange={(e) => handleInputChange('taglineHi', e.target.value)}
                    placeholder="उदा. आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Initiative Badge Text */}
            <div className="mla-multilang-section-card">
              <div className="section-card-header">
                <span className="section-card-num">4</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="section-card-title">Initiative Badge Title (विशेष पुढाकार / उपक्रम)</h4>
                    {translatingFields['initiativeTitle'] && (
                      <span className="translating-indicator">
                        <Loader2 size={12} className="spin-icon" /> Auto-converting...
                      </span>
                    )}
                  </div>
                  <p className="section-card-sub">Appears on top pill badge on mobile & web card</p>
                </div>
              </div>

              <div className="multilang-inputs-stack">
                {/* English */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag en">EN · English</span>
                  <div className="input-with-action-container">
                    <input
                      type="text"
                      className="mla-form-input"
                      value={formData.initiativeTitle}
                      onChange={(e) => handleEnglishInputChange('initiativeTitle', e.target.value)}
                      placeholder="e.g. Special Initiative"
                    />
                    <button
                      type="button"
                      className="btn-translate-quick"
                      onClick={() => triggerTranslation('initiativeTitle')}
                      title="Re-convert English badge text to Marathi & Hindi"
                    >
                      <Sparkles size={11} /> Auto Convert
                    </button>
                  </div>
                </div>

                {/* Marathi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag mr">MR · मराठी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.initiativeTitleMr}
                    onChange={(e) => handleInputChange('initiativeTitleMr', e.target.value)}
                    placeholder="उदा. विशेष पुढाकार"
                  />
                </div>

                {/* Hindi */}
                <div className="lang-field-row">
                  <span className="lang-pill-tag hi">HI · हिंदी</span>
                  <input
                    type="text"
                    className="mla-form-input"
                    value={formData.initiativeTitleHi}
                    onChange={(e) => handleInputChange('initiativeTitleHi', e.target.value)}
                    placeholder="उदा. विशेष पहल"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="mla-form-save-footer">
              <div className="save-help-text">
                <CheckCircle2 size={18} color="#059669" />
                <span>
                  {hasUnsavedChanges
                    ? 'Changes are active in the live preview. Click Confirm & Update to finalize across Web & Mobile apps.'
                    : 'Profile and display content are synchronized and up-to-date.'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    className="mla-btn-discard"
                    onClick={handleDiscardChanges}
                    disabled={isSavingProfile}
                  >
                    <Undo2 size={15} /> Discard Changes
                  </button>
                )}

                <button
                  type="submit"
                  className="mla-btn-primary mla-btn-large"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
                  <span>{isSavingProfile ? 'Updating...' : 'Confirm & Update'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Previews (Sticky Pane) */}
        <div className="mla-preview-column">
          {/* Master Preview Toolbar */}
          <div className="master-preview-toolbar">
            <div className="preview-toolbar-left">
              <span className="mla-live-pulse-dot" />
              <span className="preview-toolbar-title">Live Preview (Real-time Reflection)</span>
            </div>
            <div className="preview-lang-toggle-group">
              <button
                type="button"
                className={`preview-lang-btn ${previewLang === 'mr' ? 'active' : ''}`}
                onClick={() => setPreviewLang('mr')}
              >
                मराठी
              </button>
              <button
                type="button"
                className={`preview-lang-btn ${previewLang === 'en' ? 'active' : ''}`}
                onClick={() => setPreviewLang('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`preview-lang-btn ${previewLang === 'hi' ? 'active' : ''}`}
                onClick={() => setPreviewLang('hi')}
              >
                हिंदी
              </button>
            </div>
          </div>

          {/* Dual Previews Container */}
          <div className="previews-dual-container">
            {/* 1. Web Login Page Live Preview Card */}
            <div className="mla-login-preview-card">
              <div className="mla-preview-card-header">
                <div className="mla-preview-header-title-box">
                  <Globe size={15} color="#0A665A" />
                  <span className="mla-preview-title">Web Login Preview</span>
                </div>
                <a
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mla-preview-open-link"
                  title="Open live login page in a new tab"
                >
                  <ExternalLink size={12} />
                  <span>/login</span>
                </a>
              </div>

              {/* Replicated Web Login Showcase Card */}
              <div className="preview-login-showcase">
                <div className="preview-pill-badge">
                  <span className="preview-pill-dot" />
                  <span>{getPreviewInitiative()}</span>
                </div>

                <div className="preview-photo-frame">
                  <img
                    src={currentPhotoSrc}
                    alt={getPreviewLeaderName()}
                    className="preview-photo-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/ravindra_chavan.svg';
                    }}
                  />
                </div>

                <div className="preview-details">
                  <h4 className="preview-leader-name-mr">{getPreviewLeaderName()}</h4>
                  <p className="preview-leader-designation">{getPreviewPartyTitle()}</p>
                </div>

                <div className="preview-quote-box">
                  <p className="preview-quote-text">
                    "{getPreviewTagline()}"
                  </p>
                  <span className="preview-quote-sub">{getPreviewFooter()}</span>
                </div>
              </div>

              <div className="mla-sync-status-badge">
                <CheckCircle2 size={13} color="#166534" />
                <span>Web Login Live Preview ({previewLang.toUpperCase()})</span>
              </div>
            </div>

            {/* 2. Mobile App Live Preview Card */}
            <div className="mla-mobile-preview-card">
              <div className="mla-preview-card-header">
                <div className="mla-preview-header-title-box">
                  <Smartphone size={15} color="#0A665A" />
                  <span className="mla-preview-title">Mobile App Landing Preview</span>
                </div>
              </div>

              {/* Exact Smartphone Mockup Device Frame */}
              <div className="mobile-device-mockup">
                <div className="mobile-screen-body">
                  {/* Phone Status Bar with center punch-hole camera */}
                  <div className="mobile-notch-bar">
                    <div className="mobile-status-left">
                      <span className="mobile-time">11:44</span>
                      <span className="mobile-app-mini-icon">■</span>
                    </div>
                    <div className="mobile-camera-hole" />
                    <div className="mobile-status-icons">
                      <span className="mobile-signal">📶</span>
                      <span className="mobile-wifi">📶</span>
                      <span className="mobile-bat">🔋</span>
                    </div>
                  </div>

                  {/* Top Logo & 3-Language Segmented Bar (Clickable for live test) */}
                  <div className="mobile-top-bar">
                    <img
                      src={logoImg}
                      alt="ArogyaMitra Logo"
                      className="mobile-app-logo"
                    />
                    <div className="mobile-lang-pills">
                      <Globe size={11} color="#64748B" style={{ marginRight: 2 }} />
                      <span
                        className={`mobile-lang-toggle-pill ${previewLang === 'mr' ? 'active' : ''}`}
                        onClick={() => setPreviewLang('mr')}
                      >
                        मराठी
                      </span>
                      <span
                        className={`mobile-lang-toggle-pill ${previewLang === 'en' ? 'active' : ''}`}
                        onClick={() => setPreviewLang('en')}
                      >
                        English
                      </span>
                      <span
                        className={`mobile-lang-toggle-pill ${previewLang === 'hi' ? 'active' : ''}`}
                        onClick={() => setPreviewLang('hi')}
                      >
                        हिंदी
                      </span>
                    </div>
                  </div>

                  {/* Leader Portrait Image */}
                  <div className="mobile-leader-photo-box">
                    <img
                      src={currentPhotoSrc}
                      alt={getPreviewLeaderName()}
                      className="mobile-leader-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/ravindra_chavan.svg';
                      }}
                    />
                  </div>

                  {/* Leader Details Bottom Card */}
                  <div className="mobile-bottom-card">
                    <div className="mobile-preview-badge">
                      <span className="mobile-preview-badge-dot" />
                      <span>{getPreviewInitiative()}</span>
                    </div>

                    <h5 className="mobile-leader-name">{getPreviewLeaderName()}</h5>
                    <p className="mobile-leader-title">{getPreviewPartyTitle()}</p>
                    <p className="mobile-leader-tagline">{getPreviewTagline()}</p>

                    {/* Solid Dark Teal Start Button */}
                    <div className="mobile-start-btn">
                      <span>{getPreviewStartBtn()}</span>
                    </div>

                    <p className="mobile-gov-footer">{getPreviewFooter()}</p>
                  </div>

                  {/* Bottom Home Indicator Line */}
                  <div className="mobile-home-indicator" />
                </div>
              </div>

              <div className="mla-sync-status-badge mobile-sync-badge">
                <CheckCircle2 size={13} color="#0A665A" />
                <span>Mobile App Live Preview ({previewLang.toUpperCase()})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HonRavindraChavan;
