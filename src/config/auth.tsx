// src/config/auth.tsx
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface AuthResponse {
  error: { message: string } | null
  data?: {
    session: Session | null
    user: User | null
  }
}


export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const loginWithGoogle = async (): Promise<AuthResponse> => {
  const redirectTo = `${window.location.origin}/inicio`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) return { error };

  if (data?.url) window.location.assign(data.url);
  return { error: null };
};


export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
};