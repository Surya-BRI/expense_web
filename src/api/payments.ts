import { fetchJson } from './client'
import type { Transaction } from './types'

/** payment_service.payment_to_dict. */
export interface PaymentRecord {
  id: number
  transaction_id: number
  amount: number
  currency: string
  payment_method: string
  payment_method_label: string | null
  payment_reference: string
  payment_date: string | null
  paid_by: number | null
  paid_by_name: string | null
  remarks: string | null
  recorded_at: string | null
}

/** A claim row from GET /api/payments (transaction_to_dict + what is owed + the payment). */
export interface PaymentClaim extends Transaction {
  payable_amount?: number | null
  payable_currency?: string | null
  base_currency?: string | null
  total_amount_base?: number | null
  payment: PaymentRecord | null
}

export interface PaymentsPage {
  items: PaymentClaim[]
  total: number
  offset: number
  limit: number
  /** Sum of the payable amounts per currency, over the whole filtered list. */
  totals: Record<string, number>
}

export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  payroll: 'Payroll',
  cheque: 'Cheque',
}

/** What the employee is owed, in the company's base currency (payment_sheet.dart payableFor). */
export function payableFor(c: PaymentClaim): { amount: number; currency: string } {
  if (c.payable_amount != null && c.payable_currency) return { amount: c.payable_amount, currency: c.payable_currency }
  if (c.total_amount_base != null && c.base_currency) return { amount: c.total_amount_base, currency: c.base_currency }
  return { amount: c.total_amount ?? c.amount + c.vat_amount, currency: c.currency }
}

/** Finance Manager / Admin: approved reimbursements waiting for payment, or paid ones. */
export function fetchPayments(params: {
  status: 'unpaid' | 'paid'
  regionCode?: string | null
  limit?: number
  offset?: number
}): Promise<PaymentsPage> {
  const qs = new URLSearchParams({
    status: params.status,
    limit: String(params.limit ?? 200),
    offset: String(params.offset ?? 0),
  })
  if (params.regionCode) qs.set('region_code', params.regionCode)
  return fetchJson(`/api/payments?${qs.toString()}`)
}

export function recordPayment(body: {
  transaction_id: number
  payment_method: string
  payment_reference: string
  payment_date: string
  remarks: string | null
}): Promise<PaymentRecord> {
  return fetchJson('/api/payments', { method: 'POST', body: JSON.stringify(body) })
}
