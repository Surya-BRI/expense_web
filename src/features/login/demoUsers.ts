// Test-login quick-fill for the login form, grouped by company (ERP names).
// Seeded accounts (backend/scripts/seed_dev_erp_users.py) that can use the web app: HOD,
// Accountant, Head of Accountant, Finance Manager and Admin. Employees are left out -- the web
// app has no employee screens (they use the Flutter app). All use Test@1234.
//
// Per company, only the roles its approval flow has:
//   BRI UAE (DUBAI)        HOD -> Accountant -> Finance Manager
//   BRC (UAE)              Accountant -> Head of Accountant -> Finance Manager (no HODs)
//   Professional Signs     HOD -> Accounts Manager (role finance_manager); the Accountant is the
//   (KSA)                  Accounts Department (pays advances, Accounts cash)
export interface DemoUser {
  username: string
  password: string
  label: string
  group: string
}

export const demoUsers: DemoUser[] = [
  { username: 'priya_sales_hod',   password: 'Test@1234', label: 'Priya · HOD · Sales',           group: 'BRI UAE · Blue Rhine Industries' },
  { username: 'vikram_it_hod',     password: 'Test@1234', label: 'Vikram · HOD · IT',             group: 'BRI UAE · Blue Rhine Industries' },
  { username: 'ravi_accountant',   password: 'Test@1234', label: 'Ravi · Accountant',             group: 'BRI UAE · Blue Rhine Industries' },
  { username: 'meera_finance_mgr', password: 'Test@1234', label: 'Meera · Finance Manager',       group: 'BRI UAE · Blue Rhine Industries' },
  // Same BRC logins as the Flutter login screen (login_screen.dart _demoAccounts).
  { username: 'BRCAccount',        password: 'BRCAccount@2026', label: 'BRC · Accountant',        group: 'BRC · Blue Rhine Contracting' },
  { username: 'uae_head_accountant', password: 'Test@1234',     label: 'Layla · Head of Accountant', group: 'BRC · Blue Rhine Contracting' },
  { username: 'uae_finance_mgr',   password: 'Test@1234', label: 'Sultan · Finance Manager',      group: 'BRC · Blue Rhine Contracting' },
  { username: 'ksa_sales_hod',     password: 'Test@1234', label: 'Khalid · HOD · Sales',          group: 'Professional Signs' },
  { username: 'ksa_it_hod',        password: 'Test@1234', label: 'Omar · HOD · IT',               group: 'Professional Signs' },
  { username: 'ksa_accountant',    password: 'Test@1234', label: 'Noura · Accountant · Accounts Dept', group: 'Professional Signs' },
  { username: 'ksa_finance_mgr',   password: 'Test@1234', label: 'Faisal · Accounts Manager',     group: 'Professional Signs' },
  { username: 'arjun_admin',       password: 'Test@1234', label: 'Arjun · Admin',                 group: 'All companies' },
]

/** Groups in the order they first appear in the list. */
export const demoGroups: string[] = [...new Set(demoUsers.map((u) => u.group))]
