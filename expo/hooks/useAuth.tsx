import React, { useEffect, useMemo, useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface AuthState {
  supabase: SupabaseClient;
  session: Session | null;
  isAuthLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
let SUPABASE_URL = extra.EXPO_PUBLIC_SUPABASE_URL
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? process.env.EXPO_PUBLIC_URL
  ?? process.env.URL
  ?? '';
let SUPABASE_ANON_KEY = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.EXPO_PUBLIC_ANON_KEY
  ?? process.env.ANON_KEY
  ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Auth] Env not found. Falling back to hardcoded Supabase creds for dev');
  SUPABASE_URL = 'https://oyvxcdjvwxchmachnrtb.supabase.co';
  SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnhjZGp2d3hjaG1hY2hucnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzU0MjMsImV4cCI6MjA3Mzg1MTQyM30.B9yc_tRQtgNqVw3fycwB3L60EHaGhm2DsRepzeuxnxQ';
}

function createSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [supabase] = useState<SupabaseClient>(() => createSupabase());
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[Auth] Fetching initial session');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] getSession error', error);
        }
        if (mounted) setSession(data.session ?? null);
      } catch (e) {
        console.error('[Auth] init error', e);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[Auth] onAuthStateChange', _event);
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Auth] signIn error', error);
        return { success: false, error: error.message };
      }
      const uid = data?.user?.id ?? null;
      const uemail = data?.user?.email ?? email;
      const uname = (data?.user?.user_metadata as any)?.name ?? undefined;
      if (uid) {
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', uid)
            .maybeSingle();
          if (fetchErr) {
            console.log('[Auth] profiles fetch error (non-fatal)', fetchErr);
          }
          if (!existing) {
            console.log('[Auth] Seeding missing profile on sign in');
            const { error: upErr } = await supabase
              .from('profiles')
              .upsert({ id: uid, email: uemail, name: uname || uemail }, { onConflict: 'id' });
            if (upErr) console.log('[Auth] Seed profile error', upErr);
          } else if (!existing.name || (typeof existing.name === 'string' && existing.name.trim().length === 0)) {
            console.log('[Auth] Backfilling empty profile name from metadata/email');
            const { error: upErr2 } = await supabase
              .from('profiles')
              .update({ name: uname || uemail })
              .eq('id', uid);
            if (upErr2) console.log('[Auth] Backfill name error', upErr2);
          }
        } catch (e) {
          console.log('[Auth] Seed profile exception', e);
        }
      }
      return { success: true };
    } catch (e) {
      console.error('[Auth] signIn exception', e);
      return { success: false, error: 'Unexpected error. Please try again.' };
    } finally {
      setIsAuthLoading(false);
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      setIsAuthLoading(true);
      console.log('[Auth] signUp start', { email });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: (name ?? '').trim() || undefined } },
      });
      if (error) {
        console.error('[Auth] signUp error', error);
        return { success: false, error: error.message };
      }
      const createdUserId = data.user?.id ?? null;
      const createdEmail = data.user?.email ?? email;
      const createdName = (name ?? '').trim();
      console.log('[Auth] signUp success', { createdUserId });

      if (createdUserId && data.session) {
        try {
          console.log('[Auth] Upserting initial profile row');
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(
              {
                id: createdUserId,
                email: createdEmail,
                name: createdName || createdEmail,
                onboarding_complete: false,
              },
              { onConflict: 'id' }
            );
          if (upsertErr) console.error('[Auth] profile upsert after signUp error', upsertErr);
        } catch (inner) {
          console.error('[Auth] profile upsert exception', inner);
        }
      } else {
        console.log('[Auth] No active session after signUp (email confirmation likely). Relying on DB trigger to create profile.');
      }

      return { success: true };
    } catch (e) {
      console.error('[Auth] signUp exception', e);
      return { success: false, error: 'Unexpected error. Please try again.' };
    } finally {
      setIsAuthLoading(false);
    }
  }, [supabase]);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    try {
      console.log('[Auth] resendConfirmationEmail', email);
      if (!email) return { success: false, error: 'Enter your email first.' };
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        console.error('[Auth] resend error', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      console.error('[Auth] resend exception', e);
      return { success: false, error: 'Failed to send email. Try again.' };
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      setIsAuthLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) console.error('[Auth] signOut error', error);
    } catch (e) {
      console.error('[Auth] signOut exception', e);
    } finally {
      setIsAuthLoading(false);
    }
  }, [supabase]);

  const value = useMemo<AuthState>(() => ({
    supabase,
    session,
    isAuthLoading,
    signIn,
    signUp,
    resendConfirmationEmail,
    signOut,
  }), [supabase, session, isAuthLoading, signIn, signUp, resendConfirmationEmail, signOut]);

  return value;
});