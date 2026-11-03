// Test-login quick-fill for the login form, grouped by company (region).
// Every seeded account from Flutter's _demoAccounts (login_screen.dart) that can use the
// web app: HOD, Accountant, Finance Manager and Admin. Employees are left out -- the web
// app has no employee screens (they use the Flutter app).
// All seeded accounts use Test@1234 (set by backend/scripts/seed_dev_erp_users.py).
export interface DemoUser {
  username: string
  password: string
  label: string
  group: string
}

export const demoUsers: DemoUser[] = [
  { username: 'priya_sales_hod',   password: 'Test@1234', label: 'Priya · HOD · Sales',     group: 'Dubai' },
  { username: 'vikram_it_hod',     password: 'Test@1234', label: 'Vikram · HOD · IT',       group: 'Dubai' },
  { username: 'ravi_accountant',   password: 'Test@1234', label: 'Ravi · Accountant',       group: 'Dubai' },
  { username: 'meera_finance_mgr', password: 'Test@1234', label: 'Meera · Finance Manager', group: 'Dubai' },
  // UAE = Blue Rhine Contracting (seed_dev_erp_users.py --uae).
  { username: 'uae_sales_hod',     password: 'Test@1234', label: 'Hamdan · HOD · Sales',    group: 'UAE' },
  { username: 'uae_it_hod',        password: 'Test@1234', label: 'Rashid · HOD · IT',       group: 'UAE' },
  { username: 'uae_accountant',    password: 'Test@1234', label: 'Mariam · Accountant',     group: 'UAE' },
  { username: 'uae_finance_mgr',   password: 'Test@1234', label: 'Sultan · Finance Manager', group: 'UAE' },
  { username: 'ksa_sales_hod',     password: 'Test@1234', label: 'Khalid · HOD · Sales',    group: 'KSA' },
  { username: 'ksa_it_hod',        password: 'Test@1234', label: 'Omar · HOD · IT',         group: 'KSA' },
  { username: 'ksa_accountant',    password: 'Test@1234', label: 'Noura · Accountant',      group: 'KSA' },
  { username: 'ksa_finance_mgr',   password: 'Test@1234', label: 'Faisal · Finance Manager', group: 'KSA' },
  { username: 'arjun_admin',       password: 'Test@1234', label: 'Arjun · Admin',           group: 'All companies' },
]

/** Groups in the order they first appear in the list. */
export const demoGroups: string[] = [...new Set(demoUsers.map((u) => u.group))]
