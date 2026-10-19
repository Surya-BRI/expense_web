import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { RegionSelectionRequired } from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { landingPathFor, isSupportedRole } from '../../routing/roleLanding'
import { ErrorBanner } from '../../components/ErrorBanner'
import { demoUsers } from './demoUsers'

const REGION_LABELS: Record<string, string> = { UAE: 'UAE', KSA: 'KSA', OMAN: 'Oman' }

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedErpUser, setSelectedErpUser] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Only populated when backend returns region_required (multi-region accounts).
  const [regionOptions, setRegionOptions] = useState<string[] | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  if (user) {
    return <Navigate to={landingPathFor(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(username, password, selectedRegion ?? undefined)
      if (!isSupportedRole(loggedInUser.role)) {
        setError('This account role is not supported on the web app. Please use the mobile app.')
        return
      }
      const from = (location.state as { from?: Location })?.from?.pathname
      navigate(from ?? landingPathFor(loggedInUser.role), { replace: true })
    } catch (err) {
      if (err instanceof RegionSelectionRequired) {
        setRegionOptions(err.allowedRegions)
        setSelectedRegion(err.allowedRegions[0] ?? null)
        setError(null)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Unable to log in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-brand-divider bg-brand-card p-6 shadow-sm"
      >
        <div className="text-center">
          <img
            src="/brand/Br_fulllogo.png"
            alt="Blue Rhine"
            className="mx-auto mb-3 h-16 w-auto object-contain"
          />
          <h1 className="text-lg font-semibold text-brand-text">Petty Cash and Expense Tracker</h1>
          <p className="text-sm text-brand-textmuted">HOD / Accountant / Finance Manager sign in</p>
        </div>

        {error && <ErrorBanner message={error} />}

        {regionOptions && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-brand-text">Choose a region to sign in with</p>
            <div className="flex gap-2">
              {regionOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    selectedRegion === r
                      ? 'border-brand-darkblue bg-brand-darkblue text-white'
                      : 'border-brand-divider bg-brand-card text-brand-text hover:bg-brand-lightblue'
                  }`}
                >
                  {REGION_LABELS[r] ?? r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="erpUser" className="block text-sm font-medium text-brand-text">
            ERP user
          </label>
          <select
            id="erpUser"
            value={selectedErpUser}
            onChange={(e) => {
              const val = e.target.value
              setSelectedErpUser(val)
              const u = demoUsers.find((d) => d.username === val)
              if (u) {
                setUsername(u.username)
                setPassword(u.password)
                setRegionOptions(null)
                setSelectedRegion(null)
              }
            }}
            className="mt-1 w-full rounded-xl border border-brand-divider bg-brand-card px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
          >
            <option value="">— Select to autofill —</option>
            {demoUsers.map((u) => (
              <option key={u.username} value={u.username}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-brand-text">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-xl border border-brand-divider bg-brand-card px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-brand-text">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-brand-divider bg-brand-card px-3 py-2 pr-10 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-brand-textmuted hover:text-brand-text"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-orange px-3 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
