// Mirrors _stageLabels in lib/src/features/approvals/approval_detail_screen.dart.
const STAGE_LABELS: Record<string, string> = {
  hod: 'HOD',
  department_hod: 'Department HOD',
  accountant: 'Accountant',
  finance_manager: 'Finance Manager',
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return 'None'
  return STAGE_LABELS[stage] ?? stage
}
