import { useEffect, useMemo, useRef, useState } from 'react'
import { demoGroups, demoUsers, type DemoUser } from './demoUsers'

// Role tag shown on each row, read from the label ("Ravi · Accountant" -> Accountant).
function roleOf(u: DemoUser): { text: string; style: string } {
  const l = u.label.toLowerCase()
  if (l.includes('admin')) return { text: 'Admin', style: 'bg-purple-100 text-purple-700' }
  if (l.includes('finance')) return { text: 'Finance', style: 'bg-brand-successsoft text-brand-success' }
  if (l.includes('accountant')) return { text: 'Accounts', style: 'bg-brand-lightblue text-brand-darkblue' }
  return { text: 'HOD', style: 'bg-orange-100 text-brand-orange' }
}

// Name + department without the role ("Priya · HOD · Sales" -> "Priya · Sales").
function nameOf(u: DemoUser): string {
  return u.label
    .split(' · ')
    .filter((p) => !/^(hod|accountant|finance manager|admin)$/i.test(p.trim()))
    .join(' · ')
}

/** Compact, searchable test-login picker (replaces a native <select> that covered the form). */
export function TestLoginPicker({ value, onPick }: { value: string; onPick: (u: DemoUser) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = demoUsers.find((u) => u.username === value) ?? null

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return demoGroups
      .map((g) => ({
        group: g,
        users: demoUsers.filter(
          (u) => u.group === g && (!q || `${u.label} ${u.username} ${g}`.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.users.length > 0)
  }, [query])

  function pick(u: DemoUser) {
    onPick(u)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-sm font-medium text-brand-text">Test login</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-brand-divider bg-brand-card px-3 py-2 text-left text-sm text-brand-text hover:border-brand-darkblue focus:border-brand-darkblue focus:outline-none"
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${roleOf(selected).style}`}>
              {roleOf(selected).text}
            </span>
            <span className="truncate">
              {nameOf(selected)} <span className="text-brand-textmuted">· {selected.group}</span>
            </span>
          </span>
        ) : (
          <span className="text-brand-textmuted">Select to autofill</span>
        )}
        <span className={`text-xs text-brand-textmuted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-brand-divider bg-brand-card shadow-lg">
          <div className="border-b border-brand-divider p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role or region…"
              className="w-full rounded-lg border border-brand-divider bg-brand-background px-2.5 py-1.5 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {groups.length === 0 && <li className="px-3 py-3 text-sm text-brand-textmuted">No matching login</li>}
            {groups.map(({ group, users }) => (
              <li key={group}>
                <div className="sticky top-0 bg-brand-background px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-textmuted">
                  {group}
                </div>
                <ul>
                  {users.map((u) => {
                    const role = roleOf(u)
                    const active = u.username === value
                    return (
                      <li key={u.username}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => pick(u)}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-brand-lightblue ${
                            active ? 'bg-brand-lightblue' : ''
                          }`}
                        >
                          <span className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold ${role.style}`}>
                            {role.text}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-brand-text">{nameOf(u)}</span>
                          <span className="shrink-0 text-xs text-brand-textmuted">{u.username}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
