import { ref } from 'vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useTodayLog } from '@/composables/useTodayLog';
import type { StudyItem, MoneyItem } from '@/types';

// 模块级单例：学习/赚钱表格共用一个删除确认弹窗
const deleteModalOpen = ref(false);
const deleteTarget = ref<{ type: 'study' | 'money'; id: number } | null>(null);

export function useDeleteConfirm() {
  const { studyItems, moneyItems, tasks } = useMyDayStorage();
  const { pushTodayLog } = useTodayLog();

  const openDelete = (type: 'study' | 'money', id: number) => {
    deleteTarget.value = { type, id };
    deleteModalOpen.value = true;
  };

  const confirmDelete = () => {
    if (!deleteTarget.value) return;
    const { type, id } = deleteTarget.value;
    if (type === 'study') {
      const idx = studyItems.findIndex((s: StudyItem) => s.id === id);
      if (idx > -1) {
        const name = studyItems[idx].name;
        studyItems.splice(idx, 1);
        pushTodayLog('study', `删除学习项 ${name}`);
      }
    } else {
      const idx = moneyItems.findIndex((m: MoneyItem) => m.id === id);
      if (idx > -1) {
        const desc = moneyItems[idx].desc;
        moneyItems.splice(idx, 1);
        // 级联删除关联的看板任务
        for (let i = tasks.length - 1; i >= 0; i--) {
          if (tasks[i].linkType === 'money' && tasks[i].linkId === id) {
            tasks.splice(i, 1);
          }
        }
        pushTodayLog('money', `删除赚钱任务 ${desc}`);
      }
    }
    deleteModalOpen.value = false;
  };

  return { deleteModalOpen, openDelete, confirmDelete };
}
