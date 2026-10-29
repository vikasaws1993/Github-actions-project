import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../context/LanguageContext';
import { AppLanguage, InputLanguage } from '../types/i18n.types';
import { colors } from '../theme/colors';

export interface LanguageConfirmationModalProps {
  visible: boolean;
  appLanguage: AppLanguage;
  detectedLanguage: InputLanguage;
  sampleText?: string;
  isMixed?: boolean;
  onContinue: () => void;
  onSwitchAppLanguage?: (targetLang: AppLanguage) => void;
  onClose?: () => void;
}

export const LanguageConfirmationModal: React.FC<LanguageConfirmationModalProps> = ({
  visible,
  appLanguage,
  detectedLanguage,
  sampleText,
  isMixed = false,
  onContinue,
  onSwitchAppLanguage,
  onClose,
}) => {
  const { t, setLanguage } = useLanguage();

  if (!visible) return null;

  const getLanguageDisplayName = (lang: string): string => {
    switch (lang) {
      case 'mr':
        return t('langNameMarathi') || 'मराठी';
      case 'hi':
        return t('langNameHindi') || 'हिंदी';
      case 'en':
        return t('langNameEnglish') || 'English';
      case 'mixed':
        return t('langNameMixed') || 'मिश्र भाषा';
      default:
        return lang;
    }
  };

  const appLangName = getLanguageDisplayName(appLanguage);
  const detectedLangName = getLanguageDisplayName(detectedLanguage);

  const canSwitchApp =
    !isMixed &&
    (detectedLanguage === 'mr' || detectedLanguage === 'hi' || detectedLanguage === 'en') &&
    detectedLanguage !== appLanguage;

  const handleSwitchLanguage = () => {
    if (canSwitchApp && onSwitchAppLanguage) {
      onSwitchAppLanguage(detectedLanguage as AppLanguage);
    } else if (canSwitchApp) {
      setLanguage(detectedLanguage as AppLanguage);
      onContinue();
    }
  };

  const mismatchMessage = (t('langMismatchMessage') || '')
    .replace('{appLang}', appLangName)
    .replace('{detectedLang}', detectedLangName);

  const switchBtnLabel = (t('langSwitchAppBtn') || '')
    .replace('{targetLang}', detectedLangName);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onContinue}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={isMixed ? 'information-circle' : 'globe-outline'}
                size={22}
                color="#0284C7"
              />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>
                {t('langConfirmTitle') || 'भाषा सूचना'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('langNoticeSubtitle') || 'नोंदवलेल्या मजकुराची भाषा माहिती'}
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Language Status Chips */}
          <View style={styles.chipsContainer}>
            <View style={styles.chipItem}>
              <Text style={styles.chipLabel}>{t('langCurrentAppLabel') || 'ॲप भाषा'}</Text>
              <View style={styles.chipBadge}>
                <Ionicons name="phone-portrait-outline" size={12} color="#0369A1" />
                <Text style={styles.chipBadgeText}>{appLangName}</Text>
              </View>
            </View>

            <Ionicons name="arrow-forward" size={16} color="#94A3B8" style={{ marginTop: 14 }} />

            <View style={styles.chipItem}>
              <Text style={styles.chipLabel}>{t('langDetectedContentLabel') || 'मजकूर भाषा'}</Text>
              <View style={[styles.chipBadge, isMixed ? styles.chipBadgeMixed : styles.chipBadgeDetected]}>
                <Ionicons
                  name={isMixed ? 'shuffle-outline' : 'text-outline'}
                  size={12}
                  color={isMixed ? '#059669' : '#D97706'}
                />
                <Text style={[styles.chipBadgeText, isMixed ? styles.chipTextMixed : styles.chipTextDetected]}>
                  {detectedLangName}
                </Text>
              </View>
            </View>
          </View>

          {/* Contextual Guidance Body */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {isMixed ? t('langMixedMessage') : mismatchMessage}
            </Text>
          </View>

          {/* Sample Text Preview */}
          {sampleText && sampleText.trim().length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>{t('langPreviewLabel') || 'मजकूर पूर्वावलोकन'}:</Text>
              <Text style={styles.previewText} numberOfLines={2} ellipsizeMode="tail">
                "{sampleText.trim()}"
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {canSwitchApp && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSwitchLanguage}
                activeOpacity={0.8}
              >
                <Ionicons name="language-outline" size={16} color="#0284C7" />
                <Text style={styles.secondaryBtnText}>{switchBtnLabel}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {t('langContinueBtn') || 'पुढे चला'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItem: {
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  chipBadgeDetected: {
    backgroundColor: '#FEF3C7',
  },
  chipBadgeMixed: {
    backgroundColor: '#DCFCE7',
  },
  chipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  chipTextDetected: {
    color: '#B45309',
  },
  chipTextMixed: {
    color: '#15803D',
  },
  messageBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
  },
  buttonContainer: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.citizen.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
});
