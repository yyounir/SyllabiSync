import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'SyllabiSync: Supabase credentials missing. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are set.'
  );
}

// In Node.js / Server-Side Rendering environments, `window` does not exist.
// We provide an SSR-safe storage adapter that avoids touching `AsyncStorage` / `localStorage` on the server.
const isClient = typeof window !== 'undefined' || Platform.OS !== 'web';

const ssrSafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined' && Platform.OS === 'web') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined' && Platform.OS === 'web') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined' && Platform.OS === 'web') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ssrSafeStorage,
    autoRefreshToken: isClient,
    persistSession: isClient,
    detectSessionInUrl: typeof window !== 'undefined' && Platform.OS === 'web',
  },
});
