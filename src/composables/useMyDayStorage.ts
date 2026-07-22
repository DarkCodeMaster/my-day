import { ref, reactive, watch, onMounted } from 'vue';
import type { MyDayState, WeightRecord, StudyItem, MoneyItem, TodayLog, TaskItem, InspirationItem, KanbanBoard, KanbanColumn, CardDisplayConfig, ArchivedTask } from '@/types';
import { todayStr } from '@/utils/date';
import { createDefaultColumns } from '@/utils/task';

const STORAGE_KEY = 'myday';
const CURRENT_VERSION = 5;

const SAMPLE_LOG_CONTENTS = new Set([
  '晨间体重 67.0 kg，比昨天 -0.3 kg 🎉',
  '完成 Vue 第 12 课：Composition API 深入',
  '收到二手书转账 ¥180',
  '阅读《原子习惯》第 4 章，进度 45%',
  '晚餐记录：沙拉 + 鸡胸肉',
]);

/** 默认看板：id 与 v3 旧任务的 status 值一致，旧数据零改写 */
export const createDefaultBoard = (): KanbanBoard => ({
  id: 'default',
  name: '默认看板',
  columns: createDefaultColumns(''),
});

/** 修正看板结构：补默认值，保证每板恰好一个 isToday、至多一个 isDone */
function sanitizeBoard(raw: any, index: number): KanbanBoard {
  const columns: KanbanColumn[] = (Array.isArray(raw?.columns) ? raw.columns : []).map((c: any, i: number) => ({
    id: String(c?.id ?? `col-${i}`),
    label: String(c?.label ?? `列 ${i + 1}`),
    color: c?.color ?? 'blue',
    isToday: !!c?.isToday,
    isDone: !!c?.isDone,
  }));
  if (columns.length === 0) {
    return createDefaultBoard();
  }
  // 恰好一个 isToday：没有则标第一列，多个则保留第一个
  const todayIdx = columns.findIndex((c) => c.isToday);
  if (todayIdx === -1) columns[0].isToday = true;
  else columns.forEach((c, i) => { c.isToday = i === todayIdx; });
  // 至多一个 isDone
  const doneIdx = columns.findIndex((c) => c.isDone);
  columns.forEach((c, i) => { c.isDone = i === doneIdx; });
  return {
    id: String(raw?.id ?? `board-${index}`),
    name: String(raw?.name ?? '未命名看板'),
    columns,
  };
}

export function migrateMyDayState(data: any): MyDayState {
  const today = todayStr();

  const migrateMoneyItems = (items: any[]): MoneyItem[] => {
    return items.map((item: any) => ({
      ...item,
      description: item.description ?? item.plan ?? '',
    }));
  };

  const migrateInspirationsFromLogs = (logs: any[]): InspirationItem[] => {
    return logs
      .filter((log: any) => log && log.category === 'inspiration')
      .map((log: any, idx: number) => ({
        id: log.id ?? Date.now() + idx,
        content: String(log.content || '')
          .replace(/^\s*💡\s*灵感[：:]?\s*/, '')
          .trim(),
        date: log.date || today,
        time: log.time || '00:00',
      }));
  };

  const moneyItems = Array.isArray(data.moneyItems)
    ? migrateMoneyItems(data.moneyItems)
    : [];

  const allLogs = Array.isArray(data.todayLogs) ? data.todayLogs : [];
  const migratedInspirations = migrateInspirationsFromLogs(allLogs);

  const todayLogs = allLogs
    .map((log: any) => (log ? { ...log, date: log.date || today } : null))
    .filter((log: any): log is TodayLog => {
      if (!log) return false;
      if (SAMPLE_LOG_CONTENTS.has(log.content)) return false;
      return log.date === today;
    });

  // v4：看板结构（旧数据补默认看板）
  const boards: KanbanBoard[] = Array.isArray(data.boards) && data.boards.length
    ? data.boards.map(sanitizeBoard)
    : [createDefaultBoard()];

  const boardIds = new Set(boards.map((b) => b.id));
  const activeBoardId = typeof data.activeBoardId === 'string' && boardIds.has(data.activeBoardId)
    ? data.activeBoardId
    : boards[0].id;

  const cardDisplay: CardDisplayConfig = {
    description: data.cardDisplay?.description ?? true,
    deadline: data.cardDisplay?.deadline ?? true,
    link: data.cardDisplay?.link ?? true,
  };

  // v4：任务补 boardId，防御性修正非法 status/boardId
  const tasks: TaskItem[] = (Array.isArray(data.tasks) ? data.tasks : []).map((t: any) => {
    const boardId = typeof t?.boardId === 'string' && boardIds.has(t.boardId) ? t.boardId : boards[0].id;
    const board = boards.find((b) => b.id === boardId)!;
    const colIds = new Set(board.columns.map((c) => c.id));
    const status = typeof t?.status === 'string' && colIds.has(t.status) ? t.status : board.columns[0].id;
    return { ...t, boardId, status };
  });

  // v5：成就系统（归档任务 + 解锁状态）
  const archivedTasks: ArchivedTask[] = Array.isArray(data.archivedTasks) ? data.archivedTasks : [];
  const unlockedAchievements: Record<string, string> =
    data.unlockedAchievements && typeof data.unlockedAchievements === 'object' && !Array.isArray(data.unlockedAchievements)
      ? data.unlockedAchievements
      : {};

  return {
    version: CURRENT_VERSION,
    activeTab: data.activeTab || 'health',
    chartRange: data.chartRange || '7d',
    weightUnit: data.weightUnit === 'jin' ? 'jin' : 'kg',
    moneyPlan: data.moneyPlan || '',
    weights: Array.isArray(data.weights) ? data.weights : [],
    studyItems: Array.isArray(data.studyItems) ? data.studyItems : [],
    moneyItems,
    todayLogs,
    tasks,
    inspirations: Array.isArray(data.inspirations)
      ? data.inspirations
      : migratedInspirations,
    boards,
    activeBoardId,
    cardDisplay,
    archivedTasks,
    unlockedAchievements,
  };
}

/* ==================== 模块级单例状态 ====================
 * 所有组件共享同一份 state。写操作只能 splice/push/改属性，
 * 禁止整体重新赋值（会断开其他组件持有的引用）。
 */
const activeTab = ref('health');
const chartRange = ref('7d');
const weightUnit = ref<'kg' | 'jin'>('kg');
const weights = reactive<WeightRecord[]>([]);
const studyItems = reactive<StudyItem[]>([]);
const moneyItems = reactive<MoneyItem[]>([]);
const todayLogs = reactive<TodayLog[]>([]);
const tasks = reactive<TaskItem[]>([]);
const inspirations = reactive<InspirationItem[]>([]);
const moneyPlan = ref('');
const boards = reactive<KanbanBoard[]>([]);
const activeBoardId = ref('default');
const cardDisplay = reactive<CardDisplayConfig>({ description: true, deadline: true, link: true });
const archivedTasks = reactive<ArchivedTask[]>([]);
const unlockedAchievements = reactive<Record<string, string>>({});
const isLoaded = ref(false);

const saveState = () => {
  try {
    const state: MyDayState = {
      version: CURRENT_VERSION,
      activeTab: activeTab.value,
      chartRange: chartRange.value,
      weightUnit: weightUnit.value,
      moneyPlan: moneyPlan.value,
      weights: [...weights],
      studyItems: [...studyItems],
      moneyItems: [...moneyItems],
      todayLogs: [...todayLogs],
      tasks: [...tasks],
      inspirations: [...inspirations],
      boards: [...boards],
      activeBoardId: activeBoardId.value,
      cardDisplay: { ...cardDisplay },
      archivedTasks: [...archivedTasks],
      unlockedAchievements: { ...unlockedAchievements },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save MyDay data:', e);
  }
};

// 自动保存：模块加载时注册一次，与应用同寿命
watch([activeTab, chartRange, weightUnit, activeBoardId], saveState);
watch(weights, saveState, { deep: true });
watch(studyItems, saveState, { deep: true });
watch(moneyItems, saveState, { deep: true });
watch(todayLogs, saveState, { deep: true });
watch(tasks, saveState, { deep: true });
watch(inspirations, saveState, { deep: true });
watch(boards, saveState, { deep: true });
watch(cardDisplay, saveState, { deep: true });
watch(archivedTasks, saveState, { deep: true });
watch(unlockedAchievements, saveState, { deep: true });
watch(moneyPlan, saveState);

let loadAttempted = false;

/** 从 localStorage 加载并迁移数据，只执行一次（flag 防重） */
function ensureLoaded() {
  if (loadAttempted) return;
  loadAttempted = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version != null && typeof parsed.version === 'number' && parsed.version > CURRENT_VERSION) {
        console.warn(`MyDay data version ${parsed.version} is newer than supported ${CURRENT_VERSION}`);
      }
      const saved = migrateMyDayState(parsed);
      activeTab.value = saved.activeTab;
      chartRange.value = saved.chartRange;
      weightUnit.value = saved.weightUnit;
      moneyPlan.value = saved.moneyPlan;
      weights.splice(0, weights.length, ...saved.weights);
      studyItems.splice(0, studyItems.length, ...saved.studyItems);
      moneyItems.splice(0, moneyItems.length, ...saved.moneyItems);
      todayLogs.splice(0, todayLogs.length, ...saved.todayLogs);
      tasks.splice(0, tasks.length, ...saved.tasks);
      inspirations.splice(0, inspirations.length, ...saved.inspirations);
      boards.splice(0, boards.length, ...saved.boards);
      activeBoardId.value = saved.activeBoardId;
      cardDisplay.description = saved.cardDisplay.description;
      cardDisplay.deadline = saved.cardDisplay.deadline;
      cardDisplay.link = saved.cardDisplay.link;
      archivedTasks.splice(0, archivedTasks.length, ...saved.archivedTasks);
      Object.keys(unlockedAchievements).forEach((k) => delete unlockedAchievements[k]);
      Object.assign(unlockedAchievements, saved.unlockedAchievements);
    }
  } catch (e) {
    console.warn('Failed to load MyDay data:', e);
  } finally {
    isLoaded.value = true;
  }
}

export function useMyDayStorage() {
  // 保持原有「挂载后才加载」的时序；重复调用由 flag 防重
  onMounted(ensureLoaded);

  return {
    activeTab,
    chartRange,
    weightUnit,
    weights,
    studyItems,
    moneyItems,
    moneyPlan,
    todayLogs,
    tasks,
    inspirations,
    boards,
    activeBoardId,
    cardDisplay,
    archivedTasks,
    unlockedAchievements,
    isLoaded,
    saveState,
  };
}
