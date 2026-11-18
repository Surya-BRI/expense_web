// head_accountant: Blue Rhine Contracting's second accounts step (Accountant -> Head of
// Accountant -> Finance Manager).
export type Role = 'employee' | 'hod' | 'accountant' | 'head_accountant' | 'finance_manager' | 'admin'

/** Every approver role (works an approval queue). */
export const APPROVER_ROLES: Role[] = ['hod', 'accountant', 'head_accountant', 'finance_manager']

export function isApproverRole(role: string | null | undefined): boolean {
  return APPROVER_ROLES.includes((role ?? '') as Role)
}

export interface AuthUser {
  id: number
  display_name: string
  role: Role
  department_id: number | null
  department_name: string | null
  email: string | null
  region_code: string | null
  // Home company + Admin-ticked companies this person covers (login, refresh and /me).
  allowed_regions?: string[]
  // Present on POST /login and /refresh's `user` object; ABSENT on GET /me.
  username?: string
  /** Signed-in company's petty cash model: department (BRI, Oman) | employee (Professional
   * Signs advances) | site (Blue Rhine Contracting, one petty cash per employee). */
  pca_model?: 'department' | 'employee' | 'site' | string
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
  actor_name?: string | null
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

export interface LineItem {
  id: number
  line_no: number
  description: string
  quantity: number | null
  amount: number
  category_id: number | null
  category_name: string | null
  op_number: string | null
  /** In the company's base currency; null while a foreign-currency bill has no rate. */
  amount_base?: number | null
  /** Set when this line belongs to another department than the employee's: that
   * department's HOD approves it (department_hod stage) and its petty cash pays for it. */
  owning_department_id?: number | null
  owning_department_name?: string | null
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
  bill_number: string | null
  currency: string
  exchange_rate: number
  amount: number
  vat_amount: number
  total_amount: number
  op_number: string | null
  status: ClaimStatus
  /** Base stage (hod | department_hod | accountant | finance_manager). */
  current_stage: string | null
  /** Full stage key, e.g. 'department_hod:7' -- matches stage_sequence / stage_labels. */
  current_stage_key?: string | null
  /** Stage key -> label with the department name ("Department HOD (IT)"). */
  stage_labels?: Record<string, string>
  /** The bill in its company's base currency (what petty cash is debited / reimbursed). */
  base_currency?: string | null
  total_amount_base?: number | null
  /** not_applicable (petty cash) | unpaid | paid. */
  payment_status?: string | null
  /** Professional Signs (KSA): paid as Process 1 / Process 2 instead of a payment method. */
  pays_by_process?: boolean
  /** The step that books the expense journal (Professional Signs: finance_manager = Accounts
   * Manager); null = no journal step in this company. */
  journal_stage?: string | null
  /** EJV | EJVB, and its ERP number, once recorded. */
  journal_type?: string | null
  journal_reference?: string | null
  /** When the current step's SLA time runs out (naive UTC ISO); null when not waiting on an approver. */
  stage_due_at?: string | null
  /** 0 on time, 1 approver warned (overdue), 2 escalated to the next step + Admin. */
  sla_state?: number
  /** Approval queue only: the approvers this user is standing in for (they're their backup today). */
  covering_for?: string[]
  payment?: {
    amount: number
    currency: string
    payment_method: string
    payment_method_label: string | null
    payment_reference: string
    payment_date: string | null
    paid_by_name: string | null
    remarks: string | null
  } | null
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
  line_mode: 'single' | 'multiple'
  line_items: LineItem[]
  // Present on GET /api/approvals/:id, ABSENT on GET /api/approvals/queue.
  history?: HistoryItem[]
}

export interface HistoryTransaction extends Transaction {
  my_action: 'approve' | 'reject' | 'dispute'
  my_action_stage: string
  my_actioned_at: string | null
  my_comment: string | null
}

export type SkipReason =
  | 'not_found'
  | 'not_awaiting_approval'
  | 'not_your_stage'
  | 'duplicate_flagged'
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
