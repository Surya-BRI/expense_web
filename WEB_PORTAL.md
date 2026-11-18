# Expense web portal: what it is and how it works

> The browser version of the expense app, for approvers and Admin. It replaces the outdated
> parts of [`SETUP_AND_INTEGRATION.md`](SETUP_AND_INTEGRATION.md) (that file still describes the
> first HOD/Accountant-only version). Last updated: 18 Nov 2026.

---

## 1. One backend, two frontends

```
                    ┌─────────────────────────────┐
  Flutter app  ───► │  FastAPI backend (one only) │ ◄───  Web portal (this repo)
  (d:/expense_app)  │  expensetracker-api…        │      (d:/expense_app_web)
  all roles         │  DB: ERP-Dev (SQL Server)   │      approvers + Admin
                    └─────────────────────────────┘
```

| | Flutter app | Web portal |
|---|---|---|
| Repo | `Surya-BRI/PettyExpense` (branch `indra`) | `Surya-BRI/expense_web` (branch `main`) |
| Folder | `d:/expense_app` (backend in `backend/`) | `d:/expense_app_web` |
| Who uses it | Everyone; **employees only use the app** (scanning bills) | HOD, Accountant, Finance Manager, Admin |
| Stack | Flutter + Riverpod | React 19 + TypeScript + Vite + Tailwind + TanStack Query |
| Hosting | APK / app build | Vercel |

**The rule:** all business logic lives in the **backend**. The web portal and the app only display
what the server sends and call its endpoints. So:

- A rule change (who approves, petty cash limits, SLA, backups, payments) is made **once, in the
  backend** (`d:/expense_app/backend`), and both frontends get it.
- A **new screen or button** has to be added **in both** frontends. Each feature below names its
  Flutter file, so the two can be kept in step.
- Same logins (`ErpAuthExpenseUsers`), same data, same emails/notifications.

Backend URL: `VITE_API_BASE_URL` in `.env.production` / `.env.development` / Vercel
(`https://expensetracker-api.app-brisigns.com`).

---

## 2. Who sees what

| Role | Landing page | Menu |
|---|---|---|
| HOD | `/queue/hod` | My Queue · Dept HOD Queue · History · *petty cash* · **My backup** · Alerts · Profile |
| Accountant | `/queue/accountant` | My Queue · History · *petty cash* · **My backup** · Alerts · Profile |
| Head of Accountant (BRC) | `/queue/head_accountant` | My Queue · History · Petty cash · **My backup** · Alerts · Profile |
| Finance Manager | `/queue/finance_manager` | My Queue · History · *petty cash* · Payments · **My backup** · Alerts · Profile |
| Admin | `/admin` | Companies · People · Top-ups · Advances · Petty cash · Payments · **Aging report** · Alerts · Profile |
| Employee | — | Uses the Flutter app (no web screens) |

*Petty cash* depends on the signed-in company's model (`user.pca_model`, sent at login):

| Company (`pca_model`) | Menu | Page |
|---|---|---|
| BRI, Oman (`department`) | Funds (HOD) / Top-ups (+ Funds for FM) | `/topups`, `/funds` |
| Blue Rhine Contracting (`site`) | Petty cash | `/site-pca` |
| Professional Signs (`employee`) | Advances | `/advances` |

`/topups` and `/funds` send BRC / Professional Signs people to their own page
(`src/routing/RequirePcaModel.tsx`), as the Flutter router does.

Role routing: `src/routing/roleLanding.ts`, route guards: `src/routing/router.tsx`. The role
list is `Role` / `APPROVER_ROLES` in `src/api/types.ts`.

Admin's **company page** has tabs per company model (`region.pca_model`), as
`admin_company_screen.dart`:

| Company | Tabs |
|---|---|
| BRI, Oman | Departments · Top-ups · Approvers |
| Blue Rhine Contracting | Employees · Top-ups · Approvers |
| Professional Signs | Employees · Requests · Accounts cash · Approvers |

The **Approvers** tab shows each company's real steps: BRC Accountant → Head of Accountant →
Finance Manager, Professional Signs HOD → Accounts Manager, others HOD → Accountant → Finance
Manager.

---

## 3. The flows

### 3.1 Approval steps per company

Each company's steps come from its approval matrix on the server.

| Company | Steps | Last step |
|---|---|---|
| BRI (Dubai), Oman | HOD → Accountant → Finance Manager | Finance Manager |
| BRC (Blue Rhine Contracting) | Accountant → Head of Accountant → Finance Manager (no HODs) | Finance Manager |
| Professional Signs (KSA) | HOD → Accounts Manager (`finance_manager`) | Accounts Manager |

- **HOD step:** every HOD of the employee's department gets the bill; any one can approve. The
  first to act moves it on.
- **Another department's items** (e.g. IT Equipment on a Sales bill): an extra **Dept HOD** step
  after the HOD, for that department's HODs (web: "Dept HOD Queue").
- **Nobody set up for a step** in that company → **Admin** gets the bill.
- **Dispute** sends the bill back to the employee; when they resubmit it returns to the **same step**.
- **Reject** ends it.

Web: `features/approval-queue`, `features/claim-detail` · App: `approval_queue_screen.dart`,
`approval_detail_screen.dart`.

### 3.2 Petty cash vs reimbursement

| | BRI / Oman | BRC | Professional Signs (KSA) |
|---|---|---|---|
| Whose petty cash | Department's (or an employee's own) | Each employee's | Each employee's advance (PCA) |
| Taken off at | **Finance Manager's final approval** | Final approval | Final approval |
| Payment step for petty cash? | **No**, status "Approved – Settled" | No | **Yes**: paying refills the advance |
| Refill | Top-up request (HOD → Accountant → FM) | Site top-up steps | Paying the bill |

- **Blue Rhine Contracting petty cash** (`/site-pca`, `features/site-pca/*`, API `/api/site-pca/*`;
  app `pca/site_pca_screen.dart`): Employees list with each person's petty cash and bills; the
  Accountant / Head of Accountant **set petty cash**; top-ups: Accountant prepares → Head of
  Accountant approves → Finance Manager approves & records the payment (or rejects).
- **Professional Signs advances** (`/advances`, `features/advances/*`, API `/api/pca/*`; app
  `pca/advances_screen.dart`, `pca/accounts_cash_view.dart`): Employees (departments → employees,
  HOD / Admin set an employee's petty cash), Requests (advance steps: HOD → Accounts Manager →
  Accounts pays), **Accounts cash** (the Accounts Department's own petty cash: amount, refills
  from bank, low alert; Accountant, Accounts Manager, Admin).
- **KSA journal:** at the Accounts Manager's approval the web asks for the expense journal
  (**EJV** / **EJVB** + ERP number), like the app; the claim then shows it.
- **Held amounts:** while a petty cash bill is in approval its amount is **held**: a new bill is
  checked against *left − held*. The web Profile card shows "X can use now · Y held for bills
  waiting for approval" (same as the app's menu card), and a refused bill says how much is held.

### 3.3 Payments (Spec 5.5)

After the final approval a **reimbursement** is **Approved – Unpaid**. The Finance Manager (or
Admin) records the payment: Payments page, or **Record payment** on a claim.

- BRI / BRC / Oman: **payment method** (Bank transfer / Cash / Payroll / Cheque) + reference + date.
- Professional Signs: **Process 1** (cash withdrawal from bank) or **Process 2** (direct payment by
  Accounts, from the Accounts Department's own petty cash) + reference + date.
- The claim becomes **Paid**; the employee gets a "Claim paid" notification + email; one row in
  `payment_records` (`ErpExpensePaymentRecord`).
- Everything goes through `POST /api/payments` (`api/payments.ts`, `RecordPaymentDialog` in
  `features/payments/PaymentsPage.tsx`). The old one-click `/api/admin/claims/{id}/mark-paid` is
  **no longer used by the web** (it recorded no method, reference or date).

### 3.4 SLA time and escalation (PG-10)

- **Admin sets the SLA time** per step per company: Companies → company → **Approvers** tab →
  **SLA time** (hours + minutes; 5 min to 720 hrs). Web: `features/admin/SlaTimeDialog.tsx` ·
  App: `approval_time_limits_card.dart`.
- The clock starts when a bill reaches a step. The server checks every 5 minutes:
  1. **SLA time passed** → the approver(s) get **"Approval overdue"** (in-app + email); the bill
     shows a red **Overdue** flag in the queue.
  2. **Another full SLA time passed** → the **next step's approvers + Admin** get **"Approval
     escalated"** (last step → Admin only). Sent once.
- Approve starts a new clock for the next step. Dispute / reject stop it; resubmit starts it fresh.
- **Aging report** (Admin): `/admin/aging` (`features/admin/AgingReportPage.tsx`) lists every
  bill waiting on an approver: who has it, how long it's waited, how overdue, and On time /
  SLA breached / Escalated. App: `aging_report_screen.dart`.

### 3.5 Backup approvers (Spec 5.2)

- An approver sets **who covers them** for a date range: **My backup** (`/backup`,
  `features/backup/MyBackupPage.tsx`); Admin can do it for anyone on **People → person**
  (`features/admin/PersonPage.tsx`). Shared panel: `features/backup/BackupPanel.tsx`.
- Allowed backups (checked by the server): **same company**, **same level or higher**
  (HOD < Accountant < Head of Accountant < Finance Manager), an HOD only from the **same
  department**. No overlapping dates; dates are Gulf time.
- During the dates the approver's bills go to the backup: queue, approve/dispute/reject, emails,
  SLA alerts. The backup sees them in **their own queue**, tagged **"Covering for &lt;name&gt;"**,
  even when the step isn't their role's (e.g. a Finance Manager covering an HOD). The web opens a
  covered bill at its real step so the decision buttons show (`QueueRow.tsx`).
- Other approvers on the same step still get the bill. The backup replaces only the absent person.
- When the dates end, or the backup is removed, bills go back automatically.

### 3.6 Alerts

`features/notifications/AlertsPage.tsx` mirrors `notifications_screen.dart`:

| Type | Title | Opens |
|---|---|---|
| `submission`, `approval_pending`, `resubmit` | New claim / awaiting approval / resubmitted | The claim at its step |
| `slaw_*` | Approval overdue | The claim (Admin: Aging report) |
| `slae_*` | Approval escalated | The claim (Admin: Aging report) |
| `delegation_*` | You are the backup approver for … | Your queue |
| `topup_*`, `fund_low_*` | Top-up step / low funds | Top-ups |
| `pca_site_*` | BRC petty cash set / top-up step | Petty cash (Top-ups tab) |
| `pca_accounts_cash_*` | Accounts cash low / changed | Advances → Accounts cash |
| other `pca_*` | Advance / top-up step | Advances |
| `paid`, `approval`, `rejection`, `dispute` | Claim paid / approved / rejected / disputed | The claim |

---

## 4. Backend endpoints the web uses

All under the backend URL; JWT bearer auth with one refresh-and-retry on 401 (`src/api/client.ts`).

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `/refresh`, `/logout`, `/switch-region`; `GET /api/auth/me` |
| Approvals | `GET /api/approvals/queue?stage=`, `GET /api/approvals/{id}`, `POST /api/approvals/{id}/approve\|dispute\|reject`, `POST /api/approvals/bulk-approve`, `GET /api/approvals/history`, `GET /api/approvals/{id}/funds` |
| My backup | `GET/POST /api/approvals/backup`, `DELETE /api/approvals/backup/{id}` |
| Payments | `GET /api/payments?status=unpaid\|paid`, `POST /api/payments` |
| Funds / top-ups | `/api/funds/*`, `/api/topups*`, `/api/admin/funds*`, `/api/admin/department-funds` |
| Notifications | `GET /api/notifications`, `/unread-count`; `POST /{id}/read`, `/read-all` |
| Admin | `/api/admin/claims*`, `/api/admin/users*`, `/api/admin/config/regions*`, `/api/admin/config/departments` |
| SLA / Aging | `GET/PUT /api/admin/config/regions/{id}/sla`, `GET /api/admin/reports/aging?region_id=` |
| BRC petty cash | `/api/site-pca/pots`, `/people`, `/employees/{id}/bills`, `/pots/{id}/replenishable-bills`, `/pots/{id}/topups`, `/requests`, `/requests/{id}/approve\|pay\|reject` |
| KSA advances | `/api/pca/advances`, `/staff`, `/departments`, `/departments/{id}/employees`, `/requests`, `/requests/{id}/hod-approve\|manager-approve\|pay\|reject`, `/accounts-cash`, `/accounts-cash/refills` |
| Admin backups | `GET/POST /api/admin/config/delegations`, `GET /api/admin/config/delegations/candidates?approver_id=`, `DELETE /api/admin/config/delegations/{id}` |

Field names match the backend exactly (`src/api/types.ts`, `sla.ts`, `backup.ts`, `payments.ts`).

---

## 5. Run, build, deploy

```bash
cd d:/expense_app_web
npm install
npm run dev        # http://localhost:6001, talks to the live backend
npm run build      # type-check + production build (dist/)
npm run lint       # oxlint
```

Deploy: push `main` → Vercel builds it. `VITE_API_BASE_URL` is set in Vercel (Production +
Preview). `vercel.json` has the SPA rewrite.

**Order when a change touches both sides:** deploy the **backend first** (new endpoints/fields),
then the web and the app. The web ignores fields it doesn't know, so an older web keeps working.

---

## 6. Adding a feature: checklist

1. Backend: rule + endpoint in `d:/expense_app/backend` (+ tests in `backend/tests`).
2. App: screen in `d:/expense_app/lib/src/features/...`.
3. Web: API call in `src/api/`, page/component in `src/features/...`, route in
   `src/routing/router.tsx`, menu link in `src/components/AppShell.tsx`.
4. Same labels and wording in both frontends (copy the Flutter text).
5. Update this file and `d:/expense_app/assets/docs/WEB_PORTAL.md`.
