import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { PiTimer } from 'react-icons/pi'
import { fetchRegionSla, formatSlaHours, updateRegionSla, type RegionSla } from '../../api/sla'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { errorMessage } from './adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from './AdminUi'

const slaKey = (regionId: number) => ['region-sla', regionId] as const

/**
 * "SLA time" on a company's Approvers tab (Flutter: approval_time_limits_card.dart). How long each
 * approval step has: past it the approver gets an "Approval overdue" alert, and one more full SLA
 * time later the next step + Admin get "Approval escalated".
 */
export function SlaTimeButton({ regionId }: { regionId: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <OutlineButton className="inline-flex w-full items-center justify-center gap-2 py-2.5" onClick={() => setOpen(true)}>
        <PiTimer className="h-[18px] w-[18px]" aria-hidden />
        SLA time
      </OutlineButton>
      {open && <SlaTimeDialog regionId={regionId} onClose={() => setOpen(false)} />}
    </>
  )
}

function SlaTimeDialog({ regionId, onClose }: { regionId: number; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: slaKey(regionId), queryFn: () => fetchRegionSla(regionId) })
  return (
    <Modal title="SLA time" onClose={onClose}>
      <p className="mb-3 text-[12.5px] leading-relaxed text-brand-textmuted">
        If an approver does not act in time they get an overdue alert. One more full SLA time later, the next step and
        Admin are alerted.
      </p>
      {isLoading && <LoadingSpinner />}
      {error && <p className="text-sm text-brand-danger">{errorMessage(error, 'Could not load SLA time.')}</p>}
      {data && <SlaForm key={regionId} sla={data} regionId={regionId} onClose={onClose} />}
    </Modal>
  )
}

function SlaForm({ sla, regionId, onClose }: { sla: RegionSla; regionId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      sla.stages.map((s) => {
        const mins = Math.round(s.hours * 60)
        return [s.stage, { h: String(Math.floor(mins / 60)), m: String(mins % 60) }]
      }),
    ),
  )
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (hours: Record<string, number>) => updateRegionSla(regionId, hours),
    onSuccess: (updated) => {
      qc.setQueryData(slaKey(regionId), updated)
      onClose()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const out: Record<string, number> = {}
    for (const s of sla.stages) {
      const v = values[s.stage]
      const h = v.h.trim() === '' ? 0 : Number(v.h)
      const m = v.m.trim() === '' ? 0 : Number(v.m)
      const hours = h + m / 60
      if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || hours < sla.min_hours - 1e-9 || hours > sla.max_hours) {
        setFormError(`${s.label}: enter between 5 minutes and ${sla.max_hours} hours`)
        return
      }
      out[s.stage] = hours
    }
    setFormError(null)
    save.mutate(out)
  }

  const set = (stage: string, part: 'h' | 'm', value: string) =>
    setValues((prev) => ({ ...prev, [stage]: { ...prev[stage], [part]: value.replace(/\D/g, '') } }))

  return (
    <form onSubmit={submit} className="space-y-2.5">
      {sla.stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-brand-text">{s.label}</div>
            <div className="text-xs text-brand-textmuted">Now {formatSlaHours(s.hours)}</div>
          </div>
          <NumberBox label="hrs" value={values[s.stage].h} onChange={(v) => set(s.stage, 'h', v)} />
          <NumberBox label="min" value={values[s.stage].m} onChange={(v) => set(s.stage, 'm', v)} />
        </div>
      ))}
      {(formError || save.error) && (
        <p className="text-sm text-brand-danger">{formError ?? errorMessage(save.error)}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <OutlineButton onClick={onClose}>Cancel</OutlineButton>
        <PrimaryButton type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </form>
  )
}

function NumberBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative w-24">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`${inputClass} pr-10 text-right`}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-textmuted">
        {label}
      </span>
    </label>
  )
}
