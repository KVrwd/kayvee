import { useWindowDimensions } from 'react-native';

// Simple breakpoints - good enough to keep phones full-width while
// centering content with sensible margins on tablets, foldables, TVs,
// and desktop-size windows (Chrome OS / larger Android devices).
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isLargeScreen = width >= 1000; // TV / desktop-class window

  const contentMaxWidth = isLargeScreen ? 720 : isTablet ? 600 : width;
  const horizontalPadding = isLargeScreen || isTablet ? 40 : 20;
  const columns = isLargeScreen ? 3 : isTablet ? 2 : 1;

  return { width, height, isTablet, isLargeScreen, contentMaxWidth, horizontalPadding, columns };
}
