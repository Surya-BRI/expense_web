// Mirrors the demo-user dropdown in the Flutter app's login_screen.dart, scoped
// to just the hod/accountant seed accounts this web app supports.
export interface DemoUser {
  username: string
  password: string
  label: string
}

export const demoUsers: DemoUser[] = [
  { username: 'sajeesh', password: 'sajeesh123', label: 'Sajeesh (HOD · Sales)' },
  { username: 'denny', password: 'denny123', label: 'Denny (HOD · IT)' },
  { username: 'anjana', password: 'anjana123', label: 'Anjana (Accountant)' },
]
