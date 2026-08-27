import type { ReceiptInfo } from '../../api/types'

// A plain <img> never sends custom headers, so unlike the Flutter app's manual
// byte-fetch path we don't need to special-case presigned S3 URLs vs the proxy
// URL — the browser handles both the same way. If image_proxy_url ever turns
// out to require a bearer token, this needs a blob-fetch fallback instead.
export function ReceiptViewer({ receipt }: { receipt: ReceiptInfo | null }) {
  if (!receipt) {
    return (
      <div className="rounded-md border border-brand-divider bg-brand-card p-4">
        <p className="text-sm text-brand-textmuted">No receipt attached.</p>
      </div>
    )
  }

  const src = receipt.image_url ?? receipt.image_proxy_url

  return (
    <div className="rounded-md border border-brand-divider bg-brand-card p-3">
      {src ? (
        <img
          src={src}
          alt="Receipt"
          className="w-full rounded-md border-2 border-brand-divider object-contain shadow-sm"
        />
      ) : (
        <p className="text-sm text-brand-textmuted">Receipt image unavailable.</p>
      )}

      {(receipt.ocr_vendor || receipt.ocr_amount != null || receipt.ocr_date) && (
        <dl className="mt-3 space-y-1 border-t border-brand-divider pt-3 text-sm">
          {receipt.ocr_vendor && (
            <div className="flex justify-between">
              <dt className="text-brand-textmuted">OCR vendor</dt>
              <dd className="text-brand-text">{receipt.ocr_vendor}</dd>
            </div>
          )}
          {receipt.ocr_amount != null && (
            <div className="flex justify-between">
              <dt className="text-brand-textmuted">OCR amount</dt>
              <dd className="text-brand-text">
                {receipt.ocr_amount} {receipt.ocr_currency}
              </dd>
            </div>
          )}
          {receipt.ocr_date && (
            <div className="flex justify-between">
              <dt className="text-brand-textmuted">OCR date</dt>
              <dd className="text-brand-text">{receipt.ocr_date}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
