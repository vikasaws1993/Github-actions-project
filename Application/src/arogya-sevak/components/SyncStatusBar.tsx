import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../shared/theme/colors';
import { spacing, borderRadius } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  pendingCount: number;
  syncing: boolean;
  onSyncPress: () => void;
}

export const SyncStatusBar: React.FC<Props> = ({ pendingCount, syncing, onSyncPress }) => {
  const hasPending = pendingCount > 0;

  return (
    <View style={[styles.bar, hasPending ? styles.pendingBar : styles.syncedBar]}>
      <View style={styles.leftInfo}>
        <Ionicons
          name={hasPending ? 'cloud-offline-outline' : 'cloud-done-outline'}
          size={18}
          color={hasPending ? colors.warning : colors.success}
        />
        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
          {hasPending
            ? `${pendingCount} offline records awaiting sync`
            : 'All field records synced to PHC server'}
        </Text>
      </View>

      {hasPending && (
        <TouchableOpacity
          style={styles.syncBtn}
          activeOpacity={0.7}
          onPress={onSyncPress}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="sync" size={14} color={colors.white} />
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  pendingBar: {
    backgroundColor: colors.warningLight,
    borderColor: '#FDE68A',
  },
  syncedBar: {
    backgroundColor: colors.successLight,
    borderColor: '#A7F3D0',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  syncBtn: {
    backgroundColor: colors.sevak.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  syncBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
