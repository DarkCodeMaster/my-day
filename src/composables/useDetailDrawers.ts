import { ref } from 'vue';
import type { StudyItem, MoneyItem } from '@/types';

// 模块级单例：学习/赚钱详情抽屉被多个面板与任务看板共同触发
const detailDrawerOpen = ref(false);
const detailRecord = ref<StudyItem | null>(null);
const moneyDetailDrawerOpen = ref(false);
const moneyDetailRecord = ref<MoneyItem | null>(null);

export function useDetailDrawers() {
  const openDetail = (record: StudyItem) => {
    detailRecord.value = record;
    detailDrawerOpen.value = true;
  };

  const openMoneyDetail = (record: MoneyItem) => {
    moneyDetailRecord.value = record;
    moneyDetailDrawerOpen.value = true;
  };

  return {
    detailDrawerOpen,
    detailRecord,
    moneyDetailDrawerOpen,
    moneyDetailRecord,
    openDetail,
    openMoneyDetail,
  };
}
