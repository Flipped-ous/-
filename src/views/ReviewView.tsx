import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useMotion } from '../motion/MotionProvider.tsx';
import type { ReviewEntry, ReviewMood } from '../types/index.ts';
import { SegmentedControl } from '../components/SegmentedControl.tsx';
import { AnimatedNumber } from '../components/AnimatedNumber.tsx';

import { getPeriodRange } from '../utils/taskLogic.ts';
import { useDialog } from '../hooks/useDialog.ts';

interface ReviewViewProps {
  period?: 'week' | 'month';
  onPeriodChange?: (period: 'week' | 'month') => void;
  reviews: ReviewEntry[];
  onAddReview: (entry: Partial<ReviewEntry>) => void;
  stats?: {
    completed: number;
    delayed: number;
    added: number;
    topProject: string;
    hours: string;
  };
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  reviews,
  period,
  onPeriodChange,
  onAddReview,
  stats = {
    completed: 7,
    delayed: 2,
    added: 4,
    topProject: 'Android 客户端',
    hours: '3h',
  },
}) => {
  const config = useMotion();
  const [localPeriod, setLocalPeriod] = useState<'week' | 'month'>('week');
  const activeTab = period || localPeriod;
  const setActiveTab = (value: 'week' | 'month') => {
    setLocalPeriod(value);
    onPeriodChange?.(value);
  };
  const [showMoodFilter, setShowMoodFilter] = useState(false);
  const [moodFilter, setMoodFilter] = useState('全部');
  const range = getPeriodRange(new Date(), activeTab);
  const visibleReviews = reviews.filter((entry) => {
    const time = Date.parse(entry.createdAt);
    return (
      time >= range.start &&
      time < range.end &&
      (moodFilter === '全部' || entry.moods.includes(moodFilter as ReviewMood))
    );
  });
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<ReviewMood[]>(['平静']);

  useDialog(showCompose, () => setShowCompose(false));
  const allMoods: ReviewMood[] = ['平静', '心流', '有进展', '专注', '洞察'];

  const toggleMood = (mood: ReviewMood) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    onAddReview({
      date: '今日',
      subDate: '今日随感',
      time: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      wordCount: newContent.length,
      type: 'day',
      title: newTitle.trim() || '无题随感',
      content: newContent.trim(),
      moods: selectedMoods.length > 0 ? selectedMoods : ['平静'],
    });

    setNewTitle('');
    setNewContent('');
    setShowCompose(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[19px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
            复盘
          </h1>
          <span className="text-[12px] font-mono tracking-wider text-[#786E64] dark:text-[#A89E92] uppercase">
            REFLECT & GROW
          </span>
        </div>

        {/* Terracotta '写复盘' Capsule Button */}
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="h-8 pl-3 pr-3.5 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white flex items-center gap-1.5 shadow-[0_1px_4px_rgba(165,83,64,0.25)] active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px] leading-none">
            edit_note
          </span>
          <span className="text-[12.5px] font-medium tracking-wide">
            写复盘
          </span>
        </button>
      </header>

      {/* Segmented Control */}
      <SegmentedControl
        className="mb-3.5"
        activeId={activeTab}
        onChange={(val) => setActiveTab(val as any)}
        options={[
          { id: 'week', label: '周复盘' },
          { id: 'month', label: '月复盘' },
        ]}
      />

      {/* Today Overview Card (待办系统联动收揽) */}
      <motion.section
        layoutId={config.allowParallax ? 'task-summary' : undefined}
        transition={{ duration: config.durations.pageTransition / 1000 }}
        className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] p-3.5 mb-4"
      >
        <div className="flex items-center justify-between text-[12px] mb-2.5">
          <div className="flex items-center gap-1.5 font-medium text-[#28231D] dark:text-[#EDE6DE]">
            <span className="material-symbols-outlined text-[16px] text-[#A55340]">
              task_alt
            </span>
            <span>待办系统联动收揽</span>
          </div>
          <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
            {activeTab === 'week' ? '本周' : '本月'} ·{' '}
            {new Date(range.start).toLocaleDateString('zh-CN')}—
            {new Date(range.end - 1).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* 3 Metric counters with linked animated number roll */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#786E64] dark:text-[#A89E92] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C8271]" />
              <span>{activeTab === 'week' ? '本周完成' : '本月完成'}</span>
            </div>
            <div className="text-[18px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
              <AnimatedNumber value={stats.completed} />
            </div>
          </div>

          <div className="rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#786E64] dark:text-[#A89E92] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A55340]" />
              <span>延期</span>
            </div>
            <div className="text-[18px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
              <AnimatedNumber value={stats.delayed} />
            </div>
          </div>

          <div className="rounded-xl bg-[#FAF6EF] dark:bg-[#342E28] p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#786E64] dark:text-[#A89E92] mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C88A3A]" />
              <span>新增</span>
            </div>
            <div className="text-[18px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
              <AnimatedNumber value={stats.added} />
            </div>
          </div>
        </div>

        {/* Main focus row */}
        <div className="pt-2 border-t border-[#746B61]/8 dark:border-[#5E544A]/15 flex items-center justify-between text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-[#6C8271]">
              spa
            </span>
            <span className="font-medium text-[#28231D] dark:text-[#EDE6DE]">
              {activeTab === 'week' ? '本周' : '本月'}主要投入：
              {stats.topProject}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-[#786E64] dark:text-[#A89E92] mt-0.5 pl-5">
          物来顺应，当时不杂，心流专注度良好
        </div>
      </motion.section>

      {/* Review Entries Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
          墨迹记录{' '}
          <span className="text-[12px] font-normal text-[#786E64]">
            共 {visibleReviews.length} 篇
          </span>
        </span>
        <button
          type="button"
          onClick={() => setShowMoodFilter(!showMoodFilter)}
          aria-expanded={showMoodFilter}
          className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] flex items-center gap-1 hover:text-[#A55340]"
        >
          <span className="material-symbols-outlined text-[14px]">tune</span>
          筛选心境
        </button>
      </div>

      {showMoodFilter && (
        <div className="flex flex-wrap gap-2 mb-3">
          {['全部', ...allMoods].map((mood) => (
            <button
              type="button"
              key={mood}
              onClick={() => setMoodFilter(mood)}
              className={`text-xs rounded-full px-3 py-1 ${moodFilter === mood ? 'bg-[#A55340] text-white' : 'bg-[#EBE4D6] dark:bg-[#342E28]'}`}
            >
              {mood}
            </button>
          ))}
        </div>
      )}
      {!visibleReviews.length && (
        <p className="py-8 text-center text-sm text-[#786E64]">
          这段时间还没有符合条件的复盘
        </p>
      )}
      {/* Review Entries Stream */}
      <div className="flex flex-col gap-3">
        {visibleReviews.map((entry) => (
          <article
            key={entry.id}
            className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] p-4 flex flex-col gap-2.5"
          >
            {/* Header subline */}
            <div className="flex items-center justify-between text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  calendar_today
                </span>
                <span>
                  {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <span>
                {entry.time} · {entry.wordCount} 字随感
              </span>
            </div>

            {/* Entry Title */}
            <h3 className="text-[15px] font-bold text-[#28231D] dark:text-[#EDE6DE] leading-snug">
              {entry.title}
            </h3>

            {/* Body */}
            <p className="text-[13px] text-[#4F473E] dark:text-[#C5BCB2] leading-relaxed">
              {entry.content}
            </p>

            {/* Optional Photo */}
            {entry.imageUrl && (
              <div className="relative rounded-xl overflow-hidden mt-1 group">
                <img
                  src={entry.imageUrl}
                  alt={entry.title}
                  className="w-full h-44 object-cover"
                />
                {entry.imageCaption && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10.5px] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">
                      photo_camera
                    </span>
                    {entry.imageCaption}
                  </span>
                )}
              </div>
            )}

            {/* Footer with Mood Chips */}
            <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#746B61]/8 dark:border-[#5E544A]/15">
              <div className="flex flex-wrap items-center gap-1.5">
                {entry.moods.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded-full bg-[#FAF6EF] dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] text-[11px]"
                  >
                    # {m}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="text-[#8C7F73] hover:text-[#28231D] p-1"
                aria-label="更多"
              >
                <span className="material-symbols-outlined text-[16px]">
                  more_horiz
                </span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Bottom Poetic Quote (Matching Screen 5) */}
      <div className="text-center mt-6 text-[11.5px] text-[#786E64]/60 dark:text-[#A89E92]/60 select-none">
        —— 静水流深 · 日日精进 ——
      </div>

      {/* Compose Review Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm"
            onClick={() => setShowCompose(false)}
          />
          <div className="relative w-full max-w-sm bg-[#FDFCFA] dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15 z-10">
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-3">
              写下今日复盘
            </h3>
            <form
              role="dialog"
              aria-modal="true"
              aria-label="写复盘"
              onSubmit={handleCreate}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-[12px] text-[#786E64] mb-1">
                  标题
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：在代码与水墨之间找回专注"
                  className="w-full text-[13.5px] bg-[#F5F1E8] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#786E64] mb-1">
                  心境标签
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allMoods.map((m) => {
                    const isSelected = selectedMoods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMood(m)}
                        className={`px-2.5 py-1 rounded-full text-[11.5px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#A55340] text-white'
                            : 'bg-[#F5F1E8] dark:bg-[#342E28] text-[#786E64]'
                        }`}
                      >
                        # {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[#786E64] mb-1">
                  随感正文
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="写下今日所得、所思与心境沉淀..."
                  rows={4}
                  className="w-full text-[13px] bg-[#F5F1E8] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none leading-relaxed"
                />
                <div className="text-right text-[11px] text-[#786E64] mt-1">
                  {newContent.length} 字
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-3.5 py-1.5 rounded-full text-[12.5px] text-[#786E64]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() && !newContent.trim()}
                  className="px-4 py-1.5 rounded-full bg-[#A55340] text-white text-[12.5px] font-medium disabled:opacity-50"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
