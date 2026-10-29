import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../context/LanguageContext';

export interface LogoutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut?: boolean;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  isLoggingOut = false,
}) => {
  const { t } = useLanguage();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Background tap to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
          disabled={isLoggingOut}
        />

        {/* Modal Card */}
        <View style={styles.modalCard}>
          {/* Danger / Logout Icon Badge */}
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerBadge}>
              <Ionicons name="log-out-outline" size={28} color="#DC2626" />
            </View>
          </View>

          {/* Title & Message */}
          <Text style={styles.titleText}>{t('logoutConfirmTitle')}</Text>
          <Text style={styles.messageText}>{t('logoutConfirmMessage')}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={isLoggingOut}
            >
              <Text style={styles.cancelButtonText}>{t('logoutCancelBtn')}</Text>
            </TouchableOpacity>

            {/* Confirm Logout Button */}
            <TouchableOpacity
              style={[styles.confirmButton, isLoggingOut && styles.confirmButtonDisabled]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.confirmContent}>
                  <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>{t('logoutConfirmBtn')}</Text>
                </View>
              )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FEF2F2',
  },
  iconInnerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmButton: {
    flex: 1.2,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
