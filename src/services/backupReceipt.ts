export type BackupExportResult = { status: 'saved' | 'cancelled' | 'download-started' };
const key = 'jy_device_last_saved_backup_v1';
type ReceiptStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readBackupReceipt(storage?: ReceiptStorage): string | undefined {
  try { const value=(storage ?? localStorage).getItem(key); return value && Number.isFinite(Date.parse(value)) ? value : undefined; } catch { return undefined; }
}
/** Local device metadata: never exported, restored, or synchronized as business data. */
export function recordBackupReceipt(result: BackupExportResult, storage: ReceiptStorage | undefined = undefined, now = new Date()): string | undefined {
  if(result.status!=='saved') return undefined;
  const stamp=now.toISOString(); (storage ?? localStorage).setItem(key,stamp); return stamp;
}
