import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { AppBadge } from '../../../shared/components/AppBadge';
import { AppButton } from '../../../shared/components/AppButton';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';

export const OfflineSyncScreen: React.FC = () => {
  const { queue, pendingCount, syncing, triggerSync } = useOfflineQueue();

  return (
    <View style={styles.container}>
      <AppHeader title="Offline Sync" subtitle="Field Sync Queue & Network Status" />

      <View style={styles.summaryBox}>
        <View style={styles.summaryTextCol}>
          <Text style={[typography.h3, { color: colors.white }]}>
            {pendingCount === 0 ? 'All Records Synced' : `${pendingCount} Records Pending`}
          </Text>
          <Text style={[typography.caption, { color: colors.sevak.primaryLight, marginTop: 2 }]}>
            Records captured in the field are stored securely on this device and synced when connected.
          </Text>
        </View>

        {pendingCount > 0 && (
          <AppButton
            title="Sync Now"
            onPress={triggerSync}
            loading={syncing}
            style={styles.syncBtn}
            textStyle={styles.syncBtnText}
          />
        )}
      </View>

      <View style={styles.listHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Pending Queue Items
        </Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard accentBorderColor={colors.warning}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[typography.bodyLarge, { fontWeight: '700', color: colors.textPrimary }]}>
                  {item.type.replace(/_/g, ' ')}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Captured {item.timestamp}
                </Text>
              </View>
              <AppBadge label={item.status} variant="warning" />
            </View>
          </AppCard>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              No pending records. You are fully synced with PHC database!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryBox: {
    backgroundColor: colors.sevak.primary,
    margin: spacing.base,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  summaryTextCol: {
    gap: 2,
  },
  syncBtn: {
    backgroundColor: colors.white,
    height: 40,
  },
  syncBtnText: {
    color: colors.sevak.primaryDark,
    fontSize: 13,
  },
  listHeader: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
});
