'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  clearReauthCookie,
  getReauthExpiry,
  getReauthTimestampFromCookie,
  isReauthExpired,
} from '@/lib/auth/reauth'

type UserData = {
  id: string
  full_name: string
  email: string
  created_at: string
}

type AuthContextType = {
  user: User | null
  userData: UserData | null
  loading: boolean
  signOut: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let isMounted = true
    let expiryTimeout: ReturnType<typeof setTimeout> | null = null

    const clearExpiryTimeout = () => {
      if (expiryTimeout) {
        clearTimeout(expiryTimeout)
        expiryTimeout = null
      }
    }

    const forceReauth = async () => {
      clearExpiryTimeout()
      clearReauthCookie()
      await supabase.auth.signOut()

      if (isMounted) {
        setUser(null)
        setUserData(null)
        window.location.href = '/login?reauth=1'
      }
    }

    const scheduleReauth = () => {
      clearExpiryTimeout()

      const timestamp = getReauthTimestampFromCookie(document.cookie)

      if (isReauthExpired(timestamp)) {
        void forceReauth()
        return
      }

      expiryTimeout = setTimeout(() => {
        void forceReauth()
      }, Math.max(getReauthExpiry(timestamp) - Date.now(), 0))
    }

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) {
          return
        }

        setUser(user)

        if (user) {
          scheduleReauth()

          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (!isMounted) {
            return
          }

          setUserData(data)
        } else {
          clearExpiryTimeout()
          clearReauthCookie()
          setUserData(null)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        clearExpiryTimeout()
        clearReauthCookie()
        setUser(null)
        setUserData(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!isMounted) {
          return
        }

        setUser(session?.user ?? null)

        if (session?.user) {
          scheduleReauth()

          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (!isMounted) {
            return
          }

          setUserData(data)
        } else {
          clearExpiryTimeout()
          clearReauthCookie()
          setUserData(null)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        clearExpiryTimeout()
        setUserData(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearExpiryTimeout()
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (!error) {
      clearReauthCookie()
      setUser(null)
      setUserData(null)
    }

    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
