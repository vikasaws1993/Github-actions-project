import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { BeneficiaryCard } from '../../components/BeneficiaryCard';
import { useBeneficiaryRegistry } from '../../hooks/useBeneficiaryRegistry';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';

export const BeneficiaryListScreen: React.FC = () => {
  const { beneficiaries, loading } = useBeneficiaryRegistry();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'All' | 'High Risk' | 'ANC' | 'Infant'>('All');
  const [query, setQuery] = useState('');

  const filtered = beneficiaries.filter((item) => {
    let matchesCategory = true;
    if (filter === 'High Risk') matchesCategory = item.riskLevel === 'High Risk';
    if (filter === 'ANC') matchesCategory = item.category.includes('ANC');
    if (filter === 'Infant') matchesCategory = item.category.includes('Infant');

    const matchesQuery =
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.householdId.toLowerCase().includes(query.toLowerCase()) ||
      (item.abhaId && item.abhaId.includes(query));

    return matchesCategory && matchesQuery;
  });

  const handleAddNewBeneficiary = () => {
    Alert.alert(
      'New Household Survey',
      'Register a new citizen/beneficiary under Ward 14.\n\nSupports offline recording when disconnected.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Survey', onPress: () => console.log('Starting survey...') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('beneficiaryTitle')} subtitle={t('beneficiarySubtitle')} />

      {/* Search Bar with Add Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.input}
            placeholder={t('searchBeneficiaryPlaceholder')}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={handleAddNewBeneficiary}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'All', label: t('filterAll') },
          { key: 'High Risk', label: t('filterHighRisk') },
          { key: 'ANC', label: t('filterAnc') },
          { key: 'Infant', label: t('filterInfant') },
        ].map((tabItem) => (
          <TouchableOpacity
            key={tabItem.key}
            style={[styles.filterTab, filter === tabItem.key && styles.activeFilterTab]}
            onPress={() => setFilter(tabItem.key as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === tabItem.key && styles.activeFilterText,
              ]}
            >
              {tabItem.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BeneficiaryCard beneficiary={item} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.base,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 46,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.sevak.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  activeFilterTab: {
    backgroundColor: colors.sevak.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
});
