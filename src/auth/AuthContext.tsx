import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { refreshSession } from '../api/client'
import type { AuthUser } from '../api/types'
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStorage'

interface AuthContextValue {
  user: AuthUser | null
  isBootstrapping: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getRefreshToken()) {
        setIsBootstrapping(false)
        return
      }
      try {
        const session = await refreshSession()
        if (!cancelled) setUser(session.user)
      } catch {
        clearTokens()
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const session = await authApi.login(username, password)
    setAccessToken(session.access_token)
    setRefreshToken(session.refresh_token)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(() => {
    authApi.logout().catch(() => {
      // Server-side logout is currently a no-op; ignore failures and clear locally regardless.
    })
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isBootstrapping, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
