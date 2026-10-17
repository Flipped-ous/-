import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const NativeAppearance = registerPlugin<{
  setTheme(options: { dark: boolean }): Promise<void>;
  hideKeyboard(): Promise<void>;
  prepareReminderChannels(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  addListener(event: 'keyboardVisibilityChange', listener: (state: { visible: boolean }) => void): Promise<PluginListenerHandle>;
}>('Appearance');

/** Mobile uses the OS file chooser; the web retains a normal JSON download. */
export async function exportBackupFile(content: string | Uint8Array) {
  const binary=typeof content!=='string';
  const name = `jinri-youxu-backup-${Date.now()}.${binary?'zip':'json'}`;
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const file = await Filesystem.writeFile({
      path: `backups/${name}`,
      data: binary ? await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('备份编码失败'));r.readAsDataURL(new Blob([(content as Uint8Array).slice().buffer]));}) : content as string,
      directory: Directory.Cache,
      ...(binary?{}:{encoding:Encoding.UTF8}),
      recursive: true,
    });
    await Share.share({
      title: '今日有序数据备份',
      files: [file.uri],
      dialogTitle: '保存或分享备份',
    });
    return;
  }
  const url = URL.createObjectURL(
    new Blob([binary?(content as Uint8Array).slice().buffer:content as string], { type: binary?'application/zip':'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
