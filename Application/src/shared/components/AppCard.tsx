import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface AppCardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accentBorderColor?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  onPress,
  accentBorderColor,
}) => {
  const cardContent = (
    <View
      style={[
        styles.card,
        accentBorderColor ? { borderLeftWidth: 4, borderLeftColor: accentBorderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});
