import { ref } from 'vue';
import { todayStr } from '@/utils/date';

/**
 * 各面板的视图状态（模块级单例）。
 * 组件库 Tabs 用 v-if 只渲染激活面板，面板组件切 Tab 即卸载，
 * 这些状态若放组件内会丢失，故提升为单例保持。
 */

// 健康
const currentMonth = ref(new Date());
const selectedDate = ref(todayStr());
const newWeightDate = ref(todayStr());

// 学习
const studyType = ref('all');
const showCompletedStudy = ref(false);
const studyPage = ref(1);

// 赚钱
const moneyView = ref<'tasks' | 'plan'>('tasks');
const moneyPage = ref(1);
const moneyPlanDraft = ref('');

// 任务（看板/日历视图切换 + 日历月份）
const taskView = ref<'board' | 'calendar'>('board');
const taskCalendarMonth = ref(new Date());

export function usePanelUiState() {
  return {
    // health
    currentMonth,
    selectedDate,
    newWeightDate,
    // study
    studyType,
    showCompletedStudy,
    studyPage,
    // money
    moneyView,
    moneyPage,
    moneyPlanDraft,
    // tasks
    taskView,
    taskCalendarMonth,
  };
}
