import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 20

// Client-side pagination: the backend returns the full queue/claims list in one
// response, so we page through it here rather than adding a paged endpoint.
// `resetKey` should change whenever the caller's filters/search change, so the
// page resets to 1 instead of staying stuck past the last item of a new filter.
export function usePagination<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const clampedPage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => items.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [items, clampedPage],
  )

  return { page: clampedPage, totalPages, pageItems, setPage }
}
