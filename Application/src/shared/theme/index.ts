import { colors } from './colors';
import { spacing, borderRadius } from './spacing';
import { typography } from './typography';
import { scale, verticalScale, moderateScale, useResponsiveDimensions } from './responsive';

import { AppText, AppTextProps } from '../components/AppText';

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  scale,
  verticalScale,
  moderateScale,
};

export type Theme = typeof theme;
export {
  colors,
  spacing,
  borderRadius,
  typography,
  scale,
  verticalScale,
  moderateScale,
  useResponsiveDimensions,
  AppText,
};
export type { AppTextProps };
