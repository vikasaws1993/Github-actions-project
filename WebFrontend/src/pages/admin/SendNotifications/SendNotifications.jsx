import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Users,
  Radio,
  Clock,
  Search,
  Trash2,
  RotateCcw,
  Sparkles,
  Smartphone,
  HeartHandshake,
  Activity,
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronUp,
  UserCheck,
  FileText
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { applicationService } from '../../../services/applicationService';
import './SendNotifications.css';

// Preset Quick Templates (English & Marathi)
const PRESET_TEMPLATES = [
  {
    id: 'sevak_ward_directive',
    icon: '🩺',
    label: 'वॉर्ड ३ बेड पडताळणी निर्देश',
    target: 'INDIVIDUAL_SEVAK',
    type: 'DUTY_UPDATE',
    priority: 'HIGH',
    title: 'Urgent Directive: Verify Ward No. 3 Bed Availability',
    title_mr: 'तातडीचे निर्देश: वॉर्ड क्र. ३ मधील बेड उपलब्धता तपासा',
    message: 'Please record vacant ICU and Oxygen bed counts for Ward 3 in your daily report before 5:00 PM today.',
    message_mr: 'कृपया वॉर्ड क्र. ३ मधील रिक्त आयसीयू व ऑक्सिजन बेडची माहिती आज संध्याकाळी ५ वाजेपूर्वी दैनिक अहवालात नोंदवा.',
    badge: 'URGENT',
    sender: 'जिल्हा आरोग्य अधिकारी / DHO Office'
  },
  {
    id: 'sevak_mjpjay_broadcast',
    icon: '📜',
    label: 'नवीन MJPJAY मार्गदर्शक तत्त्वे',
    target: 'ALL_SEVAKS',
    type: 'ANNOUNCEMENT',
    priority: 'CRITICAL',
    title: 'Notice to All Sevaks: New MJPJAY Scheme Guidelines',
    title_mr: 'सर्व आरोग्य सेवकांसाठी सूचना: नवीन महात्मा फुले योजना मार्गदर्शक तत्त्वे',
    message: 'As per new government notification, cashless treatment limit has been raised up to ₹5,00,000 for all eligible ration card holders from Oct 1.',
    message_mr: 'शासनाच्या नवीन आदेशानुसार १ ऑक्टोबरपासून सर्व पात्र शिधापत्रिकाधारकांना ५ लाख रुपयांपर्यंत कॅशलेस उपचार मंजूर केले जातील.',
    badge: 'MJPJAY NOTICE',
    sender: 'प्रशासक / Health Mission Desk'
  },
  {
    id: 'health_camp',
    icon: '🏥',
    label: 'Free Health Camp',
    target: 'ALL_CITIZENS',
    type: 'HEALTH_CAMP',
    priority: 'HIGH',
    title: 'Free General & Eye Checkup Camp Notice',
    title_mr: 'मोफत सर्वोपचार व आरोग्य तपासणी शिबीर',
    message: 'Notice to all citizens: A free medical and eye checkup camp is organized this Sunday at the Sub-District Hospital. Free medicines will be provided.',
    message_mr: 'सर्व नागरिकांना कळविण्यात येते की येत्या रविवारी शासकीय उपजिल्हा रुग्णालयात मोफत सर्वोपचार व नेत्र तपासणी शिबिराचे आयोजन केले आहे. मोफत औषधोपचार उपलब्ध राहील.',
    badge: 'HEALTH CAMP'
  },
  {
    id: 'scheme_update',
    icon: '📄',
    label: 'MJPJAY ₹5 Lakh Limit',
    target: 'ALL_CITIZENS',
    type: 'SCHEME_UPDATE',
    priority: 'HIGH',
    title: 'MJPJAY Free Medical Coverage Limit Enhanced to ₹5,00,000',
    title_mr: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना ₹५ लाख मर्यादा वाढ',
    message: 'Government has enhanced the free medical treatment benefit under MJPJAY up to ₹5,00,000 for all eligible ration card holders across empaneled hospitals.',
    message_mr: 'शासनाच्या नवीन निर्णयानुसार महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY) अंतर्गत मोफत उपचार मर्यादा ₹५,००,००० पर्यंत वाढवण्यात आली आहे. सर्व पिवळे व केशरी रेशनकार्डधारक पात्र आहेत.',
    badge: 'SCHEME UPDATE'
  },
  {
    id: 'doc_request',
    icon: '📑',
    label: 'Upload Documents',
    target: 'ALL_CITIZENS',
    type: 'DOC_REQUEST',
    priority: 'CRITICAL',
    title: 'Action Required: Upload Pending Medical Documents',
    title_mr: 'तातडीने प्रलंबित कागदपत्रे ॲपवर सादर करा',
    message: 'Please upload the pending medical documents in your ArogyaMitra mobile app immediately to avoid delay in treatment approval.',
    message_mr: 'आपल्या अर्जाच्या पुढील मंजुरीसाठी आवश्यक वैद्यकीय कागदपत्रे त्वरित आरोग्य मित्र ॲपमध्ये जाऊन अपलोड करा, जेणेकरून उपचार मंजुरी वेळेत मिळेल.',
    badge: 'DOCS REQUIRED'
  },
  {
    id: 'sevak_rounds',
    icon: '🩺',
    label: 'Sevak Hospital Rounds',
    target: 'ALL_SEVAKS',
    type: 'ALERT',
    priority: 'HIGH',
    title: 'Arogya Sevak Notice: Priority Hospital Rounds',
    title_mr: 'आरोग्य सेवक विशेष सूचना: आजच्या अति-तातडीच्या रुग्णांची भेट',
    message: 'All Arogya Sevaks must complete hospital rounds for assigned Critical patients today and update the daily visit log in the app.',
    message_mr: 'सर्व आरोग्य सेवकांनी आपल्या नियुक्त रुग्णालयात दाखल असलेल्या क्रिटिकल व हाय प्रायॉरिटी रुग्णांची आज वेळेत भेट घेऊन डिस्चार्ज व औषधोपचार स्थितीची नोंद घ्यावी.',
    badge: 'SEVAK ALERT'
  },
  {
    id: 'helpline',
    icon: '📢',
    label: '24x7 Citizen Helpline',
    target: 'BROADCAST_ALL',
    type: 'ANNOUNCEMENT',
    priority: 'MEDIUM',
    title: 'ArogyaMitra 24x7 Citizen Helpline Desk Available',
    title_mr: 'आरोग्य मित्र हेल्पलाइन व साहाय्यता केंद्र २४x७ उपलब्ध',
    message: 'ArogyaMitra citizen desk is available 24x7 for all medical scheme queries, hospital admissions, and emergency assistance.',
    message_mr: 'कोणत्याही आपत्कालीन उपचारांसाठी किंवा शासकीय योजनेच्या मदतीसाठी आरोग्य मित्र कक्ष २४x७ सेवेसाठी उपलब्ध आहे. मदतीसाठी थेट संपर्क साधा.',
    badge: 'HELPLINE'
  }
];

export const SendNotifications = () => {
  const {
    cases = [],
    arogyaSevaks = [],
    adminNotifications = [],
    fetchAdminNotifications,
    fetchArogyaSevaks,
    showToast,
    deleteAdminNotification
  } = useAdmin();

  // Primary Form State: 'ALL_CITIZENS' | 'ALL_SEVAKS' | 'INDIVIDUAL_SEVAK' | 'BROADCAST_ALL'
  const [targetAudience, setTargetAudience] = useState('ALL_CITIZENS');
  const [priority, setPriority] = useState('HIGH'); // 'CRITICAL' | 'HIGH' | 'MEDIUM'
  const [notificationType, setNotificationType] = useState('ANNOUNCEMENT');

  // Individual Sevak Target details
  const [selectedSevakId, setSelectedSevakId] = useState('');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');
  const [targetMobile, setTargetMobile] = useState('');
  const [targetRecipientName, setTargetRecipientName] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');

  // Content (English Primary + Optional Marathi)
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [titleMr, setTitleMr] = useState('');
  const [messageMr, setMessageMr] = useState('');
  const [badgeTag, setBadgeTag] = useState('');
  const [senderName, setSenderName] = useState('ArogyaMitra Admin Desk');

  // Expandable Marathi Section
  const [showMarathiSection, setShowMarathiSection] = useState(false);

  // Active Template Highlight
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  // Preview View: Audience & Language
  const [previewAudience, setPreviewAudience] = useState('CITIZEN'); // 'CITIZEN' | 'SEVAK'
  const [previewLang, setPreviewLang] = useState('EN'); // 'EN' | 'MR'

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('COMPOSE'); // 'COMPOSE' | 'HISTORY'
  const [historySearch, setHistorySearch] = useState('');
  const [dispatchedHistory, setDispatchedHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sync preview audience with target
  useEffect(() => {
    if (targetAudience === 'ALL_SEVAKS' || targetAudience === 'INDIVIDUAL_SEVAK') {
      setPreviewAudience('SEVAK');
    } else {
      setPreviewAudience('CITIZEN');
    }
  }, [targetAudience]);

  // Load Sent History
  const loadDispatchedHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await applicationService.fetchAdminNotifications({ scope: 'sent', limit: 100 });
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.notifications)) {
        list = res.notifications;
      } else if (Array.isArray(res?.data?.notifications)) {
        list = res.data.notifications;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      }
      setDispatchedHistory(list);
    } catch (err) {
      console.warn('[SendNotifications] Error loading history:', err.message);
      setDispatchedHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDispatchedHistory();
    if (fetchArogyaSevaks && (!arogyaSevaks || arogyaSevaks.length === 0)) {
      fetchArogyaSevaks();
    }
  }, [loadDispatchedHistory, fetchArogyaSevaks, arogyaSevaks]);

  const handleDeleteHistoryItem = async (id) => {
    try {
      await applicationService.deleteNotification(id);
      setDispatchedHistory((prev) => prev.filter((item) => (item.id || item.notification_id) !== id));
      if (showToast) showToast('Notification removed', 'success');
    } catch (err) {
      if (deleteAdminNotification) deleteAdminNotification(id);
      setDispatchedHistory((prev) => prev.filter((item) => (item.id || item.notification_id) !== id));
    }
  };

  // Apply Quick Template
  const handleApplyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setTargetAudience(tpl.target);
    setPriority(tpl.priority);
    setNotificationType(tpl.type);
    setTitle(tpl.title);
    setMessage(tpl.message);
    setTitleMr(tpl.title_mr || '');
    setMessageMr(tpl.message_mr || '');
    setBadgeTag(tpl.badge);
    if (tpl.sender) setSenderName(tpl.sender);
    if (tpl.title_mr || tpl.message_mr) {
      setShowMarathiSection(true);
    }
    if (showToast) showToast(`Template filled: ${tpl.label}`, 'info');
  };

  // When an Arogya Sevak is picked from dropdown
  const handleSelectSevak = (sevak) => {
    setSelectedSevakId(sevak.sevakId || sevak.id || '');
    setSelectedEmployeeCode(sevak.employeeCode || '');
    setTargetMobile(sevak.mobile && sevak.mobile !== '—' ? sevak.mobile : '');
    setTargetRecipientName(sevak.name || '');
  };

  // Reset Form
  const handleResetForm = () => {
    setTitle('');
    setMessage('');
    setTitleMr('');
    setMessageMr('');
    setBadgeTag('');
    setSelectedSevakId('');
    setSelectedEmployeeCode('');
    setTargetMobile('');
    setTargetRecipientName('');
    setSelectedCaseId('');
    setSelectedTemplateId(null);
    setShowMarathiSection(false);
  };

  // Submit Notification
  const handleSendNotification = async (e) => {
    e?.preventDefault();

    if (!title.trim() && !titleMr.trim()) {
      if (showToast) showToast('Please enter a notification title (English or Marathi)', 'error');
      return;
    }
    if (!message.trim() && !messageMr.trim()) {
      if (showToast) showToast('Please enter the notification message body', 'error');
      return;
    }

    if (targetAudience === 'INDIVIDUAL_SEVAK' && !targetMobile.trim() && !targetRecipientName.trim() && !selectedSevakId && !selectedEmployeeCode) {
      if (showToast) showToast('Please select or specify the Arogya Sevak recipient', 'error');
      return;
    }

    setIsSending(true);

    try {
      let recipientType = 'CITIZEN';
      let isBroadcast = false;

      if (targetAudience === 'ALL_CITIZENS') {
        recipientType = 'ALL_CITIZENS';
        isBroadcast = true;
      } else if (targetAudience === 'ALL_SEVAKS') {
        recipientType = 'ALL_SEVAKS';
        isBroadcast = true;
      } else if (targetAudience === 'INDIVIDUAL_SEVAK') {
        recipientType = 'SEVAK';
        isBroadcast = false;
      } else if (targetAudience === 'BROADCAST_ALL') {
        recipientType = 'ALL';
        isBroadcast = true;
      }

      const primaryTitle = title.trim() || titleMr.trim();
      const primaryMsg = message.trim() || messageMr.trim();
      const marathiTitle = titleMr.trim() || title.trim();
      const marathiMsg = messageMr.trim() || message.trim();

      const payload = {
        recipient_type: recipientType,
        target_audience: targetAudience,
        is_broadcast: isBroadcast,
        sevak_id: targetAudience === 'INDIVIDUAL_SEVAK' ? (selectedSevakId || null) : null,
        employee_code: targetAudience === 'INDIVIDUAL_SEVAK' ? (selectedEmployeeCode || null) : null,
        mobile: targetMobile.trim() || null,
        recipient_name: targetRecipientName.trim() || null,
        case_id: selectedCaseId.trim() || null,
        type: notificationType,
        priority: priority,
        title: marathiTitle || primaryTitle,
        title_en: primaryTitle,
        title_mr: marathiTitle,
        title_hi: marathiTitle || primaryTitle,
        message: marathiMsg || primaryMsg,
        message_en: primaryMsg,
        message_mr: marathiMsg,
        message_hi: marathiMsg || primaryMsg,
        sender: senderName || 'ArogyaMitra Admin Desk',
        badge: badgeTag.trim() || (priority === 'CRITICAL' ? 'URGENT' : notificationType),
        metadata: {
          sentVia: 'ADMIN_DIRECT_SECTION',
          targetCategory: targetAudience,
          timestamp: new Date().toISOString()
        }
      };

      await applicationService.sendDirectNotification(payload);

      if (showToast) {
        showToast(
          targetAudience === 'ALL_CITIZENS'
            ? 'Broadcast sent to all citizens!'
            : targetAudience === 'ALL_SEVAKS'
            ? 'Broadcast sent to all Arogya Sevaks!'
            : targetAudience === 'INDIVIDUAL_SEVAK'
            ? `Direct notice sent to Arogya Sevak (${targetRecipientName || targetMobile || selectedEmployeeCode})!`
            : 'Broadcast sent to all apps!',
          'success'
        );
      }

      handleResetForm();
      loadDispatchedHistory();
      if (fetchAdminNotifications) fetchAdminNotifications();
    } catch (err) {
      console.error('[SendNotifications] Error sending notification:', err);
      if (showToast) showToast(`Failed to send: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    let list = Array.isArray(dispatchedHistory) ? dispatchedHistory : [];
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      list = list.filter(
        (n) =>
          (n?.title && n.title.toLowerCase().includes(q)) ||
          (n?.title_en && n.title_en.toLowerCase().includes(q)) ||
          (n?.title_mr && n.title_mr.toLowerCase().includes(q)) ||
          (n?.message && n.message.toLowerCase().includes(q)) ||
          (n?.message_en && n.message_en.toLowerCase().includes(q)) ||
          (n?.message_mr && n.message_mr.toLowerCase().includes(q)) ||
          (n?.case_id && n.case_id.toLowerCase().includes(q)) ||
          (n?.mobile && n.mobile.includes(q))
      );
    }
    return list;
  }, [dispatchedHistory, historySearch]);

  // Active Title & Message for Preview based on Preview Language Switcher
  const currentPreviewTitle =
    previewLang === 'MR'
      ? titleMr.trim() || title.trim() || 'सूचनेचे शीर्षक येथे दिसेल...'
      : title.trim() || titleMr.trim() || 'Notification Title will appear here...';

  const currentPreviewMessage =
    previewLang === 'MR'
      ? messageMr.trim() ||
        message.trim() ||
        'तुम्ही लिहिलेला संदेश नागरिकांच्या मोबाईल स्क्रीनवर याप्रमाणे स्वच्छ व सुवाच्य दिसेल...'
      : message.trim() ||
        messageMr.trim() ||
        'Your notification message entered in the form will display clearly on the citizen phone screen...';

  return (
    <div className="notif-simple-container">
      {/* ─── Top Simple Header ─── */}
      <div className="notif-simple-header">
        <div className="header-left-title">
          <div className="header-bell-icon">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="header-main-text">Push Notifications & Direct Alerts</h1>
            <p className="header-sub-text">Send direct announcements, duty directives & alerts to mobile users</p>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="top-tab-switcher">
          <button
            type="button"
            className={`top-tab-btn ${activeTab === 'COMPOSE' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMPOSE')}
          >
            <Send size={15} />
            <span>Compose Message</span>
          </button>
          <button
            type="button"
            className={`top-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <Clock size={15} />
            <span>Sent History ({dispatchedHistory.length})</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: COMPOSE & LIVE PHONE PREVIEW ─── */}
      {activeTab === 'COMPOSE' && (
        <div className="notif-main-grid">
          {/* Left Form */}
          <div className="simple-card composer-box">
            <form onSubmit={handleSendNotification}>
              {/* 1. Who to Send To */}
              <div className="form-field-section">
                <label className="section-label">1. Who should receive this?</label>
                <div className="audience-pill-row four-cols">
                  <button
                    type="button"
                    className={`aud-pill ${targetAudience === 'ALL_CITIZENS' ? 'selected' : ''}`}
                    onClick={() => setTargetAudience('ALL_CITIZENS')}
                  >
                    <Users size={16} />
                    <span>All Citizens</span>
                  </button>

                  <button
                    type="button"
                    className={`aud-pill ${targetAudience === 'ALL_SEVAKS' ? 'selected' : ''}`}
                    onClick={() => setTargetAudience('ALL_SEVAKS')}
                  >
                    <HeartHandshake size={16} />
                    <span>All Sevaks</span>
                  </button>

                  <button
                    type="button"
                    className={`aud-pill ${targetAudience === 'INDIVIDUAL_SEVAK' ? 'selected' : ''}`}
                    onClick={() => setTargetAudience('INDIVIDUAL_SEVAK')}
                  >
                    <Activity size={16} />
                    <span>Single Sevak</span>
                  </button>

                  <button
                    type="button"
                    className={`aud-pill ${targetAudience === 'BROADCAST_ALL' ? 'selected' : ''}`}
                    onClick={() => setTargetAudience('BROADCAST_ALL')}
                  >
                    <Radio size={16} />
                    <span>Broadcast All</span>
                  </button>
                </div>
              </div>

              {/* Individual Arogya Sevak Picker */}
              {targetAudience === 'INDIVIDUAL_SEVAK' && (
                <div className="form-field-section sevak-picker-box" style={{ background: '#fff7ed', padding: '14px', borderRadius: '10px', border: '1px solid #fed7aa', marginBottom: '16px' }}>
                  <label className="section-label" style={{ color: '#9a3412', marginBottom: '8px' }}>
                    Select Arogya Sevak & Directive Details
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#7c2d12', display: 'block', marginBottom: '4px' }}>
                        Quick Pick Active Arogya Sevak
                      </label>
                      <select
                        className="simple-text-input"
                        value={selectedSevakId || selectedEmployeeCode || targetMobile}
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = (arogyaSevaks || []).find(
                            (s) => (s.sevakId || s.id) === val || s.employeeCode === val || s.mobile === val
                          );
                          if (match) handleSelectSevak(match);
                        }}
                      >
                        <option value="">-- Choose from Active Arogya Sevaks --</option>
                        {(arogyaSevaks || []).map((s) => (
                          <option key={s.sevakId || s.id} value={s.sevakId || s.id}>
                            {s.name} • {s.hospital || 'Hospital'} • Code: {s.employeeCode || s.id} • 📞 {s.mobile}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                      <input
                        type="text"
                        className="simple-text-input"
                        placeholder="Sevak Name (e.g. Rahul Deshmukh)"
                        value={targetRecipientName}
                        onChange={(e) => setTargetRecipientName(e.target.value)}
                      />
                      <input
                        type="text"
                        className="simple-text-input"
                        placeholder="Mobile (e.g. 9822114455)"
                        value={targetMobile}
                        onChange={(e) => setTargetMobile(e.target.value)}
                      />
                      <input
                        type="text"
                        className="simple-text-input"
                        placeholder="Code / ID (e.g. AS-041977)"
                        value={selectedEmployeeCode || selectedSevakId}
                        onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                      />
                      <input
                        type="text"
                        className="simple-text-input"
                        placeholder="Case Ref. ID (Optional)"
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Quick 1-Click Templates */}
              <div className="form-field-section">
                <div className="section-label-row">
                  <label className="section-label">2. Quick Fill Template (Optional)</label>
                  <span className="sparkle-tag">✨ Click to auto-fill</span>
                </div>
                <div className="template-chips-grid">
                  {PRESET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className={`simple-template-chip ${selectedTemplateId === tpl.id ? 'active' : ''}`}
                      onClick={() => handleApplyTemplate(tpl)}
                    >
                      <span className="tpl-icon">{tpl.icon}</span>
                      <span className="tpl-text">{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Notification Message */}
              <div className="form-field-section">
                <label className="section-label">3. Message Details</label>

                {/* Primary English Message */}
                <div className="input-row">
                  <div className="input-group full">
                    <input
                      type="text"
                      className="simple-text-input bold"
                      placeholder="Notification Title (e.g. Urgent Directive / Camp Notice)..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required={!titleMr.trim()}
                    />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group full">
                    <textarea
                      rows={3}
                      className="simple-text-input textarea"
                      placeholder="Write your message body here. Recipients will see this clearly on their mobile screen..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required={!messageMr.trim()}
                    />
                  </div>
                </div>

                {/* Optional Marathi Translation Accordion */}
                <div className="optional-marathi-box">
                  <button
                    type="button"
                    className="marathi-accordion-btn"
                    onClick={() => setShowMarathiSection(!showMarathiSection)}
                  >
                    <div className="marathi-btn-left">
                      <Globe size={15} />
                      <span>मराठी मजकूर जोडा / Add Marathi Translation (Optional)</span>
                    </div>
                    {showMarathiSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showMarathiSection && (
                    <div className="marathi-fields-panel">
                      <div className="input-row">
                        <input
                          type="text"
                          className="simple-text-input bold marathi-input"
                          placeholder="मराठी शीर्षक (उदा. तातडीचे निर्देश: वॉर्ड क्र. ३ मधील बेड उपलब्धता तपासा)..."
                          value={titleMr}
                          onChange={(e) => setTitleMr(e.target.value)}
                        />
                      </div>
                      <div className="input-row">
                        <textarea
                          rows={3}
                          className="simple-text-input textarea marathi-input"
                          placeholder="नागरिकांना किंवा सेवकांना पाठवायचा सविस्तर मराठी संदेश येथे लिहा..."
                          value={messageMr}
                          onChange={(e) => setMessageMr(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority Selector & Badge */}
                <div className="priority-bar-row">
                  <div className="priority-toggle-group">
                    <span className="priority-label">Priority:</span>
                    <button
                      type="button"
                      className={`pri-btn critical ${priority === 'CRITICAL' ? 'active' : ''}`}
                      onClick={() => setPriority('CRITICAL')}
                    >
                      🔴 Urgent (Critical)
                    </button>
                    <button
                      type="button"
                      className={`pri-btn high ${priority === 'HIGH' ? 'active' : ''}`}
                      onClick={() => setPriority('HIGH')}
                    >
                      🟠 High
                    </button>
                    <button
                      type="button"
                      className={`pri-btn medium ${priority === 'MEDIUM' ? 'active' : ''}`}
                      onClick={() => setPriority('MEDIUM')}
                    >
                      🔵 Normal
                    </button>
                  </div>

                  <input
                    type="text"
                    className="simple-text-input badge-input"
                    placeholder="Tag (e.g. MJPJAY, URGENT)"
                    value={badgeTag}
                    onChange={(e) => setBadgeTag(e.target.value)}
                  />
                </div>
              </div>

              {/* Bottom Send & Reset Actions */}
              <div className="form-bottom-actions">
                <button
                  type="button"
                  className="btn-clear"
                  onClick={handleResetForm}
                  disabled={isSending}
                >
                  <RotateCcw size={14} />
                  <span>Clear Form</span>
                </button>

                <button
                  type="submit"
                  className="btn-send-large"
                  disabled={isSending}
                >
                  {isSending ? (
                    <span>Sending Notification...</span>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>
                        {targetAudience === 'ALL_CITIZENS'
                          ? 'Send to All Citizens'
                          : targetAudience === 'ALL_SEVAKS'
                          ? 'Send to All Sevaks'
                          : targetAudience === 'INDIVIDUAL_SEVAK'
                          ? 'Send to Selected Sevak'
                          : 'Broadcast to All Apps'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Large Smartphone Live Preview */}
          <div className="simple-card preview-sidebar-box">
            <div className="preview-top-heading">
              <div className="preview-title-left">
                <Smartphone size={16} className="text-emerald" />
                <span>Live Smartphone Preview</span>
              </div>
              <span className="live-dot-badge">● LIVE PREVIEW</span>
            </div>

            {/* Audience & Language View Switcher */}
            <div className="preview-switchers-row">
              <div className="phone-view-tabs">
                <button
                  type="button"
                  className={`phone-tab ${previewAudience === 'CITIZEN' ? 'active' : ''}`}
                  onClick={() => setPreviewAudience('CITIZEN')}
                >
                  <Users size={12} />
                  <span>Citizen View</span>
                </button>
                <button
                  type="button"
                  className={`phone-tab ${previewAudience === 'SEVAK' ? 'active' : ''}`}
                  onClick={() => setPreviewAudience('SEVAK')}
                >
                  <Activity size={12} />
                  <span>Sevak View</span>
                </button>
              </div>

              <div className="phone-lang-tabs">
                <button
                  type="button"
                  className={`lang-tab ${previewLang === 'EN' ? 'active' : ''}`}
                  onClick={() => setPreviewLang('EN')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`lang-tab ${previewLang === 'MR' ? 'active' : ''}`}
                  onClick={() => setPreviewLang('MR')}
                >
                  मराठी
                </button>
              </div>
            </div>

            {/* TALL SMARTPHONE DEVICE */}
            <div className="phone-frame-realistic">
              {/* Notch */}
              <div className="phone-hardware-notch">
                <div className="camera-lens" />
                <div className="speaker-slot" />
              </div>

              {/* Screen Display */}
              <div className="phone-glass-screen">
                {/* Status Bar */}
                <div className="screen-status-bar">
                  <span>9:41 AM</span>
                  <span className="brand-text">ArogyaMitra</span>
                  <span>📶 100%</span>
                </div>

                {/* App Top Bar */}
                <div className="screen-app-bar">
                  <div className="app-bar-brand">
                    <Bell size={14} />
                    <span>
                      {previewLang === 'MR'
                        ? previewAudience === 'SEVAK'
                          ? 'आरोग्य सेवक सूचना'
                          : 'आरोग्य मित्र सूचना'
                        : previewAudience === 'SEVAK'
                        ? 'Sevak Alerts'
                        : 'Notifications'}
                    </span>
                  </div>
                  <span className="app-bar-pill">{previewLang === 'MR' ? '१ नवीन' : '1 New'}</span>
                </div>

                {/* Phone Body Feed */}
                <div className="screen-content-area">
                  {/* Push Notification Pop-up Banner */}
                  <div className="phone-push-pop">
                    <div className="push-pop-top">
                      <span className="push-icon">🏥</span>
                      <span className="push-title">ArogyaMitra</span>
                      <span className="push-time">{previewLang === 'MR' ? 'आत्ताच' : 'now'}</span>
                    </div>
                    <div className="push-pop-headline">
                      {currentPreviewTitle}
                    </div>
                    <div className="push-pop-sub">
                      {currentPreviewMessage}
                    </div>
                  </div>

                  <div className="screen-feed-label">
                    <span>{previewLang === 'MR' ? 'ॲप सूचना यादी' : 'IN-APP NOTIFICATIONS'}</span>
                  </div>

                  {/* Notification In-App Card */}
                  <div
                    className={`phone-feed-card ${
                      priority === 'CRITICAL'
                        ? 'p-crit'
                        : priority === 'HIGH'
                        ? 'p-hi'
                        : 'p-med'
                    }`}
                  >
                    <div className="card-top-row">
                      <span className="card-badge">
                        {badgeTag.trim() ||
                          (priority === 'CRITICAL'
                            ? previewLang === 'MR'
                              ? 'तातडीचे'
                              : 'URGENT'
                            : notificationType)}
                      </span>
                      <span className="card-time">{previewLang === 'MR' ? 'आत्ताच' : 'Just now'}</span>
                    </div>

                    <div className="card-title-text">
                      {currentPreviewTitle}
                    </div>

                    <div className="card-body-text">
                      {currentPreviewMessage}
                    </div>

                    {selectedCaseId && (
                      <div style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '3px 6px', borderRadius: '4px', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={11} />
                        <span>Case Ref: {selectedCaseId}</span>
                      </div>
                    )}

                    <div className="card-footer-row">
                      <span className="card-sender-text">
                        👤 {previewLang === 'MR' ? 'आरोग्य मित्र कक्ष' : (senderName || 'ArogyaMitra Desk')}
                      </span>
                      <span className="card-link-text">
                        {previewLang === 'MR' ? 'सविस्तर पहा ›' : 'View details ›'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="screen-home-bar">
                  <div className="home-line" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SENT NOTIFICATION HISTORY ─── */}
      {activeTab === 'HISTORY' && (
        <div className="simple-card history-container-card">
          <div className="history-search-row">
            <div className="history-search-input-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search history by title, mobile, or type..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-refresh"
              onClick={loadDispatchedHistory}
              disabled={historyLoading}
            >
              <RefreshCw size={14} className={historyLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="history-table-wrapper">
            {historyLoading ? (
              <div className="empty-history-box">
                <RefreshCw size={24} className="spin text-emerald" />
                <p>Loading sent notifications...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty-history-box">
                <Bell size={36} className="empty-icon" />
                <p className="empty-bold">No notifications sent yet</p>
                <p className="empty-sub">Switch to the "Compose Message" tab to dispatch your first alert.</p>
              </div>
            ) : (
              <table className="clean-history-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Audience</th>
                    <th>Notification Message</th>
                    <th>Type</th>
                    <th>Sent At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.id || item.notification_id}>
                      <td>
                        <span className={`hist-pri-badge ${(item.priority || 'NORMAL').toLowerCase()}`}>
                          {item.priority || 'NORMAL'}
                        </span>
                      </td>
                      <td>
                        <div className="hist-aud-cell">
                          <span className="aud-type-pill">{item.recipient_type || 'CITIZEN'}</span>
                        </div>
                      </td>
                      <td className="hist-msg-cell">
                        <div className="hist-title-bold">
                          {item.title_mr || item.title_en || item.title}
                        </div>
                        <div className="hist-desc-sub">
                          {item.message_mr || item.message_en || item.message}
                        </div>
                      </td>
                      <td>
                        <span className="hist-general-tag">{item.type || 'ANNOUNCEMENT'}</span>
                      </td>
                      <td className="hist-time-text">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Just now'}
                      </td>
                      <td>
                        <div className="hist-actions-right">
                          <button
                            type="button"
                            className="btn-action-icon reuse"
                            title="Copy to Composer"
                            onClick={() => {
                              setTitle(item.title_en || item.title || '');
                              setMessage(item.message_en || item.message || '');
                              setTitleMr(item.title_mr || '');
                              setMessageMr(item.message_mr || '');
                              if (item.title_mr || item.message_mr) {
                                setShowMarathiSection(true);
                              }
                              setPriority(item.priority || 'HIGH');
                              setBadgeTag(item.badge || '');
                              setActiveTab('COMPOSE');
                              if (showToast) showToast('Loaded template into composer', 'info');
                            }}
                          >
                            <RotateCcw size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-action-icon delete"
                            title="Delete Record"
                            onClick={() => handleDeleteHistoryItem(item.id || item.notification_id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SendNotifications;
