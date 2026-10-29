import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { AppBadge } from '../../../shared/components/AppBadge';
import { sevakApi } from '../../services/sevakApi';
import { MedicineStock } from '../../types/sevak.types';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';

export const MedicineStockScreen: React.FC = () => {
  const [stocks, setStocks] = useState<MedicineStock[]>([]);

  useEffect(() => {
    sevakApi.getMedicineStock().then(setStocks);
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Medicine Kit" subtitle="CHW Drug Kit Stock & Indent Status" />

      <FlatList
        data={stocks}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCritical = item.status === 'Critical';
          const isLow = item.status === 'Low Stock';

          return (
            <AppCard accentBorderColor={isCritical ? colors.danger : isLow ? colors.warning : colors.sevak.primary}>
              <View style={styles.cardRow}>
                <View style={styles.infoCol}>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    {item.medicineName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Category: {item.category}
                  </Text>
                </View>
                <AppBadge
                  label={item.status}
                  variant={isCritical ? 'danger' : isLow ? 'warning' : 'success'}
                />
              </View>

              <View style={styles.quantityRow}>
                <View style={styles.stockLevel}>
                  <Text style={styles.stockNumber}>{item.quantityInKit}</Text>
                  <Text style={styles.stockUnit}>{item.unit} available</Text>
                </View>

                {(isCritical || isLow) && (
                  <TouchableOpacity style={styles.indentBtn}>
                    <Ionicons name="cart-outline" size={14} color={colors.sevak.primary} />
                    <Text style={styles.indentBtnText}>Request Refill</Text>
                  </TouchableOpacity>
                )}
              </View>
            </AppCard>
          );
        }}
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  infoCol: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  stockLevel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stockNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stockUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  indentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sevak.primary,
  },
});
