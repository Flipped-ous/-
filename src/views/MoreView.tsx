import React, { useState } from 'react';
import type { AppSettings, SyncDevice } from '../types/index.ts';

interface MoreViewProps {
  settings: AppSettings;
  devices: SyncDevice[];
  onToggleTheme: () => void;
  onToggleMotion: () => void;
  onTriggerSync: () => void;
  onExportData: () => void;
  onShowToast: (msg: string) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  settings,
  devices,
  onToggleTheme,
  onToggleMotion,
  onTriggerSync,
  onExportData,
  onShowToast,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairedDevices, setPairedDevices] = useState(devices);

  const handleSyncClick = () => {
    if (isPaused) {
      onShowToast('同步已暂停，请先恢复');
      return;
    }
    setIsSyncing(true);
    onShowToast('正在局域网极速同步数据...');
    setTimeout(() => {
      setIsSyncing(false);
      onTriggerSync();
      onShowToast('局域网同步完成 · 耗时 42ms');
    }, 700);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    onShowToast(!isPaused ? '局域网自动同步已暂停' : '局域网自动同步已恢复');
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
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
          <span className="material-symbols-outlined text-[19px]">help_outline</span>
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
                    <span className="material-symbols-outlined text-[20px]">laptop_chromebook</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                        ThinkPad-Studio
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EBE4D6] dark:bg-[#3E362F] text-[#786E64] dark:text-[#A89E92] font-mono">
                        Win 11
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C8271]" />
                      <span className="text-[#6C8271] dark:text-[#95B59C] font-medium">
                        {isPaused ? '局域网已暂停' : '局域网已连接 · 极佳'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeviceModal(true)}
                  className="text-[#8C7F73] hover:text-[#28231D] p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                </button>
              </div>

              <div className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] mt-2">
                上次同步：刚刚 / 14:38
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
                  className="h-8 px-4 rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#28231D] dark:text-[#EDE6DE] text-[12.5px] font-medium flex items-center justify-center gap-1 border border-[#746B61]/12 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  <span>{isPaused ? '恢复' : '暂停'}</span>
                </button>
              </div>
            </div>

            {/* Sub-rows */}
            <div className="border-t border-[#746B61]/8 dark:border-[#5E544A]/15 divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
              <div
                onClick={() => setShowDeviceModal(true)}
                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                  <span className="material-symbols-outlined text-[16px] text-[#786E64]">
                    devices
                  </span>
                  <span>已配对设备</span>
                </div>
                <span className="text-[#786E64] dark:text-[#A89E92] text-[12px] flex items-center gap-0.5">
                  {pairedDevices.length} 台
                  <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                </span>
              </div>

              <div
                onClick={() => setShowPairModal(true)}
                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                  <span className="material-symbols-outlined text-[16px] text-[#A55340]">
                    add_circle_outline
                  </span>
                  <span>配对新电脑或平板</span>
                </div>
                <span className="material-symbols-outlined text-[15px] text-[#786E64]">
                  chevron_right
                </span>
              </div>
            </div>

            {/* Bottom notice */}
            <div className="px-3.5 py-2 bg-[#FAF6EF]/60 dark:bg-[#201C19] border-t border-[#746B61]/8 text-[11px] text-[#786E64] dark:text-[#A89E92] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-[#6C8271]">lock</span>
              <span>离线安全模式 · 本地数据仅保存在您私有设备</span>
            </div>
          </div>
        </section>

        {/* Module 2: 视觉与习惯 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>视觉与习惯</span>
            <span className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92]">
              温润宣纸感
            </span>
          </div>

          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
            {/* Theme row */}
            <div
              onClick={onToggleTheme}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#A55340]">
                  <span className="material-symbols-outlined text-[15px]">palette</span>
                </div>
                <div>
                  <div className="font-medium">主题外观</div>
                  <div className="text-[11px] text-[#786E64]">纸感与滋润暗色风格</div>
                </div>
              </div>
              <span className="text-[#786E64] dark:text-[#A89E92] text-[12px] flex items-center gap-0.5">
                {settings.theme === 'light' ? '浅色纸张' : '深色宣纸'}
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </span>
            </div>

            {/* Motion toggle row */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#6C8271]">
                  <span className="material-symbols-outlined text-[15px]">motion_photos_on</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>动效表现</span>
                    <span className="text-[10px] px-1 rounded bg-[#EAF0EB] text-[#6C8271]">
                      已启用
                    </span>
                  </div>
                  <div className="text-[11px] text-[#786E64]">界面平滑过渡与触觉微震弹</div>
                </div>
              </div>

              {/* iOS style toggle switch */}
              <button
                type="button"
                onClick={onToggleMotion}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.motionEnabled ? 'bg-[#6C8271]' : 'bg-[#D3C9BD]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${
                    settings.motionEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification policy */}
            <div
              onClick={() => onShowToast('当前已开启：温和微震提醒')}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <div className="w-6 h-6 rounded-lg bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-center text-[#C88A3A]">
                  <span className="material-symbols-outlined text-[15px]">notifications</span>
                </div>
                <div>
                  <div className="font-medium">提醒策略</div>
                  <div className="text-[11px] text-[#786E64]">专注于当下，减少无谓打扰</div>
                </div>
              </div>
              <span className="text-[#786E64] dark:text-[#A89E92] text-[12px] flex items-center gap-0.5">
                温和微震
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </span>
            </div>
          </div>
        </section>

        {/* Module 3: 本地数据安全与备份 */}
        <section>
          <div className="flex items-center justify-between px-1 mb-1.5 text-[12.5px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
            <span>本地数据安全与备份</span>
            <span className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92]">
              沙盒保密
            </span>
          </div>

          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
            {/* Export */}
            <div
              onClick={onExportData}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[18px] text-[#A55340]">
                  file_download
                </span>
                <div>
                  <div className="font-medium">导出完整数据备份</div>
                  <div className="text-[11px] text-[#786E64]">生成标准 .json 本地备份文件</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#FAF6EF] dark:bg-[#342E28] text-[#A55340] dark:text-[#E08570] text-[11px] font-mono font-medium">
                JSON &gt;
              </span>
            </div>

            {/* Import */}
            <div
              onClick={() => onShowToast('请选取本地备份文件进行离线恢复')}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[18px] text-[#6C8271]">
                  file_upload
                </span>
                <div>
                  <div className="font-medium">导入恢复数据</div>
                  <div className="text-[11px] text-[#786E64]">从本地选取 .json 文件合并</div>
                </div>
              </div>
              <span className="text-[#786E64] text-[12px] flex items-center gap-0.5">
                从文件 &gt;
              </span>
            </div>

            {/* Storage stat */}
            <div className="p-3.5 bg-[#FAF6EF]/40 dark:bg-[#201C19]">
              <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-2 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                  本地沙盒存储统计
                </span>
                <span>已用 {settings.dataSizeMb} MB</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {settings.pendingCountTotal}
                  </div>
                  <div className="text-[11px] text-[#786E64]">个待办项</div>
                </div>
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {settings.activeProjectsTotal}
                  </div>
                  <div className="text-[11px] text-[#786E64]">个进行项目</div>
                </div>
                <div className="bg-white dark:bg-[#2C2723] rounded-xl p-2.5 text-center border border-[#746B61]/10">
                  <div className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                    {settings.reviewsTotal}
                  </div>
                  <div className="text-[11px] text-[#786E64]">篇深度复盘</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Module 4: 系统与信息 */}
        <section>
          <div className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden divide-y divide-[#746B61]/8 dark:divide-[#5E544A]/15 text-[12.5px]">
            <div
              onClick={() => onShowToast('当前已是最新稳定版本')}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[17px] text-[#786E64]">info</span>
                <span>版本信息</span>
              </div>
              <span className="text-[#786E64] text-[12px] flex items-center gap-0.5">
                v1.0.4 正式版 &gt;
              </span>
            </div>

            <div
              onClick={() => onShowToast('遵循 MIT 开源许可 · 尊重用户个人数据所有权')}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE]">
                <span className="material-symbols-outlined text-[17px] text-[#786E64]">
                  article
                </span>
                <span>产品便签与开源许可</span>
              </div>
              <span className="material-symbols-outlined text-[15px] text-[#786E64]">
                chevron_right
              </span>
            </div>
          </div>
        </section>

        {/* Footer Brand */}
        <div className="text-center pt-2 pb-4 text-[11.5px] text-[#786E64]/60 dark:text-[#A89E92]/60 select-none flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#6C8271]">eco</span>
          <span>今日有序 · 本地安全与安静专注</span>
        </div>
      </div>

      {/* Paired Devices Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm"
            onClick={() => setShowDeviceModal(false)}
          />
          <div className="relative w-full max-w-sm bg-[#FDFCFA] dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15 z-10">
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-2">
              已配对设备
            </h3>
            <p className="text-[12px] text-[#786E64] mb-3">在同一 Wi-Fi 局域网下即可点对点互传数据</p>
            <div className="flex flex-col gap-2">
              {pairedDevices.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] flex items-center justify-between text-[12.5px]"
                >
                  <div>
                    <div className="font-semibold text-[#28231D] dark:text-[#EDE6DE]">{d.name}</div>
                    <div className="text-[11px] text-[#786E64]">{d.os} · 延迟 {d.pingMs}ms</div>
                  </div>
                  <span className="text-[11px] text-[#6C8271] font-medium bg-[#EAF0EB] px-2 py-0.5 rounded-full">
                    {d.status === 'connected' ? '在线' : '离线'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#A55340] text-white text-[12.5px]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pair New Device Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm"
            onClick={() => setShowPairModal(false)}
          />
          <div className="relative w-full max-w-sm bg-[#FDFCFA] dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15 z-10">
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-2">
              配对新设备
            </h3>
            <p className="text-[12px] text-[#786E64] mb-3">
              正在扫描局域网 mDNS 广播发现新终端...
            </p>
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-[#A55340] animate-spin">
                radar
              </span>
              <span className="text-[12px] text-[#786E64]">正在监听端口 5353...</span>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#FAF6EF] dark:bg-[#342E28] text-[#786E64] text-[12.5px]"
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
