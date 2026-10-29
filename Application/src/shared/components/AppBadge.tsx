import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface AppBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  color?: string;
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'neutral',
  color,
  style,
}) => {
  const getBadgeColors = () => {
    if (color) {
      return { bg: `${color}15`, text: color };
    }
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary };
    }
  };

  const { bg, text } = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[typography.caption, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
});
