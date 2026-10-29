import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { AppBadge } from '../../../shared/components/AppBadge';
import { sevakApi } from '../../services/sevakApi';
import { FieldVisit } from '../../types/sevak.types';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';

export const HomeVisitsScreen: React.FC = () => {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const data = await sevakApi.getFieldVisits();
      setVisits(data || []);
    } catch (_) {
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Field Visits" subtitle="Today's Home Visitation Itinerary" />

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.sevak.primary]}
            tintColor={colors.sevak.primary}
          />
        }
        renderItem={({ item }) => (
          <AppCard accentBorderColor={item.priority === 'High' ? colors.danger : colors.sevak.primary}>
            <View style={styles.topRow}>
              <View style={styles.titleInfo}>
                <Text style={[typography.h3, { color: colors.textPrimary }]}>
                  {item.beneficiaryName}
                </Text>
                <Text style={[typography.caption, { color: colors.sevak.primary, fontWeight: '700' }]}>
                  {item.visitType}
                </Text>
              </View>
              <AppBadge
                label={item.priority === 'High' ? 'Urgent Visit' : 'Scheduled'}
                variant={item.priority === 'High' ? 'danger' : 'info'}
              />
            </View>

            <View style={styles.detailsRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.addressText}>{item.address}</Text>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.timeInfo}>
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.timeText}>{item.scheduledTime}</Text>
              </View>
              <TouchableOpacity style={styles.startBtn}>
                <Ionicons name="checkmark-done" size={14} color={colors.white} />
                <Text style={styles.startBtnText}>Complete Visit</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: spacing.xs,
  },
  addressText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  startBtn: {
    backgroundColor: colors.sevak.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
