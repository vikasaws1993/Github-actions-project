import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthStackParamList } from '../types/auth.types';
import { colors } from '../../shared/theme/colors';
import { useAuth } from '../../shared/hooks/useAuth';
import { useLanguage } from '../../shared/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchableSelectModal } from '../../shared/components/SearchableSelectModal';
import { DatePickerModal } from '../../shared/components/DatePickerModal';
import { locationDirectoryService } from '../../shared/services/locationDirectoryService';

type Props = NativeStackScreenProps<AuthStackParamList, 'CitizenRegister'>;

export const CitizenRegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phoneNumber } = route.params || { phoneNumber: '' };
  const { registerCitizen, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [dist, setDist] = useState('');
  const [tal, setTal] = useState('');
  const [pincode, setPincode] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Location Autocomplete Modals
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [talukaModalVisible, setTalukaModalVisible] = useState(false);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const handleDobChange = (text: string) => {
    // Automatically add slashes if user types numbers: DDMMYYYY -> DD/MM/YYYY
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  // Cascading Location Selection Handlers
  const handleSelectDistrict = (selectedDistrict: string) => {
    setDist(selectedDistrict);
    // Reset child fields
    setTal('');
    setPincode('');
  };

  const handleSelectTaluka = (selectedTaluka: string) => {
    setTal(selectedTaluka);
    // Reset pincode if taluka changed
    setPincode('');
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(t('validationRequired') + ' (' + t('fullNameLabel') + ')');
      return;
    }
    if (!dob.trim() || dob.trim().length < 8) {
      setErrorMessage(t('validationDob'));
      return;
    }
    if (!address.trim()) {
      setErrorMessage(t('validationRequired') + ' (' + t('addressLabel') + ')');
      return;
    }
    if (!dist.trim() || !locationDirectoryService.isValidDistrict(dist)) {
      setErrorMessage(t('validationRequired') + ' (' + t('districtLabel') + ')');
      return;
    }
    if (!tal.trim() || !locationDirectoryService.isValidTaluka(dist, tal)) {
      setErrorMessage(t('validationRequired') + ' (' + t('talukaLabel') + ')');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6 || !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setErrorMessage(t('validationPincode'));
      return;
    }

    try {
      await registerCitizen({
        phoneNumber,
        name: name.trim(),
        dob: dob.trim(),
        gender,
        address: address.trim(),
        state: state.trim() || 'Maharashtra',
        district: dist.trim(),
        taluka: tal.trim(),
        pincode: pincode.trim(),
        email: email.trim() || undefined,
      });
      // Once registerCitizen resolves, RootNavigator detects authenticated citizen
      // and immediately renders CitizenNavigator (Citizen home screen).
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMessage(t('registrationFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('registerTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('registerSubtitle')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Phone Badge Card */}
          <View style={styles.verifiedPhoneCard}>
            <View style={styles.phoneIconBox}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.citizen.primary} />
            </View>
            <View style={styles.verifiedTextCol}>
              <Text style={styles.verifiedLabel}>{t('verifiedPhone')}</Text>
              <Text style={styles.verifiedNumber}>+91 {phoneNumber}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#0D8A58" />
              <Text style={styles.verifiedBadgeText}>{t('verified')}</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
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
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Date of Birth & Gender Row */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('dobLabel')} <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
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
                  value={dob}
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

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('gender')} <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map((opt) => {
                  const isSelected = gender === opt;
                  const labelKey =
                    opt === 'Male' ? 'genderMale' : opt === 'Female' ? 'genderFemale' : 'genderOther';
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.genderChip, isSelected && styles.genderChipActive]}
                      onPress={() => setGender(opt)}
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
                      <Text
                        style={[styles.genderChipText, isSelected && styles.genderChipTextActive]}
                      >
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Full Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('addressLabel')} <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
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
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* State & District Row */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('stateLabel')} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.inputBox, styles.inputBoxReadOnly]}>
                  <TextInput
                    style={[styles.input, styles.inputReadOnly]}
                    placeholder="Maharashtra"
                    placeholderTextColor="#9EAFA8"
                    value={state}
                    editable={false}
                  />
                  <Ionicons name="lock-closed-outline" size={15} color="#9EAFA8" />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('districtLabel')} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputBox, styles.selectBox]}
                  activeOpacity={0.7}
                  onPress={() => setDistrictModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.selectValueText,
                      !dist && styles.selectPlaceholderText,
                    ]}
                    numberOfLines={1}
                  >
                    {dist
                      ? locationDirectoryService.resolveDistrictDisplay(dist, language)
                      : t('districtPlaceholder')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#7A8B88" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Taluka & Pincode Row */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('talukaLabel')} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputBox,
                    styles.selectBox,
                    !dist && styles.inputBoxDisabled,
                  ]}
                  activeOpacity={!dist ? 1 : 0.7}
                  onPress={() => {
                    if (dist) setTalukaModalVisible(true);
                  }}
                  disabled={!dist}
                >
                  <Text
                    style={[
                      styles.selectValueText,
                      !tal && styles.selectPlaceholderText,
                      !dist && styles.selectDisabledText,
                    ]}
                    numberOfLines={1}
                  >
                    {!dist
                      ? t('selectDistrictFirst')
                      : tal
                      ? locationDirectoryService.resolveTalukaDisplay(tal, language)
                      : t('talukaPlaceholder')}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={!dist ? '#CBD5E1' : '#7A8B88'}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('pincodeLabel')} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.inputBox, !tal && styles.inputBoxDisabled]}>
                  <TextInput
                    style={[styles.input, !tal && styles.inputDisabled]}
                    placeholder={!tal ? t('selectTalukaFirst') : '421301'}
                    placeholderTextColor="#9EAFA8"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!!tal}
                    value={pincode}
                    onChangeText={handlePincodeChange}
                  />
                </View>
              </View>
            </View>

            {/* Email (Optional) */}
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
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Error banner if any */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#C53030" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>{t('registerSubmitBtn')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Searchable Modal for District Selection */}
      <SearchableSelectModal
        visible={districtModalVisible}
        title={`${t('districtLabel')} (${state})`}
        placeholder={t('typeDistrictPlaceholder')}
        items={locationDirectoryService.getStructuredDistricts(language)}
        selectedValue={dist}
        onSelect={handleSelectDistrict}
        onClose={() => setDistrictModalVisible(false)}
        prefixMatch={true}
      />

      {/* Searchable Modal for Taluka Selection */}
      <SearchableSelectModal
        visible={talukaModalVisible}
        title={`${t('talukaLabel')} (${dist ? locationDirectoryService.resolveDistrictDisplay(dist, language) : ''})`}
        placeholder={t('typeTalukaPlaceholder')}
        items={dist ? locationDirectoryService.getStructuredTalukas(dist, language) : []}
        selectedValue={tal}
        onSelect={handleSelectTaluka}
        onClose={() => setTalukaModalVisible(false)}
        prefixMatch={true}
      />

      {/* Date of Birth Picker Modal */}
      <DatePickerModal
        visible={dobPickerVisible}
        value={dob}
        onConfirm={(formattedDate) => {
          setDob(formattedDate);
          if (errorMessage) setErrorMessage('');
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
    backgroundColor: '#F4F8F7',
  },
  headerBar: {
    backgroundColor: colors.citizen.primary,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E0F2EE',
    marginTop: 2,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  verifiedPhoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    gap: 12,
  },
  phoneIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTextCol: {
    flex: 1,
  },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  verifiedNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D8A58',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
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
    minHeight: 48,
  },
  textAreaBox: {
    alignItems: 'flex-start',
    minHeight: 74,
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
    paddingVertical: 6,
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
    paddingVertical: 10,
  },
  textAreaInput: {
    textAlignVertical: 'top',
    height: 64,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    minWidth: '28%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    fontSize: 13,
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
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#C53030',
    fontWeight: '600',
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.citizen.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
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
