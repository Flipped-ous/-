import { ReminderControl } from "../components/ReminderControl.tsx";
import { SyncConnectionControl } from "../components/SyncConnectionControl.tsx";
import React, { useState, useRef } from "react";
import type { AppSettings, SyncDevice, BackupData } from "../types/index.ts";
import { useDialog } from "../hooks/useDialog.ts";
import { parseNotesBackup } from "../services/notesBackup.ts";
import { validateBackupData } from "../utils/taskLogic.ts";

interface MoreViewProps {
  settings: AppSettings;
  onChangeReminder?: (patch: Partial<AppSettings>) => void;
  onRefreshReminders?: () => void;
  devices: SyncDevice[];
  tasksCount: number;
  projectsCount: number;
  reviewsCount: number;
  onToggleTheme: (event: React.MouseEvent<HTMLElement>) => void;
  onChangeMotionLevel: (level: "simple" | "standard" | "rich") => void;
  onToggleMotion: () => void;
  onToggleSyncPause?: () => void;
  onTriggerSync: () => void;
  onExportData: () => void;
  onImportBackup: (
    backup: BackupData,
    mode: "overwrite" | "merge",
  ) => void | Promise<void>;
  onShowToast: (msg: string) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  settings,
  onChangeReminder,
  onRefreshReminders,
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

  useDialog(showImportModal, () => setShowImportModal(false));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file picker
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Handle file selected and parse JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseNotesBackup(file);
      const validation = validateBackupData(parsed);
      if (!validation.valid || !validation.counts)
        throw new Error(validation.error);
      setPendingImportData(parsed);
      setImportPreviewCounts({
        ...validation.counts,
        reviews: parsed.notes?.length ?? parsed.reviews.length,
      });
      setShowImportModal(true);
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "读取备份失败");
    }
  };

  const confirmImport = async (mode: "overwrite" | "merge") => {
    if (!pendingImportData) return;
    try {
      await onImportBackup(pendingImportData, mode);
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "导入失败");
      return;
    }
    setShowImportModal(false);
    setPendingImportData(null);
    onShowToast(
      mode === "overwrite" ? "已成功恢复覆盖数据" : "已成功合并导入备份数据",
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip,application/json,application/zip"
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
          onClick={() => onShowToast("今日有序：东方极简自然待办")}
          aria-label="帮助与提示"
          className="w-8 h-8 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#786E64] dark:text-[#A89E92] flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">
            help_outline
          </span>
        </button>
      </header>

      <div className="flex flex-col gap-4">
        <SyncConnectionControl />

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
                  (event.key === "Enter" || event.key === " ")
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
                {settings.theme === "light" ? "浅色纸张" : "深色宣纸"}
                <span className="material-symbols-outlined text-[15px]">
                  chevron_right
                </span>
              </span>
            </div>

            <ReminderControl
              settings={settings}
              onChange={onChangeReminder}
              onRefresh={onRefreshReminders}
            />
          </div>
        </section>

        {/* Module 3: 本地数据安全与备份 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>本地数据安全与备份</span>
            <span className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92]">
              离线保存
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
                  (event.key === "Enter" || event.key === " ")
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
                    生成包含任务、项目、笔记和图片的 ZIP
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#FAF6EF] dark:bg-[#342E28] text-[#A55340] dark:text-[#E08570] text-[11px] font-mono font-medium">
                ZIP &gt;
              </span>
            </div>

            {/* Import */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
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
                <span>离线保存</span>
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
                  <div className="text-[11px] text-[#786E64]">篇笔记</div>
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
                <span className="text-[11px] text-[#786E64]">笔记</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => confirmImport("merge")}
                className="w-full py-2.5 rounded-xl bg-[#6C8271] hover:bg-[#586E5D] text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                合并数据 (保留较新版本)
              </button>
              <button
                type="button"
                onClick={() => confirmImport("overwrite")}
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

    </div>
  );
};
