import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { landingPathFor } from '../routing/roleLanding'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
  }`

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-background">
      <header className="bg-brand-darkblue">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            {/* <img src="/brand/Br_fulllogo.png" alt="Blue Rhine" className="h-7 w-auto object-contain" /> */}
            <nav className="flex gap-1">
              <NavLink to={landingPathFor(user.role)} className={navLinkClass} end>
                Queue
              </NavLink>
              <NavLink to="/admin/claims" className={navLinkClass}>
                All Claims
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/90">
              {user.display_name} <span className="capitalize text-white/60">({user.role})</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/30 px-3 py-1.5 font-medium text-white hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
