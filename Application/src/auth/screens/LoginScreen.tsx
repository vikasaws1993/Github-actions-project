import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthStackParamList } from '../types/auth.types';
import { colors } from '../../shared/theme/colors';
import { useLanguage } from '../../shared/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageModal } from '../../shared/components/LanguageModal';
import { useAuth } from '../../shared/hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, language } = useLanguage();
  const { sendOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const isPhoneValid = phoneNumber.trim().length === 10;

  const handleSendOtp = async () => {
    if (!isPhoneValid || isSending) return;
    setErrorMessage('');
    setIsSending(true);

    try {
      const result = await sendOtp(phoneNumber.trim());

      if (result.role === 'ADMIN' || !result.isAllowedOnMobile) {
        setErrorMessage(result.message || 'Admin login is not allowed on Mobile App. Please use the Web Admin Portal / अॅडमिन ला मोबाईल अॅपवर लॉगिन करण्याची परवानगी नाही.');
        return;
      }

      if (result.success) {
        navigation.navigate('OtpVerification', {
          phoneNumber: phoneNumber.trim(),
          serverOtp: result.otp || '123456',
          role: result.role,
          isRegistered: result.isRegistered,
        } as any);
      } else {
        setErrorMessage(result.message || 'Could not send OTP');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickFill = (num: string) => {
    setPhoneNumber(num);
    setErrorMessage('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerContent}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../../assets/arogya_mitra_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>{t('appName')}</Text>
          </View>

          {/* Language Selection Dropdown */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select language"
          >
            <Ionicons name="globe-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.langText}>
              {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255, 255, 255, 0.9)" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t('loginTitle')}</Text>
            <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

            {/* Error Message Banner if Admin or Error */}
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Mobile Input Group */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('mobileNumber')}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.divider} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('mobilePlaceholder')}
                  placeholderTextColor="#A0B0AD"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setPhoneNumber(val);
                    setErrorMessage('');
                  }}
                />
              </View>
            </View>

            {/* Primary Action Button - Enabled only when 10 digits are complete */}
            <TouchableOpacity
              style={[
                styles.otpButton,
                isPhoneValid && !isSending ? styles.otpButtonActive : styles.otpButtonDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={!isPhoneValid || isSending}
              activeOpacity={isPhoneValid ? 0.85 : 1}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.otpButtonText}>{t('sendOtp')}</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Test Numbers Helper */}
            <View style={styles.testSection}>
              <Text style={styles.testSectionTitle}>⚡ {t('testAccountGuide')}</Text>
              <View style={styles.testPillsRow}>
                <TouchableOpacity
                  style={[styles.testPill, phoneNumber === '1111111111' && styles.testPillActive]}
                  onPress={() => handleQuickFill('1111111111')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.testPillText, phoneNumber === '1111111111' && styles.testPillTextActive]}>
                    👤 1111111111 (Citizen)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testPill, phoneNumber === '2222222222' && styles.testPillActive]}
                  onPress={() => handleQuickFill('2222222222')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.testPillText, phoneNumber === '2222222222' && styles.testPillTextActive]}>
                    🩺 2222222222 (Sevak)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testPill, phoneNumber === '9999999999' && styles.testPillActive]}
                  onPress={() => handleQuickFill('9999999999')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.testPillText, phoneNumber === '9999999999' && styles.testPillTextActive]}>
                    🚫 9999999999 (Admin)
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.testHintSub}>
                ℹ️ {t('testNewCitizenHint')}
              </Text>
            </View>

            {/* Helpline Card */}
            <View style={styles.helplineBox}>
              <View style={styles.phoneIconCircle}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helplineTextCol}>
                <Text style={styles.helplineTitle}>{t('helpline')}</Text>
                <Text style={styles.helplineSub}>{t('helplineHours')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: '#F4F8F7',
  },
  headerBar: {
    backgroundColor: colors.citizen.primary,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  langText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 18,
    lineHeight: 17,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  countryCode: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#D0E2DF',
    marginHorizontal: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  otpButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  otpButtonDisabled: {
    backgroundColor: '#95B7B0',
  },
  otpButtonActive: {
    backgroundColor: colors.citizen.primary,
  },
  otpButtonText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  helplineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.citizen.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineTextCol: {
    flex: 1,
  },
  helplineTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helplineSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  testSection: {
    backgroundColor: '#F0F7F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6DDD8',
    padding: 10,
    marginBottom: 16,
  },
  testSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.citizen.primary,
    marginBottom: 6,
  },
  testPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  testPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C6DDD8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPillActive: {
    backgroundColor: colors.citizen.primary,
    borderColor: colors.citizen.primary,
  },
  testPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  testPillTextActive: {
    color: '#FFFFFF',
  },
  testHintSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#991B1B',
    lineHeight: 15,
  },
});

export default LoginScreen;
