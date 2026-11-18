import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { PiUserSwitch } from 'react-icons/pi'
import type { Backup, BackupData, BackupPerson } from '../../api/backup'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { errorMessage } from '../admin/adminHelpers'
import { inputClass, OutlineButton, PrimaryButton } from '../admin/AdminUi'

/** "18 Nov 2026" from "2026-11-18". */
function formatDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function personLine(p: BackupPerson | null): string {
  if (!p) return '—'
  const dept = (p.department_name ?? '').trim()
  return [p.display_name, p.role_label, p.role === 'hod' && dept ? dept : ''].filter(Boolean).join(' · ')
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  const two = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/**
 * Backup approver for a date range (Spec 5.2; Flutter: backup_approver_screen.dart). While it's
 * on, bills waiting for the approver go to the backup -- queue, decisions, emails and SLA
 * alerts -- and come back by themselves when the dates end or the backup is removed. Used on
 * the approver's "My backup" page and on Admin's person page.
 */
export function BackupPanel({
  queryKey,
  whose,
  load,
  save,
  remove,
}: {
  queryKey: readonly unknown[]
  /** "your" or "Rashid's" -- used in the help text. */
  whose: string
  load: () => Promise<BackupData>
  save: (backupId: number, start: string, end: string) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}) {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey, queryFn: load })
  const [editing, setEditing] = useState(false)
  const refresh = () => qc.invalidateQueries({ queryKey })

  const removeMut = useMutation({ mutationFn: (id: number) => remove(id), onSuccess: refresh })

  function onRemove(b: Backup) {
    const name = b.backup?.display_name ?? 'this backup'
    if (window.confirm(`Remove the backup? Bills go back to the usual approver instead of ${name}.`)) {
      removeMut.mutate(b.id)
    }
  }

  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div className="flex items-center gap-2">
        <PiUserSwitch className="h-5 w-5 text-brand-darkblue" aria-hidden />
        <h2 className="text-[15px] font-extrabold text-brand-text">Backup approver</h2>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-brand-textmuted">
        Between the dates, bills waiting for {whose} approval go to the backup instead. They come back automatically
        when the dates end.
      </p>

      {isLoading && <LoadingSpinner />}
      {error && <p className="mt-2 text-sm text-brand-danger">{errorMessage(error, 'Could not load the backup.')}</p>}

      {data && (
        <div className="mt-3 space-y-2">
          {data.backups.length === 0 && <p className="text-sm text-brand-textmuted">No backup set.</p>}
          {data.backups.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl bg-brand-background px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-brand-text">{personLine(b.backup)}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-brand-textmuted">
                  {formatDay(b.start_date)} – {formatDay(b.end_date)}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      b.is_active ? 'bg-brand-successsoft text-brand-success' : 'bg-brand-lightblue text-brand-darkblue'
                    }`}
                  >
                    {b.is_active ? 'Active now' : 'Upcoming'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={removeMut.isPending}
                onClick={() => onRemove(b)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-brand-danger hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
          {removeMut.error && <p className="text-sm text-brand-danger">{errorMessage(removeMut.error)}</p>}

          {editing ? (
            <BackupForm
              data={data}
              save={save}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false)
                refresh()
              }}
            />
          ) : (
            <OutlineButton className="mt-1 w-full py-2.5" onClick={() => setEditing(true)}>
              + Set backup
            </OutlineButton>
          )}
        </div>
      )}
    </div>
  )
}

function BackupForm({
  data,
  save,
  onCancel,
  onSaved,
}: {
  data: BackupData
  save: (backupId: number, start: string, end: string) => Promise<unknown>
  onCancel: () => void
  onSaved: () => void
}) {
  const [today] = useState(() => {
    if (data.today) return data.today
    const d = new Date()
    const two = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
  })
  const [backupId, setBackupId] = useState<string>('')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(() => addDays(today, 1))
  const [formError, setFormError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => save(Number(backupId), start, end),
    onSuccess: onSaved,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!backupId) return setFormError('Choose the backup approver')
    if (!start || !end) return setFormError('Choose the dates')
    if (end < start) return setFormError('The end date must be on or after the start date')
    setFormError(null)
    mut.mutate()
  }

  if (data.candidates.length === 0) {
    return (
      <div className="rounded-xl bg-brand-warningsoft p-3 text-sm text-brand-text">
        No one can be the backup: it must be an approver in the same company, at the same level or higher, and an HOD
        only from the same department.
        <div className="mt-2">
          <OutlineButton onClick={onCancel}>Close</OutlineButton>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-brand-divider p-3">
      <label className="block text-sm font-medium text-brand-text">
        Backup approver
        <select value={backupId} onChange={(e) => setBackupId(e.target.value)} className={`${inputClass} mt-1`}>
          <option value="">Choose…</option>
          {data.candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {personLine(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-brand-text">
          From
          <input
            type="date"
            value={start}
            min={today}
            onChange={(e) => {
              setStart(e.target.value)
              if (end < e.target.value) setEnd(e.target.value)
            }}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          To
          <input
            type="date"
            value={end}
            min={start || today}
            onChange={(e) => setEnd(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
      </div>
      {(formError || mut.error) && <p className="text-sm text-brand-danger">{formError ?? errorMessage(mut.error)}</p>}
      <div className="flex justify-end gap-2">
        <OutlineButton onClick={onCancel}>Cancel</OutlineButton>
        <PrimaryButton type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </form>
  )
}
