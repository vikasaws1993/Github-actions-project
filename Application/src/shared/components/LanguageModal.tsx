import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage, LANGUAGE_OPTIONS, LanguageCode } from '../context/LanguageContext';
import { colors } from '../theme/colors';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGE_META: Record<LanguageCode, { iconLetter: string; nativeTitle: string; englishTitle: string }> = {
  mr: { iconLetter: 'म', nativeTitle: 'मराठी', englishTitle: 'Marathi' },
  en: { iconLetter: 'EN', nativeTitle: 'English', englishTitle: 'English' },
  hi: { iconLetter: 'हिं', nativeTitle: 'हिंदी', englishTitle: 'Hindi' },
};

export const LanguageModal: React.FC<LanguageModalProps> = ({ visible, onClose }) => {
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = async (code: LanguageCode) => {
    try {
      await setLanguage(code);
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="globe-outline" size={22} color={colors.citizen.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>
                {t('selectLanguage') || 'भाषा निवडा / Select Language'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {language === 'mr'
                  ? 'अ‍ॅप वापरण्यासाठी आपली भाषा निवडा'
                  : language === 'hi'
                  ? 'ऐप के लिए अपनी भाषा चुनें'
                  : 'Choose your preferred app language'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* All 3 Language Options */}
          <View style={styles.optionsList}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = language === opt.code;
              const meta = LANGUAGE_META[opt.code] || {
                iconLetter: opt.nativeLabel.slice(0, 2),
                nativeTitle: opt.nativeLabel,
                englishTitle: opt.label,
              };

              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                  ]}
                  onPress={() => handleSelect(opt.code)}
                  activeOpacity={0.75}
                >
                  <View style={styles.optionLeft}>
                    {/* Letter / Icon Badge */}
                    <View
                      style={[
                        styles.langBadge,
                        isSelected && styles.langBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.langBadgeText,
                          isSelected && styles.langBadgeTextSelected,
                        ]}
                      >
                        {meta.iconLetter}
                      </Text>
                    </View>

                    {/* Language Labels */}
                    <View style={styles.labelCol}>
                      <View style={styles.labelTopRow}>
                        <Text
                          style={[
                            styles.nativeLabel,
                            isSelected && styles.nativeLabelSelected,
                          ]}
                        >
                          {meta.nativeTitle}
                        </Text>
                        {isSelected && (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>
                              {language === 'mr' ? 'सक्रिय' : language === 'hi' ? 'सक्रिय' : 'Active'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.subLabel,
                          isSelected && styles.subLabelSelected,
                        ]}
                      >
                        {meta.englishTitle}
                      </Text>
                    </View>
                  </View>

                  {/* Radio / Checkmark */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Cancel / Done Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>
              {t('cancel') || 'रद्द करा / Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    zIndex: 10,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  optionRowSelected: {
    borderColor: colors.citizen.primary,
    backgroundColor: '#EAF6F4',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  langBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadgeSelected: {
    backgroundColor: colors.citizen.primary,
    borderColor: colors.citizen.primary,
  },
  langBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  langBadgeTextSelected: {
    color: '#FFFFFF',
  },
  labelCol: {
    gap: 2,
    flex: 1,
  },
  labelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  nativeLabelSelected: {
    color: colors.citizen.primary,
  },
  subLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  subLabelSelected: {
    color: '#0A5C53',
  },
  activePill: {
    marginLeft: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: colors.citizen.primary,
    backgroundColor: colors.citizen.primary,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
