import { useEffect, useRef, useState } from 'react'
import { PiCaretDown, PiCheckBold } from 'react-icons/pi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { companyLabel } from '../lib/regionFilter'
import { landingPathFor } from '../routing/roleLanding'
import { RegionLogo } from './RegionLogo'

/**
 * Header logo of the company the user is signed in under. For people assigned to more than
 * one company it opens a logo list to switch (Flutter: _CompanySwitcher in the side menu).
 * Switching re-issues the session, so every screen reloads its data for the new company.
 */
export function CompanySwitcher() {
  const { user, switchRegion } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const current = (user.region_code ?? '').toUpperCase()
  const options = [...new Set((user.allowed_regions ?? []).map((c) => c.toUpperCase()))]
  const canSwitch = options.length > 1

  const badge = (
    <span className="flex h-9 items-center rounded-lg bg-white px-2">
      <RegionLogo code={current} className="h-7 w-auto max-w-[140px]" />
    </span>
  )

  if (!canSwitch) return badge

  async function pick(code: string) {
    if (code === current) {
      setOpen(false)
      return
    }
    setBusy(code)
    setError(null)
    try {
      const u = await switchRegion(code)
      setOpen(false)
      // Land on the role's home page: the page you were on may show the old company's data.
      navigate(landingPathFor(u.role), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not switch company.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${companyLabel(current)} · switch company`}
        aria-label={`${companyLabel(current)}, switch company`}
        className={`flex h-9 items-center gap-1 rounded-lg bg-white pl-2 pr-1.5 transition-shadow ${
          open ? 'ring-2 ring-white/60' : 'hover:ring-2 hover:ring-white/40'
        }`}
      >
        <RegionLogo code={current} className="h-7 w-auto max-w-[140px]" />
        <PiCaretDown
          className={`h-3.5 w-3.5 text-brand-textmuted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-brand-divider bg-brand-card shadow-lg"
        >
          <div className="border-b border-brand-divider px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-textmuted">
            Switch company
          </div>
          <ul className="p-1.5">
            {options.map((code) => {
              const active = code === current
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={busy !== null}
                    onClick={() => pick(code)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-brand-lightblue disabled:opacity-60 ${
                      active ? 'bg-brand-lightblue' : ''
                    }`}
                  >
                    <span className="flex h-10 w-24 shrink-0 items-center justify-center rounded-md border border-brand-divider bg-white px-1.5">
                      <RegionLogo code={code} className="h-8 w-full" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-brand-text">{companyLabel(code)}</span>
                    {busy === code ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-divider border-t-brand-darkblue" />
                    ) : (
                      active && <PiCheckBold className="h-4 w-4 text-brand-darkblue" aria-label="Current company" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          {error && <p className="border-t border-brand-divider px-3 py-2 text-xs text-brand-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
