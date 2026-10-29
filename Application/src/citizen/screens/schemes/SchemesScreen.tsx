import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppCard } from '../../../shared/components/AppCard';
import { AppBadge } from '../../../shared/components/AppBadge';
import { citizenApi } from '../../services/citizenApi';
import { HealthScheme } from '../../types/citizen.types';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';
import { useLanguage } from '../../../shared/context/LanguageContext';

export const SchemesScreen: React.FC = () => {
    const [schemes, setSchemes] = useState<HealthScheme[]>([]);
    const { t } = useLanguage();

    useEffect(() => {
        citizenApi.getSchemes().then(setSchemes);
    }, []);

    return (
        <View style={styles.container}>
            <AppHeader title={t('schemesTitle')} subtitle={t('schemesSubtitle')} />

            <FlatList
                data={schemes}
                keyExtractor={(item) => item.id}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <AppCard accentBorderColor="#10B981">
                        <View style={styles.topRow}>
                            <View style={styles.titleCol}>
                                <Text style={[typography.h3, { color: colors.textPrimary }]}>
                                    {item.name}
                                </Text>
                                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                    {item.nameHindi}
                                </Text>
                            </View>
                            <AppBadge
                                label={item.status}
                                variant={item.status === 'Enrolled' ? 'success' : 'info'}
                            />
                        </View>

                        <View style={styles.infoBox}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('coverage')}</Text>
                                <Text style={styles.infoVal}>{item.coverage}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('eligibility')}</Text>
                                <Text style={styles.infoVal}>{item.eligibility}</Text>
                            </View>
                            {item.schemeNumber && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('cardNo')}</Text>
                                    <Text style={[styles.infoVal, { fontWeight: '700' }]}>
                                        {item.schemeNumber}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity style={styles.actionBtn}>
                            <Text style={styles.actionBtnText}>
                                {item.status === 'Enrolled' ? t('downloadECard') : t('checkEligibility')}
                            </Text>
                            <Ionicons
                                name={item.status === 'Enrolled' ? 'download-outline' : 'arrow-forward'}
                                size={16}
                                color={colors.citizen.primary}
                            />
                        </TouchableOpacity>
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
        marginBottom: spacing.sm,
    },
    titleCol: {
        flex: 1,
        paddingRight: spacing.xs,
    },
    infoBox: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        gap: 4,
        marginVertical: spacing.xs,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    infoVal: {
        fontSize: 12,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: spacing.sm,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.citizen.primary,
    },
});
