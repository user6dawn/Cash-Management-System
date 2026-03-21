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

type AuthProviderProps = {
  children: React.ReactNode
  initialUser?: User | null
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(initialUser === null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let isMounted = true

    const syncUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) {
          return
        }

        setUser(user)
        setAuthError(null)
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

    if (initialUser === null) {
      void syncUser()
    } else {
      setLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setUser(session?.user ?? null)
      setAuthError(null)
      setLoading(false)

      if (!session?.user) {
        setUserData(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [initialUser, supabase])

  useEffect(() => {
    let isMounted = true

    const loadUserData = async () => {
      if (!user) {
        setUserData(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, created_at')
          .eq('id', user.id)
          .maybeSingle()

        if (!isMounted) {
          return
        }

        if (error) {
          throw error
        }

        setUserData(data)
        setAuthError(null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setUserData(null)
        setAuthError(getErrorMessage(error, 'Unable to refresh your session right now.'))
      }
    }

    void loadUserData()

    return () => {
      isMounted = false
    }
  }, [supabase, user?.id])

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
