import type { BackupExportResult } from './backupReceipt.ts';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const NativeAppearance = registerPlugin<{
  setTheme(options: { dark: boolean }): Promise<void>;
  hideKeyboard(): Promise<void>;
  prepareReminderChannels(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  addListener(event: 'keyboardVisibilityChange', listener: (state: { visible: boolean }) => void): Promise<PluginListenerHandle>;
}>('Appearance');

const BackupExport = registerPlugin<{ save(options: { uri: string; name: string; mime: string }): Promise<BackupExportResult> }>('BackupExport');

/** Android confirms the actual document write; download-only browsers cannot confirm completion. */
export async function exportBackupFile(content: string | Uint8Array): Promise<BackupExportResult> {
  const binary=typeof content!=='string';
  const name = `jinri-youxu-backup-${Date.now()}.${binary?'zip':'json'}`;
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const file = await Filesystem.writeFile({
      path: `backups/${name}`,
      data: binary ? await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('备份编码失败'));r.readAsDataURL(new Blob([(content as Uint8Array).slice().buffer]));}) : content as string,
      directory: Directory.Cache,
      ...(binary?{}:{encoding:Encoding.UTF8}),
      recursive: true,
    });
    try { return await BackupExport.save({ uri: file.uri, name, mime: binary ? 'application/zip' : 'application/json' }); }
    finally { await Filesystem.deleteFile({ path: `backups/${name}`, directory: Directory.Cache }).catch(() => {}); }
  }
  const picker=(window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }> }).showSaveFilePicker;
  if(picker) {
    try {
      const handle=await picker.call(window,{ suggestedName:name,types:[{description:'今日有序完整备份',accept:{[binary?'application/zip':'application/json']:[binary?'.zip':'.json']}}] });
      const writable=await handle.createWritable();
      try { await writable.write(new Blob([binary?(content as Uint8Array).slice().buffer:content as string])); await writable.close(); }
      catch(error) { await writable.abort().catch(()=>{}); throw error; }
      return {status:'saved'};
    } catch(error) { if((error as Error).name==='AbortError') return {status:'cancelled'}; throw error; }
  }
  const url = URL.createObjectURL(
    new Blob([binary?(content as Uint8Array).slice().buffer:content as string], { type: binary?'application/zip':'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return {status: 'download-started'};
}
