// ERP user quick-fill list for the login form, scoped to hod/accountant accounts.
// Mirrors Flutter's _demoAccounts in login_screen.dart.
// All seeded accounts use Test@1234 (set by backend/scripts/seed_dev_erp_users.py).
export interface DemoUser {
  username: string
  password: string
  label: string
}

export const demoUsers: DemoUser[] = [
  { username: 'priya_sales_hod',  password: 'Test@1234', label: 'Priya (HOD · Sales)' },
  { username: 'vikram_it_hod',    password: 'Test@1234', label: 'Vikram (HOD · IT)' },
  { username: 'ravi_accountant',  password: 'Test@1234', label: 'Ravi (Accountant)' },
  { username: 'meera_finance_mgr', password: 'Test@1234', label: 'Meera (Finance Manager)' },
]
