import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { applicationStore } from '../../services/applicationStore';
import { SchemeApplication } from '../../types/application.types';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';

export const ContactSevakScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const routeCaseId = route.params?.caseId || route.params?.applicationId;

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );
  const bottomInset = Math.max(insets.bottom, 16);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await applicationStore.getApplications();
      setApplications(data);

      if (routeCaseId && data.some((a) => a.id === routeCaseId)) {
        setSelectedAppId(routeCaseId);
      } else if (data.length > 0) {
        setSelectedAppId((prev) => (prev && data.some((a) => a.id === prev) ? prev : data[0].id));
      }
    } catch (err) {
      console.error('Error loading applications for Sevak screen:', err);
    } finally {
      setLoading(false);
    }
  }, [routeCaseId]);

  useEffect(() => {
    if (routeCaseId) {
      setSelectedAppId(routeCaseId);
    }
  }, [routeCaseId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getLocalizedScheme = (schemeId?: string, schemeName?: string) => {
    const schemeKey = `${schemeId || ''} ${schemeName || ''}`.toLowerCase();
    const isPmjayScheme = schemeKey.includes('pmjay') || schemeKey.includes('ayushman') || schemeKey.includes('आयुष्मान');
    const isMjpjayScheme = schemeKey.includes('mjpjay') || schemeKey.includes('jyotirao') || schemeKey.includes('jyotiba') || schemeKey.includes('phule') || schemeKey.includes('फुले');

    if (isPmjayScheme) return t('schemePmjay') || 'आयुष्मान भारत (PM-JAY)';
    if (isMjpjayScheme) return t('schemeMjpjay') || 'महात्मा ज्योतिराव फुले जन आरोग्य योजना';
    return schemeName || t('govtSchemeLabel') || 'शासकीय आरोग्य योजना';
  };

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0];

  // Determine if Arogya Sevak is appointed/allocated
  const isSevakAssigned = Boolean(selectedApp?.assignedSevak);
  const currentSevak = selectedApp?.assignedSevak;
  const currentHospital = (selectedApp?.hospitalName && selectedApp.hospitalName !== '-' && selectedApp.hospitalName !== '—') ? selectedApp.hospitalName : '-';

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=Hello%20Arogya%20Sevak,%20I%20need%20assistance%20regarding%20my%20health%20scheme%20application.`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`tel:${phoneNumber}`);
    });
  };

  if (loading && applications.length === 0) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#0A5C53" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar - Clean and Simple */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, marginLeft: navigation.canGoBack() ? 10 : 0 }}>
            <Text style={styles.headerTitle}>{t('contactSevakScreenTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('contactSevakScreenSubtitle')}</Text>
          </View>

          {/* Language Switcher Dropdown Pill */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select Language"
          >
            <Ionicons name="globe-outline" size={13} color="#0A5C53" style={{ marginRight: 3 }} />
            <Text style={styles.langText}>
              {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#0A5C53" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════ SIMPLE & CLEAR CASE SELECTOR CARD ══════════════ */}
        {selectedApp ? (
          <View style={styles.caseSelectorCard}>
            <View style={styles.caseSelectorHeader}>
              <View style={styles.caseBadgeRow}>
                <View style={styles.caseIdBadge}>
                  <Ionicons name="folder-open" size={13} color="#0A5C53" style={{ marginRight: 4 }} />
                  <Text style={styles.caseIdText}>{selectedApp.id}</Text>
                </View>
                {selectedApp.assignedSevak ? (
                  <View style={styles.sevakStatusPillActive}>
                    <Ionicons name="checkmark-circle" size={12} color="#16A34A" style={{ marginRight: 3 }} />
                    <Text style={styles.sevakStatusTextActive}>{t('sevakAssignedTag' as any) || 'सेवक नियुक्त'}</Text>
                  </View>
                ) : (
                  <View style={styles.sevakStatusPillPending}>
                    <Ionicons name="time-outline" size={12} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.sevakStatusTextPending}>{t('sevakPendingTag' as any) || 'सेवक प्रलंबित'}</Text>
                  </View>
                )}
              </View>

              {applications.length > 1 && (
                <TouchableOpacity
                  style={styles.switchCaseBtn}
                  activeOpacity={0.75}
                  onPress={() => setCaseModalVisible(true)}
                >
                  <Text style={styles.switchCaseBtnText}>{t('changeCaseBtn' as any) || 'केस बदला'}</Text>
                  <Ionicons name="chevron-down" size={14} color="#0A5C53" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={applications.length > 1 ? 0.75 : 1}
              onPress={() => applications.length > 1 && setCaseModalVisible(true)}
              style={styles.caseInfoRow}
            >
              <View style={styles.patientAvatarBox}>
                <Ionicons name="person" size={18} color="#0A5C53" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.casePatientName} numberOfLines={1}>
                  {selectedApp.patientName}{' '}
                  <Text style={styles.casePatientMeta}>
                    ({selectedApp.age ? `${selectedApp.age} ${t('years') || 'वर्षे'}` : ''}{selectedApp.gender ? `, ${selectedApp.gender === 'female' || selectedApp.gender === 'Female' ? (t('genderFemale') || 'महिला') : (t('genderMale') || 'पुरुष')}` : ''})
                  </Text>
                </Text>
                <Text style={styles.caseSchemeText} numberOfLines={1}>
                  {getLocalizedScheme(selectedApp.schemeId, selectedApp.schemeName)}
                </Text>
              </View>
              {applications.length > 1 && (
                <View style={styles.switchIconBadge}>
                  <Ionicons name="swap-vertical" size={16} color="#0A5C53" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ══════════════ IF SEVAK IS APPOINTED / ALLOCATED ══════════════ */}
        {isSevakAssigned && currentSevak ? (
          <View style={styles.assignedSection}>
            {/* Arogya Sevak Main Profile Card */}
            <View style={styles.sevakCard}>
              <View style={styles.sevakProfileHeader}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={32} color="#0A5C53" />
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.sevakName}>{currentSevak.name}</Text>
                  <Text style={styles.sevakRole}>
                    {currentSevak.role || t('sevakDesignation')}
                  </Text>
                  {currentHospital !== '-' && (
                    <View style={styles.hospitalRow}>
                      <Ionicons name="business" size={14} color="#0A5C53" style={{ marginRight: 4 }} />
                      <Text style={styles.hospitalText} numberOfLines={1}>
                        {currentHospital}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Direct Call and WhatsApp Actions */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.callPrimaryBtn}
                  activeOpacity={0.88}
                  onPress={() => handleCall(currentSevak.phone)}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.callPrimaryBtnText}>{t('callSevakNow')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappBtn}
                  activeOpacity={0.88}
                  onPress={() => handleWhatsApp(currentSevak.phone)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsappBtnText}>{t('whatsappMessage')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Details Card */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionHeading}>{t('sevakContactDetailsTitle')}</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="call-outline" size={18} color="#0A5C53" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.infoLabel}>{t('mobileNumberLabel')}</Text>
                  <Text style={styles.infoVal}>+91 {currentSevak.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCall(currentSevak.phone)}>
                  <Ionicons name="open-outline" size={20} color="#0A5C53" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="time-outline" size={18} color="#0A5C53" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.infoLabel}>{t('timingLabel')}</Text>
                  <Text style={styles.infoVal}>{t('availableTiming')}</Text>
                </View>
              </View>

              {currentHospital !== '-' && (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="business-outline" size={18} color="#0A5C53" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.infoLabel}>{t('sevakHospitalLabel')}</Text>
                    <Text style={[styles.infoVal, { color: '#0A5C53', fontWeight: '700' }]}>
                      {currentHospital}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* ══════════════ IF NOT ALLOCATED: DO NOT SHOW SEVAK INFO ══════════════ */
          <View style={styles.unassignedSection}>
            {/* Friendly Status Card */}
            <View style={styles.unassignedCard}>
              <View style={styles.unassignedIconCircle}>
                <Ionicons name="alert-circle-outline" size={44} color="#D97706" />
              </View>

              <Text style={styles.unassignedTitle}>{t('noSevakTitle')}</Text>
              <Text style={styles.unassignedDesc}>{t('noSevakDesc')}</Text>
            </View>

            {/* Helpline Section */}
            <View style={styles.helplineCard}>
              <View style={styles.helplineTopRow}>
                <View style={styles.headsetCircle}>
                  <Ionicons name="headset" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.helplineCardTitle}>{t('helplineTitleCard')}</Text>
                  <Text style={styles.helplineNumber}>1800-123-4567</Text>
                  <Text style={styles.helplineHoursNote}>{t('helplineTimingNote')}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.callHelplineBtn}
                activeOpacity={0.88}
                onPress={() => handleCall('18001234567')}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.callHelplineBtnText}>
                  {t('callHelplineBtn')} (1800-123-4567)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════ HOW AROGYA SEVAK HELPS (GUIDANCE) ══════════════ */}
        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeader}>
            <Ionicons name="information-circle" size={20} color="#0A5C53" />
            <Text style={styles.guidanceTitle}>{t('howSevakHelpsTitle')}</Text>
          </View>

          <View style={styles.guidanceItem}>
            <View style={styles.bulletDot} />
            <Text style={styles.guidanceText}>{t('sevakHelpPoint1')}</Text>
          </View>

          <View style={styles.guidanceItem}>
            <View style={styles.bulletDot} />
            <Text style={styles.guidanceText}>{t('sevakHelpPoint2')}</Text>
          </View>

          <View style={styles.guidanceItem}>
            <View style={styles.bulletDot} />
            <Text style={styles.guidanceText}>{t('sevakHelpPoint3')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ══════════════ CASE SELECTION BOTTOM SHEET MODAL ══════════════ */}
      <Modal
        visible={caseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCaseModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCaseModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalSheet, { paddingBottom: bottomInset + 16 }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('selectCaseTitle' as any) || 'तुमचा अर्ज / केस निवडा'}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('selectCaseSubtitle' as any) || `एकूण ${applications.length} अर्ज उपलब्ध आहेत. माहिती पाहण्यासाठी निवडा.`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCaseModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {applications.map((app) => {
                const isSelected = app.id === selectedAppId;
                return (
                  <TouchableOpacity
                    key={app.id}
                    style={[styles.modalCaseItem, isSelected && styles.modalCaseItemActive]}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedAppId(app.id);
                      setCaseModalVisible(false);
                    }}
                  >
                    <View style={[styles.modalRadioCircle, isSelected && styles.modalRadioCircleActive]}>
                      {isSelected ? (
                        <View style={styles.modalRadioInner} />
                      ) : null}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.modalCaseId, isSelected && styles.modalCaseIdActive]}>
                          {app.id}
                        </Text>
                        {app.assignedSevak ? (
                          <View style={styles.modalBadgeAssigned}>
                            <Text style={styles.modalBadgeAssignedText}>✓ {app.assignedSevak.name}</Text>
                          </View>
                        ) : (
                          <View style={styles.modalBadgePending}>
                            <Text style={styles.modalBadgePendingText}>{t('sevakPendingTag' as any) || 'सेवक प्रलंबित'}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.modalPatientName} numberOfLines={1}>
                        {app.patientName} {app.age ? `(${app.age} ${t('years') || 'वर्षे'})` : ''}
                      </Text>
                      <Text style={styles.modalSchemeName} numberOfLines={1}>
                        {getLocalizedScheme(app.schemeId, app.schemeName)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Case Selector Card Styles
  caseSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  caseSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caseIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caseIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A5C53',
  },
  sevakStatusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevakStatusTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  sevakStatusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevakStatusTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  switchCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  switchCaseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  caseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  patientAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  casePatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  casePatientMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  caseSchemeText: {
    fontSize: 12,
    color: '#0D9488',
    marginTop: 1,
  },
  switchIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalCaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalCaseItemActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0A5C53',
  },
  modalRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRadioCircleActive: {
    borderColor: '#0A5C53',
  },
  modalRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A5C53',
  },
  modalCaseId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  modalCaseIdActive: {
    color: '#0A5C53',
  },
  modalBadgeAssigned: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalBadgeAssignedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  modalBadgePending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalBadgePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  modalPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  modalSchemeName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  assignedSection: {
    gap: 14,
  },
  sevakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sevakProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sevakName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sevakRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hospitalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A5C53',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  callPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    paddingVertical: 12,
    borderRadius: 12,
  },
  whatsappBtnText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  unassignedSection: {
    gap: 14,
  },
  unassignedCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  unassignedIconCircle: {
    marginBottom: 10,
  },
  unassignedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
    marginBottom: 6,
  },
  unassignedDesc: {
    fontSize: 13,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 19,
  },
  helplineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#0A5C53',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  helplineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headsetCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A5C53',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  helplineNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A5C53',
    marginTop: 2,
  },
  helplineHoursNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  callHelplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A5C53',
    paddingVertical: 13,
    borderRadius: 12,
  },
  callHelplineBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  guidanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  guidanceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A5C53',
    marginTop: 6,
    marginRight: 10,
  },
  guidanceText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
});
