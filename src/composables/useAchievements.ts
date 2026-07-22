import { computed, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { Notification } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { celebrate } from '@/composables/useCelebration';
import type { AchievementTier } from '@/composables/useCelebration';
import { formatDateStr } from '@/utils/date';

export type { AchievementTier };
export type AchievementModule = 'task' | 'study' | 'money' | 'health' | 'inspiration' | 'meta';

export const ACHIEVEMENT_MODULE_LABELS: Record<AchievementModule, string> = {
  task: '✅ 任务',
  study: '📚 学习',
  money: '💰 赚钱',
  health: '⚖️ 健康',
  inspiration: '💡 灵感',
  meta: '🏅 收藏家',
};

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: '铜',
  silver: '银',
  gold: '金',
  platinum: '白金',
};

/** 派生统计口径：全部从现有数据实时推导，归档不损失完成历史 */
interface AchievementStats {
  totalCompleted: number;
  maxInOneDay: number;
  maxTaskStreak: number;
  hasNightCompletion: boolean;
  hasEarlyCompletion: boolean;
  archivedCount: number;
  boardCount: number;
  studyCompleted: number;
  studyBooksCompleted: number;
  studyVideosCompleted: number;
  moneyEarnedTotal: number;
  moneyDoneCount: number;
  weightDays: number;
  maxWeightStreak: number;
  inspirationCount: number;
}

export interface AchievementDef {
  id: string;
  module: AchievementModule;
  name: string;
  emoji: string;
  tier: AchievementTier;
  description: string;
  /** unlockedCount：已解锁成就数（收藏家类成就用） */
  check: (s: AchievementStats, unlockedCount: number) => boolean;
  progress?: (s: AchievementStats, unlockedCount: number) => { current: number; target: number };
}

/* 'YYYY-MM-DD' -> UTC 毫秒（只用于相邻天数差计算，时区无关） */
const dayMs = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** 日期集合中的最长连续天数 */
const longestStreak = (dates: Iterable<string>): number => {
  const days = [...new Set(dates)].map(dayMs).sort((a, b) => a - b);
  let best = 0;
  let cur = 0;
  let prev = -1;
  for (const t of days) {
    cur = t - prev === 86400000 ? cur + 1 : 1;
    prev = t;
    if (cur > best) best = cur;
  }
  return best;
};

/** 计数类成就的进度条辅助 */
const countProgress = (target: number, get: (s: AchievementStats) => number) =>
  (s: AchievementStats) => ({ current: Math.min(get(s), target), target });

const ACHIEVEMENTS: AchievementDef[] = [
  // ---- 任务 ----
  { id: 'task-first', module: 'task', name: '初露锋芒', emoji: '🌱', tier: 'bronze', description: '累计完成 1 个任务', check: (s) => s.totalCompleted >= 1, progress: countProgress(1, (s) => s.totalCompleted) },
  { id: 'task-10', module: 'task', name: '小有起色', emoji: '🌿', tier: 'bronze', description: '累计完成 10 个任务', check: (s) => s.totalCompleted >= 10, progress: countProgress(10, (s) => s.totalCompleted) },
  { id: 'task-50', module: 'task', name: '得心应手', emoji: '🌳', tier: 'silver', description: '累计完成 50 个任务', check: (s) => s.totalCompleted >= 50, progress: countProgress(50, (s) => s.totalCompleted) },
  { id: 'task-100', module: 'task', name: '任务大师', emoji: '🏆', tier: 'gold', description: '累计完成 100 个任务', check: (s) => s.totalCompleted >= 100, progress: countProgress(100, (s) => s.totalCompleted) },
  { id: 'task-200', module: 'task', name: '岛屿传说', emoji: '👑', tier: 'platinum', description: '累计完成 200 个任务', check: (s) => s.totalCompleted >= 200, progress: countProgress(200, (s) => s.totalCompleted) },
  { id: 'task-day-5', module: 'task', name: '日理万机', emoji: '⚡', tier: 'silver', description: '一天内完成 5 个任务', check: (s) => s.maxInOneDay >= 5, progress: countProgress(5, (s) => s.maxInOneDay) },
  { id: 'task-streak-3', module: 'task', name: '三日勤劳', emoji: '📅', tier: 'bronze', description: '连续 3 天都有完成任务', check: (s) => s.maxTaskStreak >= 3, progress: countProgress(3, (s) => s.maxTaskStreak) },
  { id: 'task-streak-7', module: 'task', name: '七日坚持', emoji: '🔥', tier: 'gold', description: '连续 7 天都有完成任务', check: (s) => s.maxTaskStreak >= 7, progress: countProgress(7, (s) => s.maxTaskStreak) },
  { id: 'task-night-owl', module: 'task', name: '夜猫子', emoji: '🌙', tier: 'bronze', description: '在凌晨 0-6 点完成任务', check: (s) => s.hasNightCompletion },
  { id: 'task-early-bird', module: 'task', name: '闻鸡起舞', emoji: '🌅', tier: 'bronze', description: '在清晨 6-9 点完成任务', check: (s) => s.hasEarlyCompletion },
  { id: 'archive-first', module: 'task', name: '断舍离', emoji: '📦', tier: 'bronze', description: '归档 1 个已完成任务', check: (s) => s.archivedCount >= 1, progress: countProgress(1, (s) => s.archivedCount) },
  { id: 'board-3', module: 'task', name: '运筹帷幄', emoji: '🗂️', tier: 'bronze', description: '创建 3 个看板', check: (s) => s.boardCount >= 3, progress: countProgress(3, (s) => s.boardCount) },
  // ---- 学习 ----
  { id: 'study-first', module: 'study', name: '学有所成', emoji: '🎓', tier: 'bronze', description: '学完 1 个学习项目', check: (s) => s.studyCompleted >= 1, progress: countProgress(1, (s) => s.studyCompleted) },
  { id: 'study-book-1', module: 'study', name: '开卷有益', emoji: '📖', tier: 'bronze', description: '读完 1 本书', check: (s) => s.studyBooksCompleted >= 1, progress: countProgress(1, (s) => s.studyBooksCompleted) },
  { id: 'study-video-1', module: 'study', name: '网课先锋', emoji: '🎬', tier: 'bronze', description: '看完 1 套视频课程', check: (s) => s.studyVideosCompleted >= 1, progress: countProgress(1, (s) => s.studyVideosCompleted) },
  { id: 'study-5', module: 'study', name: '学富五车', emoji: '📚', tier: 'silver', description: '学完 5 个学习项目', check: (s) => s.studyCompleted >= 5, progress: countProgress(5, (s) => s.studyCompleted) },
  { id: 'study-10', module: 'study', name: '学无止境', emoji: '🏫', tier: 'gold', description: '学完 10 个学习项目', check: (s) => s.studyCompleted >= 10, progress: countProgress(10, (s) => s.studyCompleted) },
  // ---- 赚钱 ----
  { id: 'money-first', module: 'money', name: '初战告捷', emoji: '💵', tier: 'bronze', description: '完成 1 个赚钱任务', check: (s) => s.moneyDoneCount >= 1, progress: countProgress(1, (s) => s.moneyDoneCount) },
  { id: 'money-100', module: 'money', name: '第一桶金', emoji: '💰', tier: 'bronze', description: '累计赚得 100 元', check: (s) => s.moneyEarnedTotal >= 100, progress: countProgress(100, (s) => s.moneyEarnedTotal) },
  { id: 'money-1000', module: 'money', name: '小富翁', emoji: '💎', tier: 'silver', description: '累计赚得 1000 元', check: (s) => s.moneyEarnedTotal >= 1000, progress: countProgress(1000, (s) => s.moneyEarnedTotal) },
  { id: 'money-tasks-10', module: 'money', name: '财源广进', emoji: '🧧', tier: 'silver', description: '完成 10 个赚钱任务', check: (s) => s.moneyDoneCount >= 10, progress: countProgress(10, (s) => s.moneyDoneCount) },
  { id: 'money-10000', module: 'money', name: '财富自由', emoji: '🤑', tier: 'gold', description: '累计赚得 10000 元', check: (s) => s.moneyEarnedTotal >= 10000, progress: countProgress(10000, (s) => s.moneyEarnedTotal) },
  { id: 'money-50000', module: 'money', name: '财富传奇', emoji: '🪙', tier: 'platinum', description: '累计赚得 50000 元', check: (s) => s.moneyEarnedTotal >= 50000, progress: countProgress(50000, (s) => s.moneyEarnedTotal) },
  // ---- 健康 ----
  { id: 'weight-first', module: 'health', name: '认识自己', emoji: '🍃', tier: 'bronze', description: '第 1 次记录体重', check: (s) => s.weightDays >= 1, progress: countProgress(1, (s) => s.weightDays) },
  { id: 'weight-7', module: 'health', name: '健康打卡', emoji: '⚖️', tier: 'bronze', description: '记录体重满 7 天', check: (s) => s.weightDays >= 7, progress: countProgress(7, (s) => s.weightDays) },
  { id: 'weight-30', module: 'health', name: '持之以恒', emoji: '🏃', tier: 'silver', description: '记录体重满 30 天', check: (s) => s.weightDays >= 30, progress: countProgress(30, (s) => s.weightDays) },
  { id: 'weight-streak-7', module: 'health', name: '自律达人', emoji: '💪', tier: 'silver', description: '连续 7 天记录体重', check: (s) => s.maxWeightStreak >= 7, progress: countProgress(7, (s) => s.maxWeightStreak) },
  { id: 'weight-streak-30', module: 'health', name: '钢铁意志', emoji: '🎖️', tier: 'gold', description: '连续 30 天记录体重', check: (s) => s.maxWeightStreak >= 30, progress: countProgress(30, (s) => s.maxWeightStreak) },
  // ---- 灵感 ----
  { id: 'inspiration-first', module: 'inspiration', name: '灵感初现', emoji: '✨', tier: 'bronze', description: '记录第 1 条灵感', check: (s) => s.inspirationCount >= 1, progress: countProgress(1, (s) => s.inspirationCount) },
  { id: 'inspiration-10', module: 'inspiration', name: '灵光一闪', emoji: '💡', tier: 'bronze', description: '记录 10 条灵感', check: (s) => s.inspirationCount >= 10, progress: countProgress(10, (s) => s.inspirationCount) },
  { id: 'inspiration-50', module: 'inspiration', name: '点子王', emoji: '🌟', tier: 'silver', description: '记录 50 条灵感', check: (s) => s.inspirationCount >= 50, progress: countProgress(50, (s) => s.inspirationCount) },
  { id: 'inspiration-100', module: 'inspiration', name: '思想巨匠', emoji: '🧠', tier: 'gold', description: '记录 100 条灵感', check: (s) => s.inspirationCount >= 100, progress: countProgress(100, (s) => s.inspirationCount) },
  // ---- 收藏家（元成就：统计其他成就的解锁数） ----
  { id: 'meta-5', module: 'meta', name: '小收藏家', emoji: '🏵️', tier: 'bronze', description: '解锁 5 个成就', check: (_s, u) => u >= 5, progress: (_s, u) => ({ current: Math.min(u, 5), target: 5 }) },
  { id: 'meta-15', module: 'meta', name: '收藏大师', emoji: '🏅', tier: 'silver', description: '解锁 15 个成就', check: (_s, u) => u >= 15, progress: (_s, u) => ({ current: Math.min(u, 15), target: 15 }) },
  { id: 'meta-all', module: 'meta', name: '传说全制霸', emoji: '🌈', tier: 'platinum', description: '解锁全部其他成就', check: (_s, u) => u >= ACHIEVEMENTS.length - 1, progress: (_s, u) => ({ current: Math.min(u, ACHIEVEMENTS.length - 1), target: ACHIEVEMENTS.length - 1 }) },
];

/* ==================== 模块级惰性单例引擎 ====================
 * 首次调用 useAchievements 时挂上 watcher（在 App.vue setup 顶层调用一次）。
 * 统计是纯派生的 computed：任何底层数据变化 → stats 失效 → watch 触发 → 实时解锁。
 */
let inited = false;
/** 静默回填完成后才允许弹通知/放烟花（老数据升级不刷屏） */
let armed = false;
let stats: ComputedRef<AchievementStats>;

function buildStats(s: ReturnType<typeof useMyDayStorage>): ComputedRef<AchievementStats> {
  return computed(() => {
    // 全部看板的完成列集合（boardId|columnId）
    const doneColKeys = new Set(
      s.boards.flatMap((b) => b.columns.filter((c) => c.isDone).map((c) => `${b.id}|${c.id}`)),
    );
    const doneTasks = s.tasks.filter((t) => doneColKeys.has(`${t.boardId}|${t.status}`));
    // 完成历史 = 看板完成列任务的 completedAt + 归档任务的 completedAt（回退 archivedAt）
    const completedIsos = [
      ...doneTasks.map((t) => t.completedAt),
      ...s.archivedTasks.map((a) => a.completedAt ?? a.archivedAt),
    ].filter((x): x is string => !!x);
    const completedDates = completedIsos.map((iso) => formatDateStr(new Date(iso)));
    const perDay = new Map<string, number>();
    completedDates.forEach((d) => perDay.set(d, (perDay.get(d) ?? 0) + 1));
    const hours = completedIsos.map((iso) => new Date(iso).getHours());
    return {
      totalCompleted: doneTasks.length + s.archivedTasks.length,
      maxInOneDay: perDay.size ? Math.max(...perDay.values()) : 0,
      maxTaskStreak: longestStreak(completedDates),
      hasNightCompletion: hours.some((h) => h >= 0 && h < 6),
      hasEarlyCompletion: hours.some((h) => h >= 6 && h < 9),
      archivedCount: s.archivedTasks.length,
      boardCount: s.boards.length,
      studyCompleted: s.studyItems.filter((i) => i.progress >= 100).length,
      studyBooksCompleted: s.studyItems.filter((i) => i.type === 'book' && i.progress >= 100).length,
      studyVideosCompleted: s.studyItems.filter((i) => i.type === 'video' && i.progress >= 100).length,
      moneyEarnedTotal: s.moneyItems
        .filter((m) => m.status === 'done')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
      moneyDoneCount: s.moneyItems.filter((m) => m.status === 'done').length,
      weightDays: new Set(s.weights.map((w) => w.date)).size,
      maxWeightStreak: longestStreak(s.weights.map((w) => w.date)),
      inspirationCount: s.inspirations.length,
    };
  });
}

function evaluate(unlockedMap: Record<string, string>, notify: boolean) {
  for (const def of ACHIEVEMENTS) {
    if (unlockedMap[def.id]) continue;
    if (def.check(stats.value, Object.keys(unlockedMap).length)) {
      // reactive 对象加键 → useMyDayStorage 的 deep watch 自动保存
      unlockedMap[def.id] = new Date().toISOString();
      if (notify) {
        Notification.open({
          message: `🏆 成就解锁「${def.name}」`,
          description: def.description,
          duration: 3, // 单位：秒
        });
        celebrate(def.tier);
      }
    }
  }
}

export function useAchievements() {
  const storage = useMyDayStorage();

  if (!inited) {
    inited = true;
    stats = buildStats(storage);
    // 加载完成后：静默回填已满足的成就（不通知不放烟花），再武装实时监听
    watch(
      storage.isLoaded,
      (loaded) => {
        if (!loaded) return;
        evaluate(storage.unlockedAchievements, false);
        armed = true;
      },
      { immediate: true },
    );
    watch(stats, () => {
      if (armed) evaluate(storage.unlockedAchievements, true);
    });
  }

  const list = computed(() => {
    const unlockedSoFar = Object.keys(storage.unlockedAchievements).length;
    return ACHIEVEMENTS.map((def) => ({
      ...def,
      unlocked: !!storage.unlockedAchievements[def.id],
      unlockedAt: storage.unlockedAchievements[def.id],
      progress: def.progress?.(stats.value, unlockedSoFar),
    }));
  });
  const unlockedCount = computed(() => list.value.filter((a) => a.unlocked).length);

  return { list, stats, unlockedCount, totalCount: ACHIEVEMENTS.length };
}
