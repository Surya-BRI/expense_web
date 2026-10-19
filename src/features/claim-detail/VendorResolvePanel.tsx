import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchVendors, resolveVendor } from '../../api/approvals'
import { ApiError } from '../../api/client'

export function VendorResolvePanel({
  claimId,
  vendorRawText,
  onResolved,
}: {
  claimId: number
  vendorRawText: string
  onResolved: () => void
}) {
  const [mode, setMode] = useState<'link' | 'new'>('link')
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'new'
        ? resolveVendor(claimId, { vendor_id: null, create_new: true })
        : resolveVendor(claimId, { vendor_id: selectedVendorId!, create_new: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] })
      onResolved()
      setOpen(false)
    },
  })

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()),
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-xl bg-brand-darkblue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Resolve vendor
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-brand-divider bg-brand-card p-4">
      <p className="text-sm font-medium text-brand-text">
        Resolve "{vendorRawText}"
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex-1 rounded-xl border py-1.5 text-sm font-medium transition-colors ${
            mode === 'link'
              ? 'border-brand-darkblue bg-brand-darkblue text-white'
              : 'border-brand-divider text-brand-text hover:bg-brand-lightblue'
          }`}
        >
          Link to existing vendor
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`flex-1 rounded-xl border py-1.5 text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'border-brand-darkblue bg-brand-darkblue text-white'
              : 'border-brand-divider text-brand-text hover:bg-brand-lightblue'
          }`}
        >
          Confirm as new vendor
        </button>
      </div>

      {mode === 'link' && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-divider bg-brand-background px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
          />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-brand-divider">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-brand-textmuted">No vendors found.</p>
            )}
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVendorId(v.id)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  selectedVendorId === v.id
                    ? 'bg-brand-lightblue font-medium text-brand-darkblue'
                    : 'text-brand-text hover:bg-brand-background'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'new' && (
        <p className="text-sm text-brand-textmuted">
          "{vendorRawText}" will be added as a new vendor in the system.
        </p>
      )}

      {mutation.error && (
        <p className="text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Failed to resolve vendor.'}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-brand-divider px-3 py-1.5 text-sm text-brand-text hover:bg-brand-background"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (mode === 'link' && selectedVendorId === null)}
          className="rounded-xl bg-brand-orange px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
