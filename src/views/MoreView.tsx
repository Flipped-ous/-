import React, { useState, useRef } from 'react';
import type { AppSettings, SyncDevice, BackupData } from '../types/index.ts';
import { useDialog } from '../hooks/useDialog.ts';
import { validateBackupData } from '../utils/taskLogic.ts';

interface MoreViewProps {
  settings: AppSettings;
  devices: SyncDevice[];
  tasksCount: number;
  projectsCount: number;
  reviewsCount: number;
  onToggleTheme: () => void;
  onChangeMotionLevel: (level: 'simple' | 'standard' | 'rich') => void;
  onToggleMotion: () => void;
  onToggleSyncPause?: () => void;
  onTriggerSync: () => void;
  onExportData: () => void;
  onImportBackup: (backup: BackupData, mode: 'overwrite' | 'merge') => void;
  onShowToast: (msg: string) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  settings,
  devices,
  tasksCount,
  projectsCount,
  reviewsCount,
  onToggleTheme,
  onChangeMotionLevel,
  onToggleMotion,
  onToggleSyncPause,
  onTriggerSync,
  onExportData,
  onImportBackup,
  onShowToast,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const isPaused = !!settings.syncPaused;
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const pairedDevices = devices;

  // Backup Import preview modal state
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(
    null,
  );
  const [importPreviewCounts, setImportPreviewCounts] = useState<{
    tasks: number;
    projects: number;
    reviews: number;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMotionMenu, setShowMotionMenu] = useState(false);

  useDialog(showDeviceModal || showPairModal || showImportModal, () => {
    setShowDeviceModal(false);
    setShowPairModal(false);
    setShowImportModal(false);
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSyncClick = () => {
    if (isPaused) {
      onShowToast('同步已暂停，请先恢复');
      return;
    }
    setIsSyncing(true);
    onShowToast('正在更新同步演示状态…');
    setTimeout(() => {
      setIsSyncing(false);
      onTriggerSync();
      onShowToast('同步演示完成，尚未连接真实设备');
    }, 700);
  };

  const handleTogglePause = () => {
    onToggleSyncPause?.();
    onShowToast(!isPaused ? '局域网自动同步已暂停' : '局域网自动同步已恢复');
  };

  // Trigger file picker
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle file selected and parse JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      onShowToast('备份文件过大，请选择小于 20 MB 的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const validation = validateBackupData(parsed);
        if (!validation.valid || !validation.counts) {
          onShowToast(`导入失败: ${validation.error || '文件格式不符'}`);
          return;
        }

        setPendingImportData(parsed as BackupData);
        setImportPreviewCounts(validation.counts);
        setShowImportModal(true);
      } catch (err) {
        onShowToast('导入失败：不是有效的 JSON 文件');
      }
    };
    reader.onerror = () => {
      onShowToast('读取本地备份文件失败');
    };
    reader.readAsText(file);
  };

  const confirmImport = (mode: 'overwrite' | 'merge') => {
    if (!pendingImportData) return;
    try {
      onImportBackup(pendingImportData, mode);
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : '导入失败');
      return;
    }
    setShowImportModal(false);
    setPendingImportData(null);
    onShowToast(
      mode === 'overwrite' ? '已成功恢复覆盖数据' : '已成功合并导入备份数据',
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header */}
      <header className="flex items-start justify-between mb-3.5">
        <div>
          <div className="flex items-center gap-1.5 text-[19px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
            <span className="material-symbols-outlined text-[20px] text-[#A55340] dark:text-[#C76E59]">
              more_horiz
            </span>
            <h1>更多与设置</h1>
          </div>
          <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
            让工具更适合你的使用习惯
          </p>
        </div>

        <button
          type="button"
          onClick={() => onShowToast('今日有序：东方极简自然待办')}
          aria-label="帮助与提示"
          className="w-8 h-8 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#786E64] dark:text-[#A89E92] flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">
            help_outline
          </span>
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {/* Module 1: 设备与同步 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>设备与同步</span>
            <span className="text-[11px] font-normal text-[#6C8271] dark:text-[#95B59C] bg-[#EAF0EB] dark:bg-[#28372B] px-2 py-0.5 rounded-full">
              局域网直连
            </span>
          </div>

          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden">
            {/* Main Device Card */}
            <div className="p-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#786E64] dark:text-[#A89E92]">
                    <span className="material-symbols-outlined text-[20px]">
                      laptop_chromebook
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                        {devices[0]?.name || '暂无配对设备'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EBE4D6] dark:bg-[#3E362F] text-[#786E64] dark:text-[#A89E92] font-mono">
                        {devices[0]?.os || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C8271]" />
                      <span className="text-[#6C8271] dark:text-[#95B59C] font-medium">
                        {isPaused
                          ? '同步已暂停'
                          : devices.length
                            ? '演示设备 · ' + devices[0].quality
                            : '暂无配对设备'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeviceModal(true)}
                  className="text-[#8C7F73] hover:text-[#28231D] p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    more_horiz
                  </span>
                </button>
              </div>

              <div className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] mt-2">
                上次同步：刚刚 · 局域网通道畅通
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex-1 h-8 rounded-xl bg-[#A55340] hover:bg-[#873C2A] text-white text-[12.5px] font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isSyncing ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                  <span>{isSyncing ? '同步中...' : '立即同步'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="px-3 h-8 rounded-xl border border-[#746B61]/20 bg-[#FAF6EF] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#786E64] dark:text-[#A89E92] text-[12px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  <span>{isPaused ? '恢复' : '暂停'}</span>
                </button>
              </div>
            </div>

            {/* List options */}
            <div className="divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 border-t border-[#746B61]/8 text-[12.5px]">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
                onClick={() => setShowDeviceModal(true)}
                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                  <span className="material-symbols-outlined text-[17px] text-[#786E64]">
                    devices
                  </span>
                  <span>已配对设备 ({pairedDevices.length} 台)</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#786E64]">
                  chevron_right
                </span>
              </div>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
                onClick={() => setShowPairModal(true)}
                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                  <span className="material-symbols-outlined text-[17px] text-[#A55340]">
                    add_circle_outline
                  </span>
                  <span>配对新电脑 / 移动端</span>
                </div>
                <span className="text-[11px] text-[#786E64]">
                  广播搜索中 &gt;
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Module 2: 外观与动效体验 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>外观与体验</span>
            <span className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92]">
              温润宣纸感
            </span>
          </div>

          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
            {/* Theme row */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              onClick={onToggleTheme}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#A55340]">
                  <span className="material-symbols-outlined text-[15px]">
                    palette
                  </span>
                </div>
                <div>
                  <div className="font-medium">主题外观</div>
                  <div className="text-[11px] text-[#786E64]">
                    纸感与滋润暗色风格
                  </div>
                </div>
              </div>
              <span className="text-[#786E64] dark:text-[#A89E92] text-[12px] flex items-center gap-0.5">
                {settings.theme === 'light' ? '浅色纸张' : '深色宣纸'}
                <span className="material-symbols-outlined text-[15px]">
                  chevron_right
                </span>
              </span>
            </div>

            {/* Motion toggle & level row */}
            <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-1 basis-[210px] min-w-0 items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#6C8271]">
                  <span className="material-symbols-outlined text-[15px]">
                    motion_photos_on
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="whitespace-nowrap">动效系统等级</span>
                    <span className="text-[10px] whitespace-nowrap px-1.5 py-0.2 rounded bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C] font-mono">
                      {settings.motion === 'simple'
                        ? '简单 (减弱)'
                        : settings.motion === 'rich'
                          ? '细腻 (丰富)'
                          : '标准 (默认)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#786E64]">
                    {settings.motionEnabled
                      ? '平滑弹性曲线与触觉微震'
                      : '已关闭动效'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Motion level picker */}
                <div className="flex items-center bg-[#FAF6EF] dark:bg-[#342E28] p-0.5 rounded-lg border border-[#746B61]/12">
                  {(['simple', 'standard', 'rich'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onChangeMotionLevel(lvl)}
                      className={`text-[11px] whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        settings.motion === lvl
                          ? 'bg-[#A55340] text-white font-medium shadow-2xs'
                          : 'text-[#786E64] hover:text-[#28231D]'
                      }`}
                    >
                      {lvl === 'simple'
                        ? '微弱'
                        : lvl === 'standard'
                          ? '标准'
                          : '丰富'}
                    </button>
                  ))}
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  aria-label="动效开关"
                  role="switch"
                  aria-checked={settings.motionEnabled}
                  onClick={onToggleMotion}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.motionEnabled ? 'bg-[#6C8271]' : 'bg-[#D3C9BD]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 ${
                      settings.motionEnabled ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Notification policy */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              onClick={() => onShowToast('当前已开启：温和微震提醒')}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#C88A3A]">
                  <span className="material-symbols-outlined text-[15px]">
                    notifications
                  </span>
                </div>
                <div>
                  <div className="font-medium">提醒策略</div>
                  <div className="text-[11px] text-[#786E64]">
                    专注于当下，减少无谓打扰
                  </div>
                </div>
              </div>
              <span className="text-[#786E64] dark:text-[#A89E92] text-[12px] flex items-center gap-0.5">
                温和微震
                <span className="material-symbols-outlined text-[15px]">
                  chevron_right
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* Module 3: 本地数据安全与备份 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>本地数据安全与备份</span>
            <span className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92]">
              IndexedDB 沙盒
            </span>
          </div>

          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
            {/* Export */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              onClick={onExportData}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[18px] text-[#A55340]">
                  file_download
                </span>
                <div>
                  <div className="font-medium">导出完整数据备份</div>
                  <div className="text-[11px] text-[#786E64]">
                    生成包含待办/项目/复盘的 .json
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#FAF6EF] dark:bg-[#342E28] text-[#A55340] dark:text-[#E08570] text-[11px] font-mono font-medium">
                JSON &gt;
              </span>
            </div>

            {/* Import */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              onClick={handleImportClick}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[18px] text-[#6C8271]">
                  file_upload
                </span>
                <div>
                  <div className="font-medium">导入恢复备份数据</div>
                  <div className="text-[11px] text-[#786E64]">
                    支持结构校验、覆盖或增量合并
                  </div>
                </div>
              </div>
              <span className="text-[#786E64] text-[12px] flex items-center gap-0.5">
                从文件 &gt;
              </span>
            </div>

            {/* Real-time Storage stat */}
            <div className="p-3.5 bg-[#FAF6EF]/40 dark:bg-[#201C19]">
              <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-2 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    inventory_2
                  </span>
                  本地数据统计
                </span>
                <span>schemaVersion: 2</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {tasksCount}
                  </div>
                  <div className="text-[11px] text-[#786E64]">个待办项</div>
                </div>
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {projectsCount}
                  </div>
                  <div className="text-[11px] text-[#786E64]">个项目</div>
                </div>
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {reviewsCount}
                  </div>
                  <div className="text-[11px] text-[#786E64]">篇复盘墨迹</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Backup Import Preview & Confirmation Dialog */}
      {showImportModal && importPreviewCounts && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#28231D]/45 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15">
            <div className="flex items-center gap-2 text-[#A55340] mb-2">
              <span className="material-symbols-outlined text-[20px]">
                file_open
              </span>
              <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                确认导入备份数据
              </h3>
            </div>

            <p className="text-[12.5px] text-[#786E64] dark:text-[#A89E92] mb-3 leading-relaxed">
              检测到有效的备份文件，包含以下项目：
            </p>

            <div className="bg-[#FAF6EF] dark:bg-[#342E28] rounded-xl p-3 flex justify-around text-center mb-4 border border-[#746B61]/10 text-[12.5px]">
              <div>
                <span className="font-bold text-[16px] text-[#28231D] dark:text-[#EDE6DE] block">
                  {importPreviewCounts.tasks}
                </span>
                <span className="text-[11px] text-[#786E64]">待办事项</span>
              </div>
              <div className="border-r border-[#746B61]/15" />
              <div>
                <span className="font-bold text-[16px] text-[#28231D] dark:text-[#EDE6DE] block">
                  {importPreviewCounts.projects}
                </span>
                <span className="text-[11px] text-[#786E64]">项目档案</span>
              </div>
              <div className="border-r border-[#746B61]/15" />
              <div>
                <span className="font-bold text-[16px] text-[#28231D] dark:text-[#EDE6DE] block">
                  {importPreviewCounts.reviews}
                </span>
                <span className="text-[11px] text-[#786E64]">复盘墨迹</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => confirmImport('merge')}
                className="w-full py-2.5 rounded-xl bg-[#6C8271] hover:bg-[#586E5D] text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                合并数据 (保留较新版本)
              </button>
              <button
                type="button"
                onClick={() => confirmImport('overwrite')}
                className="w-full py-2.5 rounded-xl bg-[#A55340] hover:bg-[#873C2A] text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                覆盖当前数据
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setPendingImportData(null);
                }}
                className="w-full py-2 text-[12.5px] text-[#786E64] hover:text-[#28231D] cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Detail Sheet Modal */}
      {showDeviceModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#28231D]/40 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                已配对局域网设备
              </h3>
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className="text-[#786E64] hover:text-[#28231D]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mb-4">
              {pairedDevices.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-between text-[12.5px]"
                >
                  <div>
                    <div className="font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-[#786E64] mt-0.5">
                      {d.os} · 延迟 {d.pingMs}ms · 上次同步 {d.lastSync}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#6C8271] bg-[#EAF0EB] px-2 py-0.5 rounded-full font-medium">
                    {d.quality}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDeviceModal(false)}
              className="w-full py-2 rounded-xl bg-[#A55340] text-white text-[13px] font-medium"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Pair New Device Modal */}
      {showPairModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#28231D]/40 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15 text-center">
            <span className="material-symbols-outlined text-[36px] text-[#A55340] mb-2 animate-pulse">
              radar
            </span>
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-1">
              正在搜索局域网同伴
            </h3>
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mb-4">
              请确保目标电脑或手机已接入同一 Wi-Fi 或局域网络
            </p>

            <div className="p-3 rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] text-[12px] text-[#786E64] mb-4">
              广播端口：
              <code className="font-mono text-[#A55340]">5353 (mDNS)</code>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPairModal(false);
                onShowToast('配对界面演示，尚未连接真实设备');
              }}
              className="w-full py-2 rounded-xl bg-[#A55340] text-white text-[13px] font-medium"
            >
              稍后继续
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
