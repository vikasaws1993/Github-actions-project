import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';
import { LogoutConfirmationModal } from '../../../shared/components/LogoutConfirmationModal';
import { colors } from '../../../shared/theme/colors';
import { APP_CONFIG } from '../../../shared/constants/config';
import { sevakApi } from '../../services/sevakApi';
import {
  sevakHospitalService,
  HospitalFacilityProfile,
  EMPTY_HOSPITAL_SURVEY_PROFILE,
  getCompletedSurveySections,
} from '../../services/sevakHospitalService';

export const SevakProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUserProfile } = useAuth();
  const { language, t } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Dynamic Sevak Stats & Hospital
  const [hospital, setHospital] = useState<HospitalFacilityProfile>(EMPTY_HOSPITAL_SURVEY_PROFILE);
  const [allocatedCount, setAllocatedCount] = useState<number>(0);

  // Language Modal State
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('B+');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [liveProfile, hospData, cases] = await Promise.all([
          sevakApi.getProfile().catch(() => null),
          sevakHospitalService.getHospitalProfile().catch(() => EMPTY_HOSPITAL_SURVEY_PROFILE),
          sevakHospitalService.getAllocatedCases().catch(() => []),
        ]);

        if (liveProfile) {
          updateUserProfile({
            name: liveProfile.full_name || liveProfile.name,
            email: liveProfile.email,
            address: liveProfile.address,
            district: liveProfile.district,
            taluka: liveProfile.taluka,
            badgeNumber: liveProfile.employee_code,
          });
        }
        if (hospData) {
          setHospital(hospData);
        }
        setAllocatedCount(cases?.length || 0);
      } catch (_) {}
    })();
  }, []);

  const handleOpenEdit = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditEmergencyPhone(user?.phoneNumber || '');
    setEditAddress(user?.address || '');
    setEditBloodGroup('B+');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t('validationRequired'), t('fullNameLabel'));
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      setIsEditModalVisible(false);
      Alert.alert(t('profileUpdatedSuccess'), '');
    } catch {
      Alert.alert('Error', 'Unable to save profile at this time.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <Text style={styles.headerTitle}>{t('profileHeaderTitle')}</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={handleOpenEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.editHeaderText}>{t('editDetailsHeaderBtn')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={32} color="#0284C7" />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>

            <View style={{ flex: 1, paddingLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name || (language === 'mr' ? 'आरोग्य सेवक' : language === 'hi' ? 'आरोग्य सेवक' : 'Arogya Sevak')}
                </Text>
              </View>
              <View style={styles.roleTag}>
                <Ionicons name="shield-checkmark" size={11} color="#0284C7" />
                <Text style={styles.roleTagText}>{t('sevakRoleBadge')}</Text>
              </View>
              <Text style={styles.badgeNumberText}>
                {t('staffIdPrefix')}: {user?.badgeNumber || user?.phoneNumber || '-'}
              </Text>
            </View>
          </View>

          {/* Quick Stats Strip */}
          <View style={styles.heroStatsStrip}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatVal}>{allocatedCount}</Text>
              <Text style={styles.heroStatLbl}>{t('statAllocatedPatients')}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={[styles.heroStatVal, { color: '#16A34A' }]}>
                {hospital.currentStatus?.verifiedBySevak ? '7/7' : `${getCompletedSurveySections(hospital).length}/7`}
              </Text>
              <Text style={styles.heroStatLbl}>{t('surveyProgressBtn')}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatVal}>{user?.assignedWard || user?.taluka || '-'}</Text>
              <Text style={styles.heroStatLbl}>{t('assignedWardLabel')}</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Official Health Department Assignment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="business" size={18} color="#0284C7" />
            </View>
            <Text style={styles.cardTitle}>{t('officialAssignmentCardTitle')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('assignedHospitalNameLabel')}</Text>
            <Text style={styles.infoValue}>
              {hospital.hospitalName ? `${hospital.hospitalName} (${hospital.assignedHospitalId || '-'})` : (user?.hospitalName || '-')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('assignedWardLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.assignedWard || (user?.taluka ? `${user.taluka} Sub-Centre` : '-')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('phcLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.phc || (user?.taluka ? `${user.taluka} PHC, ${user.district || 'MH'}` : (user?.assignedWard || '-'))}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{t('reportingOfficerLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.reportingOfficer || 'Medical Officer In-Charge'}
            </Text>
          </View>
        </View>

        {/* Section 2: Personal & Contact Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="person-circle" size={18} color="#16A34A" />
            </View>
            <Text style={styles.cardTitle}>{t('contactPersonalTitle')}</Text>
          </View>

          {/* Locked Mobile Number */}
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.infoLabel}>{t('officialMobileNumberLabel')}</Text>
              <Ionicons name="lock-closed" size={12} color="#94A3B8" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.infoValue, { fontWeight: '700' }]}>
                +91 {user?.phoneNumber || '-'}
              </Text>
              <View style={styles.lockedPill}>
                <Text style={styles.lockedPillText}>{t('loginPhoneLockedLabel')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('emailAddressLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.email || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('emergencyPhoneLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.emergencyPhone || user?.phoneNumber || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('resAddressLabel')}</Text>
            <Text style={styles.infoValue}>
              {user?.address || (user?.district ? `${user.taluka ? user.taluka + ', ' : ''}${user.district}, Maharashtra` : '-')}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{t('bloodGroupLabel')}</Text>
            <Text style={styles.infoValue}>{user?.bloodGroup || '-'}</Text>
          </View>
        </View>

        {/* Section 3: App Preferences & Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="settings-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.cardTitle}>{t('preferencesSystemTitle')}</Text>
          </View>

          {/* Language Switch (Commented out for Arogya Sevak - English only)
          <TouchableOpacity
            style={styles.settingActionRow}
            onPress={() => setIsLanguageModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="language" size={18} color="#475569" />
              <View>
                <Text style={styles.settingActionTitle}>{t('appLanguageTitle')}</Text>
                <Text style={styles.settingActionSub}>
                  {t('appLanguageCurrent')} {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
                </Text>
              </View>
            </View>
            <View style={styles.langPill}>
              <Ionicons name="globe-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={styles.langPillText}>{t('switchLanguageBtn')}</Text>
            </View>
          </TouchableOpacity>
          */}

          {/* Sync & Offline Status */}
          <View style={styles.settingActionRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="cloud-done-outline" size={18} color="#059669" />
              <View>
                <Text style={styles.settingActionTitle}>{t('offlineStorageTitle')}</Text>
                <Text style={styles.settingActionSub}>{t('localCacheSynced')}</Text>
              </View>
            </View>
            <View style={[styles.langPill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.langPillText, { color: '#16A34A' }]}>{t('activeBadge')}</Text>
            </View>
          </View>

          {/* App Version Info */}
          <View style={[styles.settingActionRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={18} color="#64748B" />
              <View>
                <Text style={styles.settingActionTitle}>ArogyaMitra Sevak Portal</Text>
                <Text style={styles.settingActionSub}>Version {APP_CONFIG.VERSION} (Build 2026.09 Release)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>{t('logoutBtnText')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ============================================================ */}
      {/* EDIT PROFILE DETAILS MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editModalTitle')}</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 100 }}
              style={{ maxHeight: 420 }}
            >
              {/* Full Name */}
              <Text style={styles.inputLabel}>{t('fullNameLabel')} *</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('fullNamePlaceholder')}
                placeholderTextColor="#94A3B8"
              />

              {/* Locked Mobile Phone (Strictly Non-Editable) */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>{t('officialMobileNumberLabel')}</Text>
                  <Ionicons name="lock-closed" size={12} color="#DC2626" />
                </View>
                <View style={styles.lockedInputWrap}>
                  <TextInput
                    style={[styles.textInput, styles.lockedInput]}
                    value={`+91 ${user?.phoneNumber || '2222222222'}`}
                    editable={false}
                  />
                  <Text style={styles.lockedHint}>
                    {t('mobileLockNote')}
                  </Text>
                </View>
              </View>

              {/* Email Address */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('emailAddressLabel')}</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@arogyamitra.gov.in"
                placeholderTextColor="#94A3B8"
              />

              {/* Alternate Emergency Contact */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                {t('emergencyPhoneLabel')}
              </Text>
              <TextInput
                style={styles.textInput}
                value={editEmergencyPhone}
                onChangeText={setEditEmergencyPhone}
                keyboardType="phone-pad"
                placeholder="+91 98221 44556"
                placeholderTextColor="#94A3B8"
              />

              {/* Residential Address */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('resAddressLabel')}</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={2}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder={t('addressPlaceholder')}
                placeholderTextColor="#94A3B8"
              />

              {/* Blood Group */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>{t('bloodGroupLabel')}</Text>
              <View style={styles.bloodGroupRow}>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[
                      styles.bloodChip,
                      editBloodGroup === bg && styles.bloodChipSelected,
                    ]}
                    onPress={() => setEditBloodGroup(bg)}
                  >
                    <Text
                      style={[
                        styles.bloodChipText,
                        editBloodGroup === bg && styles.bloodChipTextSelected,
                      ]}
                    >
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                <Text style={styles.modalSaveText}>
                  {isSaving ? '...' : t('saveProfileBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* App Language Selection Modal (Commented out for Arogya Sevak - English only)
      <LanguageModal
        visible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
      />
      */}

      {/* Custom Logout Confirmation Popup */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#047857',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  badgeNumberText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  heroStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroStatLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },

  // General Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  lockedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // Settings
  settingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  settingActionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  langPill: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  lockedInputWrap: {
    opacity: 0.85,
  },
  lockedInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    color: '#64748B',
  },
  lockedHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
    fontStyle: 'italic',
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bloodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bloodChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  bloodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bloodChipTextSelected: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
