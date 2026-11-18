import { fetchMyBackup, removeMyBackup, setMyBackup } from '../../api/backup'
import { BackupPanel } from './BackupPanel'

/** Approver's own page: who covers my bills while I'm away (Flutter: MyBackupScreen). */
export function MyBackupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-brand-text">My backup</h1>
      <BackupPanel
        queryKey={['my-backup']}
        whose="your"
        load={fetchMyBackup}
        save={setMyBackup}
        remove={removeMyBackup}
      />
    </div>
  )
}
