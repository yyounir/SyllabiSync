import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { DEMO_USER, DEMO_PROFILE, seedDemoDataIfEmpty } from '@/lib/demoData';

const DEMO_STORAGE_KEY = 'syllabisync_is_demo';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isDemo: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInAsDemo: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else if (error && error.code === 'PGRST116') {
        // Profile row might not exist yet; create fallback profile
        const { data: inserted } = await supabase
          .from('profiles')
          .insert({ id: userId, full_name: 'Student' })
          .select()
          .single();
        if (inserted) setProfile(inserted);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Check existing session or saved demo mode
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
        fetchProfile(session.user.id);
        setLoading(false);
      } else {
        try {
          const isDemoSaved = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
          if (!mounted) return;
          if (isDemoSaved === 'true') {
            await seedDemoDataIfEmpty();
            setIsDemo(true);
            setUser(DEMO_USER);
            setProfile(DEMO_PROFILE);
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsDemo(false);
          }
        } catch {
          // ignore
        }
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setIsDemo(false);
        await AsyncStorage.removeItem(DEMO_STORAGE_KEY);
        setSession(session);
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        const isDemoSaved = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
        if (isDemoSaved === 'true') {
          setIsDemo(true);
          setUser(DEMO_USER);
          setProfile(DEMO_PROFILE);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsDemo(false);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) {
        setIsDemo(false);
        await AsyncStorage.removeItem(DEMO_STORAGE_KEY);
      }
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return { error };

      if (data.user) {
        setIsDemo(false);
        await AsyncStorage.removeItem(DEMO_STORAGE_KEY);
        // Ensure profile row exists
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInAsDemo = async () => {
    setLoading(true);
    try {
      await seedDemoDataIfEmpty();
      await AsyncStorage.setItem(DEMO_STORAGE_KEY, 'true');
      setIsDemo(true);
      setUser(DEMO_USER);
      setProfile(DEMO_PROFILE);
    } catch (err) {
      console.error('Error entering demo mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(DEMO_STORAGE_KEY);
    setIsDemo(false);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      return;
    }
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemo,
        signIn,
        signUp,
        signInAsDemo,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
