import { useSyncExternalStore } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * SSR-safe hook to determine if the current viewport is desktop width (>= breakpoint).
 * Uses React's `useSyncExternalStore` with server and client snapshots to prevent
 * SSR hydration mismatches between Node.js server HTML and browser client DOM.
 */
export function useIsDesktop(breakpoint: number = 768): boolean {
  const { width } = useWindowDimensions();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client snapshot
    () => false  // Server snapshot
  );

  if (Platform.OS !== 'web') {
    return width >= breakpoint;
  }

  return isClient ? width >= breakpoint : false;
}
