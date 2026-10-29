import React from 'react';
import { Text as RNText, TextProps, TextStyle, StyleSheet } from 'react-native';
import { typography } from '../theme/typography';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800' | '900';
  align?: 'left' | 'center' | 'right';
  maxFontSizeMultiplier?: number;
  children?: React.ReactNode;
}

/**
 * AppText - Centralized Typography Component for ArogyaMitra
 * 
 * Features:
 * 1. Automatically enforces a safe maximum font scale multiplier (default 1.35)
 *    to guarantee Android Accessibility text scaling works gracefully without
 *    breaking card boundaries, clipping buttons, or destroying grid layouts.
 * 2. Supports standard typography variants (h1, h2, h3, body, bodySmall, caption, button).
 * 3. Supports explicit `allowFontScaling={false}` for strictly constrained graphical widgets
 *    (OTP cells, calendar matrix, compact badge pills).
 */
export const AppText: React.FC<AppTextProps> = ({
  variant,
  color,
  weight,
  align,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.35,
  children,
  ...rest
}) => {
  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        variant ? typography[variant] : undefined,
        color ? { color } : undefined,
        weight ? { fontWeight: weight } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({});
