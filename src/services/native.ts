import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const NativeAppearance = registerPlugin<{
  setTheme(options: { dark: boolean }): Promise<void>;
  addListener(event: 'keyboardVisibilityChange', listener: (state: { visible: boolean }) => void): Promise<PluginListenerHandle>;
}>('Appearance');

/** Mobile uses the OS file chooser; the web retains a normal JSON download. */
export async function exportBackupFile(content: string) {
  const name = `jinri-youxu-backup-${Date.now()}.json`;
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const file = await Filesystem.writeFile({
      path: `backups/${name}`,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
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
    new Blob([content], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
