import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  roleColor?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

import { AppText } from './AppText';

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  roleColor,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    if (roleColor && variant === 'primary') return roleColor;

    switch (variant) {
      case 'primary':
        return colors.citizen.primary;
      case 'secondary':
        return colors.surfaceSubtle;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.danger;
      default:
        return colors.citizen.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    if (variant === 'outline') return roleColor || colors.textPrimary;
    if (variant === 'ghost') return roleColor || colors.textSecondary;
    if (variant === 'secondary') return colors.textPrimary;
    return colors.white;
  };

  const getBorder = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 1.5,
        borderColor: disabled ? colors.border : roleColor || colors.borderStrong,
      };
    }
    return {};
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <AppText
            variant="button"
            maxFontSizeMultiplier={1.25}
            style={[
              { color: getTextColor(), marginLeft: icon ? spacing.xs : 0, textAlign: 'center' },
              textStyle,
            ]}
          >
            {title}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
});
