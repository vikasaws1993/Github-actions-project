import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { AppBadge } from '../../../shared/components/AppBadge';
import { useCitizenHealthRecords } from '../../hooks/useCitizenHealthRecords';
import { HealthRecord } from '../../types/citizen.types';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';
import { useLanguage } from '../../../shared/context/LanguageContext';

export const HealthRecordsScreen: React.FC = () => {
  const { records, loading } = useCitizenHealthRecords();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'All' | 'Lab Report' | 'Prescription' | 'Vaccine'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter((rec) => {
    const matchesFilter = filter === 'All' || rec.category === filter;
    const matchesSearch =
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderRecordItem = ({ item }: { item: HealthRecord }) => (
    <AppCard accentBorderColor={colors.citizen.primary}>
      <View style={styles.cardHeader}>
        <View style={styles.titleInfo}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {item.title}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {item.doctorName} • {item.facilityName}
          </Text>
        </View>
        <AppBadge label={item.category} variant="info" />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <TouchableOpacity style={styles.viewBtn}>
          <Ionicons name="eye-outline" size={14} color={colors.citizen.primary} />
          <Text style={styles.viewBtnText}>{t('viewDoc')}</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader title={t('recordsTitle')} subtitle={t('recordsSubtitle')} />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'Lab Report', 'Prescription', 'Vaccine'] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterTab,
              filter === cat && styles.filterTabActive,
            ]}
            onPress={() => setFilter(cat)}
          >
            <Text
              style={[
                styles.filterText,
                filter === cat && styles.filterTextActive,
              ]}
            >
              {cat === 'All' ? t('allFilter') : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordItem}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={colors.borderStrong} />
            <Text style={[typography.body, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              {t('noRecords')}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  filterTabActive: {
    backgroundColor: colors.citizen.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.base,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleInfo: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.citizen.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
});
