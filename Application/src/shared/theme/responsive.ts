import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

// Reference Device Dimensions: Pixel 8 (393dp x 852dp)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Scales a dimension relative to the screen width (393dp baseline).
 * Use for horizontal margins, padding, widths, left/right positions.
 */
export const scale = (size: number): number => {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Scales a dimension relative to the screen height (852dp baseline).
 * Use for vertical margins, padding, heights, top/bottom positions.
 */
export const verticalScale = (size: number): number => {
  return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
};

/**
 * Moderately scales a size. Useful for font sizes, border radius, and icon sizes
 * to prevent excessive shrinking on small screens or blowing up on large screens.
 * @param size Target size
 * @param factor Moderation factor (0 = unscaled, 0.5 = 50% scale, 1 = 100% scale)
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

/**
 * Custom React Hook for active responsive dimension recalculation on screen rotate or resize.
 */
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();

  const rScale = (size: number): number => Math.round((width / BASE_WIDTH) * size);
  const rVerticalScale = (size: number): number => Math.round((height / BASE_HEIGHT) * size);
  const rModerateScale = (size: number, factor = 0.5): number =>
    Math.round(size + (rScale(size) - size) * factor);

  return {
    width,
    height,
    isSmallDevice: width < 360,
    isMediumDevice: width >= 360 && width <= 412,
    isLargeDevice: width > 412,
    scale: rScale,
    verticalScale: rVerticalScale,
    moderateScale: rModerateScale,
  };
};
