// src/stores/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session as SupaSession } from '@supabase/supabase-js'
import type { User, Role ,Session} from '../types'
import { supabase } from '../supabaseClient'

interface AuthState {
  session: Session | null
  user: User | null
  role: Role | null
  loading: boolean
  setSessionFromSupabase: (supabaseSession: SupaSession) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      role: null,
      loading: true,

      // login desde Supabase y fetch de datos reales
      setSessionFromSupabase: async (supabaseSession: SupaSession) => {
        const authUser = supabaseSession.user
        let userData: any = null

        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          userData = data ?? null
        } catch (e) {
          console.warn('No se pudo leer users, sigo con fallback:', e)
          // Opcional: aquí podrías upsert la fila en users si para tu app es obligatorio que exista.
        }

        const role =
          userData?.rol ??
          (authUser.app_metadata as any)?.role ??
          (authUser.user_metadata as any)?.role ??
          null

        // 🔴 Lo importante: SIEMPRE seteamos sesión y loading=false, aunque userData sea null
        useAuthStore.setState({
          session: {
            id: authUser.id,
            accessToken: supabaseSession.access_token ?? '',
            expiresAt: supabaseSession.expires_at ?? undefined,
          },
          user: userData ?? ({ id: authUser.id, email: authUser.email, rol: role } as any),
          role,
          loading: false,
        })
      },


      logout: async () => {
        await supabase.auth.signOut()
        set({ session: null, user: null, role: null, loading: false })
      },
    }),
    {
      name: 'auth-storage', // localStorage.auth-storage
    }
  )
)
