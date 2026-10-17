import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "../hooks/useDialog.ts";
export function SyncConnectionControl() {
  const [open, setOpen] = useState(false);
  useDialog(open, () => setOpen(false));
  return (
    <section>
      <div className="px-1 mb-2 text-[13px] font-semibold">手机与电脑</div>
      <div className="paper-card rounded-[16px] p-4 bg-white dark:bg-[#27221E]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] font-medium">电脑同步</p>
          <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
            尚未接入
          </span>
        </div>
        <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] leading-relaxed mt-2">
          两端各自保存数据，离线也能使用。电脑端适配后，通过同一局域网配对互传。
        </p>
        <button
          className="mt-3 text-[13px] text-[#A55340] min-h-9"
          onClick={() => setOpen(true)}
        >
          查看连接方式 →
        </button>
      </div>
      {open &&
        createPortal(
          <div className="reminder-backdrop">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="手机与电脑连接"
              className="reminder-dialog"
            >
              <header>
                <h2>手机与电脑</h2>
                <button
                  aria-label="关闭连接说明"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </header>
              <p>
                沿用旧版的连接流程：在电脑的设置中进入“手机与电脑”，选择“添加手机”，再用手机扫码或粘贴一次性配对码。
              </p>
              <div className="reminder-options">
                <button disabled>扫描电脑二维码</button>
                <button disabled>粘贴一次性配对码</button>
              </div>
              <p>
                当前版本已预留任务、项目、笔记和图片接口。等待办公室新版电脑端确认协议后启用配对与传输。
              </p>
              <p>
                现阶段请使用“导出完整数据备份”保存手机数据。旧版电脑备份格式不同，不能直接导入。
              </p>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}
