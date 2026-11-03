import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { refreshSession } from '../api/client'
import type { AuthUser } from '../api/types'
import { isSupportedRole } from '../routing/roleLanding'
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStorage'

interface AuthContextValue {
  user: AuthUser | null
  isBootstrapping: boolean
  login: (username: string, password: string, regionCode?: string) => Promise<AuthUser>
  switchRegion: (regionCode: string) => Promise<AuthUser>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
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
        // A saved session for a role this app doesn't serve (employee / admin) would leave
        // /login redirecting to itself (a blank page), so drop it instead.
        if (!isSupportedRole(session.user.role)) clearTokens()
        else if (!cancelled) setUser(session.user)
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

  const login = useCallback(async (username: string, password: string, regionCode?: string) => {
    const session = await authApi.login(username, password, regionCode)
    // Unsupported roles get no session here; LoginPage shows "use the mobile app".
    if (!isSupportedRole(session.user.role)) return session.user
    setAccessToken(session.access_token)
    setRefreshToken(session.refresh_token)
    setUser(session.user)
    return session.user
  }, [])

  // Multi-company users: the new session's company decides what every screen loads, so all
  // cached data is dropped after the switch (Flutter: "every screen reloads its data").
  const switchRegion = useCallback(
    async (regionCode: string) => {
      const session = await authApi.switchRegion(regionCode)
      setAccessToken(session.access_token)
      setRefreshToken(session.refresh_token)
      setUser(session.user)
      queryClient.clear()
      return session.user
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    authApi.logout().catch(() => {
      // Server-side logout is currently a no-op; ignore failures and clear locally regardless.
    })
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isBootstrapping, login, switchRegion, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
