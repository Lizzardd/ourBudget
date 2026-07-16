import { Platform } from 'react-native';

/**
 * Whether to drive Animated on the native thread.
 *
 * react-native-web doesn't support the native driver — passing
 * `useNativeDriver: true` there logs a warning on every animation and falls back
 * to the JS driver anyway. So it's on for native, off for web. The animations
 * here (opacity, translate) are cheap enough to run on the JS thread on web.
 */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
