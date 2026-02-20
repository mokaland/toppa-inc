import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Error logging in:', error.message);
      throw error;
    }
    if (data.user && data.session) {
      set({ user: data.user, session: data.session });
    }
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      throw error;
    }
    set({ user: null, session: null });
  },
  checkUser: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      if (data.session) {
        set({ user: data.session.user, session: data.session });
      } else {
        set({ user: null, session: null });
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      set({ user: null, session: null });
    }
  },
}));
