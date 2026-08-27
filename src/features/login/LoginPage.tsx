import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { landingPathFor, isSupportedRole } from '../../routing/roleLanding'
import { ErrorBanner } from '../../components/ErrorBanner'
import { demoUsers } from './demoUsers'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDemoUser, setSelectedDemoUser] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleDemoUserChange(value: string) {
    setSelectedDemoUser(value)
    const demoUser = demoUsers.find((u) => u.username === value)
    if (demoUser) {
      setUsername(demoUser.username)
      setPassword(demoUser.password)
    }
  }

  if (user) {
    return <Navigate to={landingPathFor(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(username, password)
      if (!isSupportedRole(loggedInUser.role)) {
        setError('This account role is not supported on the web app. Please use the mobile app.')
        return
      }
      const from = (location.state as { from?: Location })?.from?.pathname
      navigate(from ?? landingPathFor(loggedInUser.role), { replace: true })
    } catch (err) {
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
          <p className="text-sm text-brand-textmuted">Accountant / HOD sign in</p>
        </div>

        {error && <ErrorBanner message={error} />}

        <div>
          <label htmlFor="demoUser" className="block text-sm font-medium text-brand-text">
            Demo user
          </label>
          <select
            id="demoUser"
            value={selectedDemoUser}
            onChange={(e) => handleDemoUserChange(e.target.value)}
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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-xl border border-brand-divider bg-brand-card px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
          />
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
