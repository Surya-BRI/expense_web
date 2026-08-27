export type Role = 'employee' | 'hod' | 'accountant' | 'finance_manager' | 'admin'

export interface AuthUser {
  id: number
  display_name: string
  role: Role
  department_id: number | null
  email: string | null
  // Present on POST /login and /refresh's `user` object; ABSENT on GET /me.
  username?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  user: AuthUser
}

export interface ReceiptInfo {
  id: number
  s3_key: string
  content_type: string
  ocr_vendor: string | null
  ocr_amount: number | null
  ocr_vat_amount: number | null
  ocr_total_amount: number | null
  ocr_currency: string | null
  ocr_date: string | null
  ocr_confidence: number | null
  image_hash: string | null
  image_url: string | null
  image_proxy_url: string | null
}

export interface HistoryItem {
  id: number
  stage: string
  actor_id: number
  action: string
  remarks: string | null
  created_at: string
}

export type ClaimStatus = 'submitted' | 'approved' | 'rejected' | 'disputed' | 'paid' | string

export interface DuplicateWarning {
  reason: string
  message: string
  existing_claim_id?: number
}

export interface Transaction {
  id: number
  type: string
  employee_id: number
  employee_name: string
  region_id: number | null
  region_code: string | null
  project_id: number | null
  category_id: number | null
  category_name: string | null
  vendor_id: number | null
  vendor_name: string | null
  bill_date: string
  currency: string
  exchange_rate: number
  amount: number
  vat_amount: number
  total_amount: number
  op_number: string | null
  status: ClaimStatus
  current_stage: string | null
  dispute_returned: boolean
  remarks: string | null
  duplicate_flag: boolean
  ocr_confidence_json: unknown | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  decided_at: string | null
  paid_at: string | null
  receipt: ReceiptInfo | null
  duplicate_warning: DuplicateWarning | null
  stage_sequence: string[]
  // Present on GET /api/approvals/:id, ABSENT on GET /api/approvals/queue.
  history?: HistoryItem[]
}

export type SkipReason =
  | 'not_found'
  | 'not_awaiting_approval'
  | 'not_your_stage'
  | 'duplicate_flagged'
  | 'vendor_unresolved'
  | 'over_bulk_threshold'

export interface BulkApproveResponse {
  approved: number[]
  skipped: { id: number; reason: SkipReason }[]
}

export interface ValidationErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface ApiErrorBody {
  detail: string | ValidationErrorDetail[]
}
