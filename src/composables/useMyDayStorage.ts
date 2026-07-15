import { ref, reactive, watch, onMounted } from 'vue';
import type { MyDayState, WeightRecord, StudyItem, MoneyItem, TodayLog } from '@/types';
import { todayStr } from '@/utils/date';

const STORAGE_KEY = 'myday';

const SAMPLE_LOG_CONTENTS = new Set([
  '晨间体重 67.0 kg，比昨天 -0.3 kg 🎉',
  '完成 Vue 第 12 课：Composition API 深入',
  '收到二手书转账 ¥180',
  '阅读《原子习惯》第 4 章，进度 45%',
  '晚餐记录：沙拉 + 鸡胸肉',
]);

export function useMyDayStorage() {
  const activeTab = ref('health');
  const chartRange = ref('7d');
  const weights = reactive<WeightRecord[]>([]);
  const studyItems = reactive<StudyItem[]>([]);
  const moneyItems = reactive<MoneyItem[]>([]);
  const todayLogs = reactive<TodayLog[]>([]);
  const isLoaded = ref(false);

  const saveState = () => {
    try {
      const state: MyDayState = {
        version: 1,
        activeTab: activeTab.value,
        chartRange: chartRange.value,
        weights: [...weights],
        studyItems: [...studyItems],
        moneyItems: [...moneyItems],
        todayLogs: [...todayLogs],
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
        const saved: Partial<MyDayState> = JSON.parse(raw);
        if (saved.activeTab) activeTab.value = saved.activeTab;
        if (saved.chartRange) chartRange.value = saved.chartRange;
        if (Array.isArray(saved.weights)) weights.splice(0, weights.length, ...saved.weights);
        if (Array.isArray(saved.studyItems)) studyItems.splice(0, studyItems.length, ...saved.studyItems);
        if (Array.isArray(saved.moneyItems)) moneyItems.splice(0, moneyItems.length, ...saved.moneyItems);
        if (Array.isArray(saved.todayLogs)) {
        const today = todayStr();
        todayLogs.splice(
          0,
          todayLogs.length,
          ...saved.todayLogs
            .map((log) => ({ ...log, date: log.date || today }))
            .filter((log) => log.date === today && !SAMPLE_LOG_CONTENTS.has(log.content))
        );
      }
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

  return {
    activeTab,
    chartRange,
    weights,
    studyItems,
    moneyItems,
    todayLogs,
    isLoaded,
  };
}
