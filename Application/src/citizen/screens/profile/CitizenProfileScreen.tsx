import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { useAuth } from '../../../shared/hooks/useAuth';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';
import { LogoutConfirmationModal } from '../../../shared/components/LogoutConfirmationModal';
import { SearchableSelectModal } from '../../../shared/components/SearchableSelectModal';
import { DatePickerModal } from '../../../shared/components/DatePickerModal';
import { locationDirectoryService } from '../../../shared/services/locationDirectoryService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_CONFIG } from '../../../shared/constants/config';

const formatToDdMmYyyy = (val?: string): string => {
  if (!val) return '';
  const clean = val.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[\/\-T ]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
    const parts = clean.split('-');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  return clean;
};

export const CitizenProfileScreen: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const { language, t, nextOption } = useLanguage();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [editAddress, setEditAddress] = useState('');
  const [editState, setEditState] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTaluka, setEditTaluka] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Location Autocomplete Modals
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [talukaModalVisible, setTalukaModalVisible] = useState(false);

  const handleOpenEdit = () => {
    setEditName(user?.name || '');
    setEditDob(formatToDdMmYyyy(user?.dob));
    setEditGender(((user?.gender as any) || 'Male') as 'Male' | 'Female' | 'Other');
    setEditAddress(user?.address || '');
    setEditState(user?.state || 'Maharashtra');
    setEditDistrict(user?.district || '');
    setEditTaluka(user?.taluka || '');
    setEditPincode(user?.pincode || '');
    setEditEmail(user?.email || '');
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    setIsEditModalVisible(true);
  };

  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setEditDob(formatted);
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setEditPincode(cleaned);
  };

  const handleSelectDistrict = (selectedDistrict: string) => {
    setEditDistrict(selectedDistrict);
    setEditTaluka('');
    setEditPincode('');
  };

  const handleSelectTaluka = (selectedTaluka: string) => {
    setEditTaluka(selectedTaluka);
    setEditPincode('');
  };

  const handleSaveProfile = async () => {
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    if (!editName.trim()) {
      setSaveErrorMsg(t('validationRequired') + ' (' + t('fullNameLabel') + ')');
      return;
    }
    if (editDob.trim() && editDob.trim().length < 8) {
      setSaveErrorMsg(t('validationDob'));
      return;
    }
    if (editDistrict.trim() && !locationDirectoryService.isValidDistrict(editDistrict)) {
      setSaveErrorMsg('Please select a valid district from Maharashtra.');
      return;
    }
    if (editTaluka.trim() && !locationDirectoryService.isValidTaluka(editDistrict, editTaluka)) {
      setSaveErrorMsg('Please select a valid taluka for the selected district.');
      return;
    }
    if (editPincode.trim() && (editPincode.trim().length !== 6 || !/^[1-9][0-9]{5}$/.test(editPincode.trim()))) {
      setSaveErrorMsg(t('validationPincode'));
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        name: editName.trim(),
        dob: editDob.trim() || undefined,
        gender: editGender,
        address: editAddress.trim() || undefined,
        state: editState.trim() || 'Maharashtra',
        district: editDistrict.trim() || undefined,
        taluka: editTaluka.trim() || undefined,
        pincode: editPincode.trim() || undefined,
        email: editEmail.trim() || undefined,
      });

      setSaveSuccessMsg(t('profileUpdatedSuccess'));
      setTimeout(() => {
        setIsEditModalVisible(false);
        setSaveSuccessMsg('');
      }, 700);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveErrorMsg('Update failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('profileTitle')} subtitle={t('profileSubtitle')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Identity Card with Edit Button */}
        <AppCard style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={colors.citizen.primary} />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[typography.h2, { color: colors.textPrimary, flex: 1 }]}>
                  {user?.name}
                </Text>
                <TouchableOpacity
                  style={styles.editPillBtn}
                  onPress={handleOpenEdit}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pencil" size={13} color={colors.citizen.primary} />
                  <Text style={styles.editPillBtnText}>{t('editProfileBtn')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('phone')} {user?.phoneNumber}
              </Text>
              {user?.dob ? (
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                  🎂 {t('dobLabel')}: {formatToDdMmYyyy(user.dob)}
                </Text>
              ) : null}
              <Text style={[typography.caption, { color: colors.citizen.primary, fontWeight: '700', marginTop: 1 }]}>
                {t('abha')} {user?.abhaId || '-'}
              </Text>
              {(user?.district || user?.address) && (
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  📍 {user?.address ? `${user.address}, ` : ''}
                  {user?.taluka ? `${locationDirectoryService.resolveTalukaDisplay(user.taluka, language)}, ` : ''}
                  {user?.district ? locationDirectoryService.resolveDistrictDisplay(user.district, language) : ''}{' '}
                  {user?.pincode ? `(${user.pincode})` : ''}
                </Text>
              )}
            </View>
          </View>
        </AppCard>

        {/* App Settings / Language Preference */}
        <View style={styles.section}>
          <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            {t('appSettings')}
          </Text>
          <TouchableOpacity
            style={styles.languageCard}
            activeOpacity={0.75}
            onPress={() => setIsLangModalOpen(true)}
          >
            <View style={styles.languageLeft}>
              <View style={styles.langIconCircle}>
                <Ionicons name="globe-outline" size={20} color={colors.citizen.primary} />
              </View>
              <View style={styles.languageTextCol}>
                <Text style={styles.langTitleText}>{t('appLanguage')}</Text>
                <Text style={styles.langSubText}>
                  {language === 'mr'
                    ? 'सध्या: मराठी • भाषा बदलण्यासाठी टॅप करा'
                    : language === 'en'
                    ? 'Current: English • Tap to change language'
                    : 'वर्तमान: हिंदी • भाषा बदलने के लिए टैप करें'}
                </Text>
              </View>
            </View>
            <View style={styles.currentLangPill}>
              <Text style={styles.currentLangPillText}>
                {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
              </Text>
              <Ionicons name="swap-horizontal" size={16} color={colors.citizen.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support & Logout Actions */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() => setShowLogoutModal(true)}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutBtnText}>{t('logoutAccount')}</Text>
        </TouchableOpacity>

        {/* App Version & Build Info Footer */}
        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={14} color="#0A5C53" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
              {APP_CONFIG.APP_NAME} ({APP_CONFIG.APP_NAME_HINDI})
            </Text>
          </View>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, fontWeight: '600' }}>
            Version {APP_CONFIG.VERSION} • Build 2026.09 (Release)
          </Text>
          <Text style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>
            सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन (Govt. of Maharashtra)
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Details Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentWrapper}
          >
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Text style={styles.modalTitle}>{t('editProfile')}</Text>
                  <Text style={styles.modalSubtitle}>{t('registerSubtitle')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#556966" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
              >
                {/* Non-editable Mobile Number (Security Notice) */}
                <View style={styles.lockedPhoneBox}>
                  <View style={styles.lockIconBox}>
                    <Ionicons name="lock-closed" size={18} color="#4A5568" />
                  </View>
                  <View style={styles.lockedPhoneInfo}>
                    <Text style={styles.lockedPhoneLabel}>{t('mobileNumber')}</Text>
                    <Text style={styles.lockedPhoneNumber}>+91 {user?.phoneNumber}</Text>
                    <Text style={styles.lockedPhoneNotice}>
                      🔒 {t('mobileCantBeChanged')}
                    </Text>
                  </View>
                </View>

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('fullNameLabel')} <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="person-outline" size={18} color="#7A8B88" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('fullNamePlaceholder')}
                      placeholderTextColor="#9EAFA8"
                      value={editName}
                      onChangeText={setEditName}
                    />
                  </View>
                </View>

                {/* DOB */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('dobLabel')}</Text>
                  <View style={styles.inputBox}>
                    <TouchableOpacity
                      onPress={() => setDobPickerVisible(true)}
                      style={styles.calendarIconBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="calendar" size={19} color="#0A5C53" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.input}
                      placeholder={t('dobPlaceholder') || 'DD/MM/YYYY'}
                      placeholderTextColor="#9EAFA8"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={editDob}
                      onChangeText={handleDobChange}
                    />
                    <TouchableOpacity
                      style={styles.pickDateBtn}
                      onPress={() => setDobPickerVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pickDateBtnText}>
                        {language === 'mr' ? 'तारीख निवडा' : language === 'hi' ? 'तिथि चुनें' : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Gender */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('gender')}</Text>
                  <View style={styles.genderRow}>
                    {(['Male', 'Female', 'Other'] as const).map((opt) => {
                      const isSelected = editGender === opt;
                      const labelKey =
                        opt === 'Male' ? 'genderMale' : opt === 'Female' ? 'genderFemale' : 'genderOther';
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.genderChip, isSelected && styles.genderChipActive]}
                          onPress={() => setEditGender(opt)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={
                              opt === 'Male'
                                ? 'man-outline'
                                : opt === 'Female'
                                ? 'woman-outline'
                                : 'person-outline'
                            }
                            size={16}
                            color={isSelected ? '#FFFFFF' : '#4B635F'}
                          />
                          <Text style={[styles.genderChipText, isSelected && styles.genderChipTextActive]}>
                            {t(labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('addressLabel')}</Text>
                  <View style={[styles.inputBox, styles.textAreaBox]}>
                    <Ionicons
                      name="home-outline"
                      size={18}
                      color="#7A8B88"
                      style={[styles.fieldIcon, { alignSelf: 'flex-start', marginTop: 12 }]}
                    />
                    <TextInput
                      style={[styles.input, styles.textAreaInput]}
                      placeholder={t('addressPlaceholder')}
                      placeholderTextColor="#9EAFA8"
                      multiline
                      numberOfLines={2}
                      value={editAddress}
                      onChangeText={setEditAddress}
                    />
                  </View>
                </View>

                {/* State & District */}
                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t('stateLabel')}</Text>
                    <View style={[styles.inputBox, styles.inputBoxReadOnly]}>
                      <TextInput
                        style={[styles.input, styles.inputReadOnly]}
                        placeholder="Maharashtra"
                        placeholderTextColor="#9EAFA8"
                        value={editState || 'Maharashtra'}
                        editable={false}
                      />
                      <Ionicons name="lock-closed-outline" size={15} color="#9EAFA8" />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t('districtLabel')}</Text>
                    <TouchableOpacity
                      style={[styles.inputBox, styles.selectBox]}
                      activeOpacity={0.7}
                      onPress={() => setDistrictModalVisible(true)}
                    >
                      <Text
                        style={[
                          styles.selectValueText,
                          !editDistrict && styles.selectPlaceholderText,
                        ]}
                        numberOfLines={1}
                      >
                        {editDistrict
                          ? locationDirectoryService.resolveDistrictDisplay(editDistrict, language)
                          : t('districtPlaceholder')}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#7A8B88" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Taluka & Pincode */}
                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t('talukaLabel')}</Text>
                    <TouchableOpacity
                      style={[
                        styles.inputBox,
                        styles.selectBox,
                        !editDistrict && styles.inputBoxDisabled,
                      ]}
                      activeOpacity={!editDistrict ? 1 : 0.7}
                      onPress={() => {
                        if (editDistrict) setTalukaModalVisible(true);
                      }}
                      disabled={!editDistrict}
                    >
                      <Text
                        style={[
                          styles.selectValueText,
                          !editTaluka && styles.selectPlaceholderText,
                          !editDistrict && styles.selectDisabledText,
                        ]}
                        numberOfLines={1}
                      >
                        {!editDistrict
                          ? 'Select District First'
                          : editTaluka
                          ? locationDirectoryService.resolveTalukaDisplay(editTaluka, language)
                          : t('talukaPlaceholder')}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={!editDistrict ? '#CBD5E1' : '#7A8B88'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t('pincodeLabel')}</Text>
                    <View style={[styles.inputBox, !editTaluka && styles.inputBoxDisabled]}>
                      <TextInput
                        style={[styles.input, !editTaluka && styles.inputDisabled]}
                        placeholder={!editTaluka ? 'Select Taluka' : '421301'}
                        placeholderTextColor="#9EAFA8"
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!!editTaluka}
                        value={editPincode}
                        onChangeText={handlePincodeChange}
                      />
                    </View>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('emailLabel')}</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="mail-outline" size={18} color="#7A8B88" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('emailPlaceholder')}
                      placeholderTextColor="#9EAFA8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={editEmail}
                      onChangeText={setEditEmail}
                    />
                  </View>
                </View>

                {/* Messages */}
                {saveErrorMsg ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#C53030" />
                    <Text style={styles.errorText}>{saveErrorMsg}</Text>
                  </View>
                ) : null}

                {saveSuccessMsg ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#276749" />
                    <Text style={styles.successText}>{saveSuccessMsg}</Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Fixed Bottom Action Bar above Android navigation bar / gesture pill */}
              <View style={[styles.modalActionsFooter, { paddingBottom: bottomInset + 6 }]}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelModalBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveModalBtn, isSaving && styles.saveModalBtnDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.saveModalBtnText}>{t('saveChanges')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />

      {/* Custom Logout Confirmation Popup */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
      />

      {/* Searchable Modal for District Selection */}
      <SearchableSelectModal
        visible={districtModalVisible}
        title={`${t('districtLabel')} (${editState || 'Maharashtra'})`}
        placeholder="Type district name (e.g. Pune, Palghar)..."
        items={locationDirectoryService.getStructuredDistricts(language)}
        selectedValue={editDistrict}
        onSelect={handleSelectDistrict}
        onClose={() => setDistrictModalVisible(false)}
        prefixMatch={true}
      />

      {/* Searchable Modal for Taluka Selection */}
      <SearchableSelectModal
        visible={talukaModalVisible}
        title={`${t('talukaLabel')} (${editDistrict ? locationDirectoryService.resolveDistrictDisplay(editDistrict, language) : ''})`}
        placeholder="Type taluka name..."
        items={editDistrict ? locationDirectoryService.getStructuredTalukas(editDistrict, language) : []}
        selectedValue={editTaluka}
        onSelect={handleSelectTaluka}
        onClose={() => setTalukaModalVisible(false)}
        prefixMatch={true}
      />

      {/* Date of Birth Picker Modal */}
      <DatePickerModal
        visible={dobPickerVisible}
        value={editDob}
        onConfirm={(formattedDate) => {
          setEditDob(formattedDate);
          if (saveErrorMsg) setSaveErrorMsg('');
        }}
        onClose={() => setDobPickerVisible(false)}
        title={t('dobLabel')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    padding: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.citizen.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#C6DDD8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.citizen.primary,
  },
  section: {
    marginTop: spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  langIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageTextCol: {
    flex: 1,
  },
  langTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  currentLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C6DDD8',
  },
  currentLangPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.citizen.primary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.base,
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F2',
  },
  modalHeaderTitleBox: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  lockedPhoneBox: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedPhoneInfo: {
    flex: 1,
  },
  lockedPhoneLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
  },
  lockedPhoneNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
    marginTop: 1,
  },
  lockedPhoneNotice: {
    fontSize: 11,
    color: '#718096',
    marginTop: 3,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#C53030',
    fontWeight: '800',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    minHeight: 46,
  },
  textAreaBox: {
    alignItems: 'flex-start',
    minHeight: 70,
  },
  fieldIcon: {
    marginRight: 8,
  },
  calendarIconBtn: {
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickDateBtn: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  pickDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  textAreaInput: {
    textAlignVertical: 'top',
    height: 60,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    backgroundColor: '#FAFCFC',
  },
  genderChipActive: {
    backgroundColor: colors.citizen.primary,
    borderColor: colors.citizen.primary,
  },
  genderChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B635F',
  },
  genderChipTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#C53030',
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#9AE6B4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: '#22543D',
    fontWeight: '700',
  },
  modalActionsFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF4F2',
    backgroundColor: '#FFFFFF',
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    backgroundColor: '#F7FAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveModalBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.citizen.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveModalBtnDisabled: {
    opacity: 0.7,
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectBox: {
    justifyContent: 'space-between',
  },
  selectValueText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    marginRight: 6,
  },
  selectPlaceholderText: {
    color: '#9EAFA8',
    fontWeight: '400',
  },
  selectDisabledText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  inputBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputDisabled: {
    color: '#94A3B8',
  },
  inputBoxReadOnly: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  inputReadOnly: {
    color: '#334155',
    fontWeight: '600',
  },
});
