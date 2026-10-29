import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthStackParamList } from '../types/auth.types';
import { UserRole } from '../../shared/constants/roles';
import { colors } from '../../shared/theme/colors';
import { useAuth } from '../../shared/hooks/useAuth';
import { useLanguage } from '../../shared/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

export const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phoneNumber = '1111111111', serverOtp = '123456', role: routeRole, isRegistered: routeIsRegistered } = (route.params as any) || {};
  const { verifyOtpAndResolve, sendOtp } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [currentOtp, setCurrentOtp] = useState(serverOtp || '123456');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(300); // 5-minute countdown (300s)
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<any>(null);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const isOtpValid = otp.trim().length === 6;
  const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
  const isSevak = routeRole === 'AROGYA_SEVAK' || cleanNumber === '2222222222';
  const isCitizen = routeRole === 'CITIZEN' || (routeIsRegistered && cleanNumber !== '2222222222');

  // Format seconds to MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 5-minute countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Automatically pop up soft keyboard on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Blinking cursor in active cell when focused
  useEffect(() => {
    if (!isFocused || otp.length >= 6) {
      setCursorVisible(false);
      return;
    }
    setCursorVisible(true);
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [isFocused, otp.length]);

  const handleVerify = async () => {
    if (!isOtpValid || isVerifying) return;
    setErrorMessage('');
    setIsVerifying(true);
    try {
      const result = await verifyOtpAndResolve(phoneNumber, otp.trim());

      if (result.status === 'NEW_CITIZEN') {
        // First-time citizen -> Direct to Registration Form
        navigation.navigate('CitizenRegister', {
          phoneNumber: result.phoneNumber,
        });
      }
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      setErrorMessage(err?.message || 'Invalid OTP code. Please enter the correct 6-digit OTP / अमान्य OTP. कृपया बरोबर ६ अंकी OTP टाका.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');
    try {
      const result = await sendOtp(phoneNumber);
      if (result.success && result.otp) {
        setCurrentOtp(result.otp);
        setResendCountdown(300); // Reset 5-minute timer
        setOtp('');
      } else {
        setErrorMessage(result.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Teal Header with Safe Area Insets */}
      <View style={[styles.headerBar, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity
          style={styles.changeNumberRow}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.changeNumberText}>{t('changeNumber')}</Text>
        </TouchableOpacity>
      </View>

      {/* Body Card */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t('otpTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('otpSubtitle')}{' '}
              <Text style={styles.phoneBold}>+91 {phoneNumber}</Text>
            </Text>

            {/* Error Banner */}
            {!!errorMessage && (
              <View style={styles.errorBadge}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBadgeText}>{errorMessage}</Text>
              </View>
            )}

            {/* OTP Box Container with 6 Distinct Responsive Cells & Active Indicators */}
            <View style={styles.otpOuterWrapper}>
              <View style={styles.otpBoxesRow}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = otp[index];
                  const isCurrent = isFocused && index === Math.min(otp.length, 5) && otp.length < 6;
                  const isFilled = index < otp.length;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpCell,
                        isFilled && styles.otpCellFilled,
                        isCurrent && styles.otpCellActive,
                      ]}
                    >
                      {char ? (
                        <Text style={styles.digitText} allowFontScaling={false}>{char}</Text>
                      ) : isCurrent ? (
                        cursorVisible ? (
                          <View style={styles.blinkingCursor} />
                        ) : (
                          <View style={styles.cursorSpace} />
                        )
                      ) : (
                        <View style={styles.dotPlaceholder} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Transparent Native TextInput Overlaid Directly on Top of the 6 Boxes */}
              <TextInput
                ref={inputRef}
                style={styles.overlayInput}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                value={otp}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(clean);
                  setErrorMessage('');
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoFocus
                caretHidden
              />
            </View>

            {/* Active Typing Status / Visual Hint */}
            <View style={styles.activeHintContainer}>
              {isFocused && otp.length < 6 ? (
                <View style={styles.typingStatusPill}>
                  <View style={styles.pulsingGreenDot} />
                  <Text style={styles.typingStatusText}>
                    {otp.length === 0
                      ? 'Active — type 6-digit OTP'
                      : `Active — ${otp.length} of 6 digits entered`}
                  </Text>
                </View>
              ) : otp.length === 6 ? (
                <View style={styles.completeStatusPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.completeStatusText}>6 Digits Entered</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => inputRef.current?.focus()}
                  style={styles.tapToActivateRow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="keypad-outline" size={13} color="#64748B" />
                  <Text style={styles.tapToActivateText}>Tap boxes to enter OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Auto-fillable Server Generated OTP Card */}
            <TouchableOpacity
              onPress={() => setOtp(currentOtp)}
              activeOpacity={0.75}
              style={styles.demoOtpTap}
            >
              <View style={styles.otpPillBox}>
                <Ionicons name="key-outline" size={14} color={colors.citizen.primary} />
                <Text style={styles.demoText}>
                  Your OTP Code: <Text style={styles.otpCodeBold}>{currentOtp}</Text>
                </Text>
                <Text style={styles.tapToFillText}>(Tap to fill)</Text>
              </View>
            </TouchableOpacity>

            {/* User Type Preview Banner */}
            <View style={[styles.rolePreviewBadge, isSevak ? styles.sevakBadge : isCitizen ? styles.citizenBadge : styles.newCitizenBadge]}>
              <Ionicons
                name={isSevak ? 'medical' : isCitizen ? 'person-circle' : 'create-outline'}
                size={16}
                color={isSevak ? '#1A365D' : isCitizen ? '#1A4731' : '#744210'}
              />
              <Text style={[styles.rolePreviewText, isSevak ? styles.sevakText : isCitizen ? styles.citizenText : styles.newCitizenText]}>
                {isSevak
                  ? '🩺 Arogya Sevak Account (Direct Dashboard)'
                  : isCitizen
                  ? '👤 Registered Citizen (Direct Dashboard)'
                  : '📝 First-time Citizen (Proceeds to Registration)'}
              </Text>
            </View>

            {/* Verify Button - Enabled only when 6 digits are complete */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                isOtpValid && !isVerifying ? styles.verifyButtonActive : styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!isOtpValid || isVerifying}
              activeOpacity={isOtpValid ? 0.85 : 1}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>{t('verifyOtp')}</Text>
              )}
            </TouchableOpacity>

            {/* Resend Link with 5-minute Countdown Timer */}
            <TouchableOpacity
              style={[styles.resendButton, resendCountdown > 0 && { opacity: 0.6 }]}
              onPress={handleResend}
              disabled={resendCountdown > 0 || isResending}
              activeOpacity={0.7}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={colors.citizen.primary} />
              ) : resendCountdown > 0 ? (
                <Text style={styles.resendTextDisabled}>
                  Resend OTP in <Text style={styles.timerTextBold}>{formatTimer(resendCountdown)}</Text>
                </Text>
              ) : (
                <Text style={styles.resendText}>{t('resendOtp')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  changeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  changeNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  phoneBold: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  otpOuterWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.citizen.primary,
    borderWidth: 1.5,
  },
  otpCellActive: {
    backgroundColor: '#F0FDFA',
    borderColor: colors.citizen.primary,
    borderWidth: 2.5,
    shadowColor: colors.citizen.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  digitText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  blinkingCursor: {
    width: 2.5,
    height: 24,
    backgroundColor: colors.citizen.primary,
    borderRadius: 1,
  },
  cursorSpace: {
    width: 2.5,
    height: 24,
  },
  dotPlaceholder: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  overlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  activeHintContainer: {
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 22,
    justifyContent: 'center',
  },
  typingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  pulsingGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  typingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  completeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  tapToActivateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  tapToActivateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  demoOtpTap: {
    paddingVertical: 4,
    marginBottom: 12,
  },
  demoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tapToFillText: {
    color: colors.citizen.primary,
    fontWeight: '700',
  },
  rolePreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  rolePreviewText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sevakBadge: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  sevakText: {
    color: '#2B6CB0',
  },
  citizenBadge: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  citizenText: {
    color: '#22543D',
  },
  newCitizenBadge: {
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#FEEBC8',
  },
  newCitizenText: {
    color: '#744210',
  },
  verifyButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#95B7B0',
  },
  verifyButtonActive: {
    backgroundColor: colors.citizen.primary,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.citizen.primary,
  },
  resendTextDisabled: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timerTextBold: {
    fontWeight: '800',
    color: colors.citizen.primary,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorBadgeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  otpPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E6F4F1',
    borderColor: '#B0D8D0',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  otpCodeBold: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.citizen.primary,
    letterSpacing: 1.5,
  },
});
