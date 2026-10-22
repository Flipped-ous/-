import React from 'react';
import { useDialog } from '../hooks/useDialog.ts';
import { createPortal } from 'react-dom';
import metadata from '../../package.json';
export function HelpDialog({ onClose }: { onClose: () => void }) {
  useDialog(true,onClose);
  return createPortal(<div className="agenda-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div className="agenda-dimmer" onClick={onClose} />
    <section className="task-status-sheet"><div className="sheet-handle" /><header className="agenda-header"><h2 id="help-title">使用帮助</h2><button aria-label="关闭使用帮助" onClick={onClose}>×</button></header>
      <div className="help-content"><dl>
        <div><dt>编辑与完成待办</dt><dd>点标题或卡片空白处编辑；点左侧方框完成。向右滑动完成，向左滑动删除；未滑过确认距离时会回到原位。</dd></div>
        <div><dt>排序与项目</dt><dd>待办按住约半秒、项目按住片刻后上下拖动，其他卡片会让位。项目左滑只露出删除按钮，点删除后还需确认；任务和笔记会保留并解除项目关联。</dd></div>
        <div><dt>撤销删除</dt><dd>底部提示可撤销最近一项，连续删除会堆叠。离开提示一段时间后会自动收起。</dd></div>
        <div><dt>日期与收工整理</dt><dd>待办默认周历，点日历右上角箭头展开月历。收工整理批量处理逾期和今天未完成任务；提醒默认21:00，可在提醒策略修改或关闭。</dd></div>
        <div><dt>添加桌面小组件</dt><dd>长按手机桌面空白处 → 小组件 → 今日有序。组件只列今日未完成任务，点任务进入编辑，点＋新建；长按组件可调整大小。</dd></div>
        <div><dt>备份与电脑同步</dt><dd>在更多页导出完整ZIP，包含任务、项目、笔记与图片。Android选择保存位置并写入完成后才更新最近备份时间；取消不更新。电脑同步尚未接入，升级前建议手动备份。</dd></div>
      </dl><footer>今日有序 {metadata.version} · Android<br />键盘操作：项目标题 Alt＋↑／↓ 调整顺序，← 显示删除。</footer></div>
    </section></div>,document.body);
}
