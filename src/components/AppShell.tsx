import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  PiBell,
  PiBuildings,
  PiClockCounterClockwise,
  PiHandCoins,
  PiMoney,
  PiMoneyWavy,
  PiSignOut,
  PiTray,
  PiUserCircle,
  PiUsers,
  PiUsersThree,
} from 'react-icons/pi'
import { fetchUnreadCount } from '../api/notifications'
import { CompanySwitcher } from './CompanySwitcher'
import { useAuth } from '../auth/useAuth'
import { queueStagesFor } from '../routing/roleLanding'

// Phosphor icons, the same family the Flutter app uses (phosphor_icons).
const ICON = 'h-[18px] w-[18px] shrink-0'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
  }`

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Unread badge, like the Flutter bottom bar's Alerts tab; refreshed every minute.
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: fetchUnreadCount,
    enabled: !!user,
    refetchInterval: 60_000,
  })

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
            {/* Signed-in company's logo; a company switcher for multi-company users. */}
            <CompanySwitcher />
            {user.role === 'admin' ? (
              // Same as the Flutter app's Admin bottom bar: Companies + People, no queues.
              <nav className="flex gap-1">
                <NavLink
                  to="/admin"
                  className={() =>
                    navLinkClass({ isActive: pathname === '/admin' || pathname.startsWith('/admin/companies') })
                  }
                >
                  <PiBuildings className={ICON} aria-hidden />
                  Companies
                </NavLink>
                <NavLink to="/admin/people" className={navLinkClass}>
                  <PiUsers className={ICON} aria-hidden />
                  People
                </NavLink>
                <NavLink to="/topups" className={navLinkClass}>
                  <PiHandCoins className={ICON} aria-hidden />
                  Top-ups
                </NavLink>
                <NavLink to="/payments" className={navLinkClass}>
                  <PiMoneyWavy className={ICON} aria-hidden />
                  Payments
                </NavLink>
              </nav>
            ) : (
              <nav className="flex gap-1">
                {queueStagesFor(user.role).map(({ stage, label }) => (
                  <NavLink key={stage} to={`/queue/${stage}`} className={navLinkClass}>
                    {stage === 'department_hod' ? (
                      <PiUsersThree className={ICON} aria-hidden />
                    ) : (
                      <PiTray className={ICON} aria-hidden />
                    )}
                    {label}
                  </NavLink>
                ))}
                <NavLink to="/history" className={navLinkClass}>
                  <PiClockCounterClockwise className={ICON} aria-hidden />
                  History
                </NavLink>
                <NavLink to="/topups" className={navLinkClass}>
                  {user.role === 'hod' ? (
                    <PiMoney className={ICON} aria-hidden />
                  ) : (
                    <PiHandCoins className={ICON} aria-hidden />
                  )}
                  {user.role === 'hod' ? 'Funds' : 'Top-ups'}
                </NavLink>
                {user.role === 'finance_manager' && (
                  <NavLink to="/payments" className={navLinkClass}>
                    <PiMoneyWavy className={ICON} aria-hidden />
                    Payments
                  </NavLink>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <NavLink to="/alerts" className={navLinkClass}>
              <span className="relative">
                <PiBell className={ICON} aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-2.5 -top-2 min-w-[1.1rem] rounded-full bg-brand-orange px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              Alerts
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              <PiUserCircle className={ICON} aria-hidden />
              {user.display_name} <span className="capitalize text-white/60">({user.role.replace('_', ' ')})</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-3 py-1.5 font-medium text-white hover:bg-white/10"
            >
              <PiSignOut className={ICON} aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Keyed by company: switching company remounts the page with fresh filters. */}
        <div key={user.region_code ?? ''}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
