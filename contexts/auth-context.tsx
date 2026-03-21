'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/errors'

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
  authError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let isMounted = true

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) {
          return
        }

        setUser(user)
        setAuthError(null)

        if (user) {
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
          setUserData(null)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setUser(null)
        setUserData(null)
        setAuthError(getErrorMessage(error, 'Unable to verify your session right now.'))
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
        setAuthError(null)

        if (session?.user) {
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
          setUserData(null)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setUserData(null)
        setAuthError(getErrorMessage(error, 'Unable to refresh your session right now.'))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (!error) {
        setUser(null)
        setUserData(null)
        setAuthError(null)
      }

      return { error: error?.message ?? null }
    } catch (error) {
      return {
        error: getErrorMessage(error, 'Unable to sign out right now.'),
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut, authError }}>
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
