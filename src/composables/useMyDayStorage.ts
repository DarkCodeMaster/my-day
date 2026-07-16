import { ref, reactive, watch, onMounted } from 'vue';
import type { MyDayState, WeightRecord, StudyItem, MoneyItem, TodayLog, TaskItem, InspirationItem } from '@/types';
import { todayStr } from '@/utils/date';

const STORAGE_KEY = 'myday';
const CURRENT_VERSION = 2;

const SAMPLE_LOG_CONTENTS = new Set([
  '晨间体重 67.0 kg，比昨天 -0.3 kg 🎉',
  '完成 Vue 第 12 课：Composition API 深入',
  '收到二手书转账 ¥180',
  '阅读《原子习惯》第 4 章，进度 45%',
  '晚餐记录：沙拉 + 鸡胸肉',
]);

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

  return {
    version: CURRENT_VERSION,
    activeTab: data.activeTab || 'health',
    chartRange: data.chartRange || '7d',
    moneyPlan: data.moneyPlan || '',
    weights: Array.isArray(data.weights) ? data.weights : [],
    studyItems: Array.isArray(data.studyItems) ? data.studyItems : [],
    moneyItems,
    todayLogs,
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    inspirations: Array.isArray(data.inspirations)
      ? data.inspirations
      : migratedInspirations,
  };
}

export function useMyDayStorage() {
  const activeTab = ref('health');
  const chartRange = ref('7d');
  const weights = reactive<WeightRecord[]>([]);
  const studyItems = reactive<StudyItem[]>([]);
  const moneyItems = reactive<MoneyItem[]>([]);
  const todayLogs = reactive<TodayLog[]>([]);
  const tasks = reactive<TaskItem[]>([]);
  const inspirations = reactive<InspirationItem[]>([]);
  const moneyPlan = ref('');
  const isLoaded = ref(false);

  const saveState = () => {
    try {
      const state: MyDayState = {
        version: CURRENT_VERSION,
        activeTab: activeTab.value,
        chartRange: chartRange.value,
        moneyPlan: moneyPlan.value,
        weights: [...weights],
        studyItems: [...studyItems],
        moneyItems: [...moneyItems],
        todayLogs: [...todayLogs],
        tasks: [...tasks],
        inspirations: [...inspirations],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save MyDay data:', e);
    }
  };

  onMounted(() => {
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
        moneyPlan.value = saved.moneyPlan;
        weights.splice(0, weights.length, ...saved.weights);
        studyItems.splice(0, studyItems.length, ...saved.studyItems);
        moneyItems.splice(0, moneyItems.length, ...saved.moneyItems);
        todayLogs.splice(0, todayLogs.length, ...saved.todayLogs);
        tasks.splice(0, tasks.length, ...saved.tasks);
        inspirations.splice(0, inspirations.length, ...saved.inspirations);
      }
    } catch (e) {
      console.warn('Failed to load MyDay data:', e);
    } finally {
      isLoaded.value = true;
    }
  });

  watch([activeTab, chartRange], saveState);
  watch(weights, saveState, { deep: true });
  watch(studyItems, saveState, { deep: true });
  watch(moneyItems, saveState, { deep: true });
  watch(todayLogs, saveState, { deep: true });
  watch(tasks, saveState, { deep: true });
  watch(inspirations, saveState, { deep: true });
  watch(moneyPlan, saveState);

  return {
    activeTab,
    chartRange,
    weights,
    studyItems,
    moneyItems,
    moneyPlan,
    todayLogs,
    tasks,
    inspirations,
    isLoaded,
    saveState,
  };
}
