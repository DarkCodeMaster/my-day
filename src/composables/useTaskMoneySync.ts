import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { getCurrentTimeSlot, isDeadlineWithinDays } from '@/utils/task';
import type { MoneyItem, TaskItem } from '@/types';

/** 赚钱任务截止 3 天内时，自动在「今日任务」列创建关联任务 */
export function useTaskMoneySync() {
  const { tasks } = useMyDayStorage();

  const autoCreateTodayTaskFromMoney = (money: MoneyItem) => {
    if (!isDeadlineWithinDays(money.deadline, 3)) return;
    const exists = tasks.some(
      (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
    );
    if (exists) return;
    // 数组顺序即看板列内显示顺序，自动任务也插入到列顶部
    tasks.unshift({
      id: Date.now(),
      title: `[赚钱] ${money.desc}`,
      deadline: money.deadline,
      timeSlot: getCurrentTimeSlot(),
      status: 'today',
      linkType: 'money',
      linkId: money.id,
    });
  };

  /** 编辑赚钱任务后，按新截止日期 创建/更新/删除 关联的今日任务 */
  const syncAutoTodayTaskForMoney = (money: MoneyItem) => {
    const existing = tasks.find(
      (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
    );
    if (isDeadlineWithinDays(money.deadline, 3)) {
      if (existing) {
        existing.deadline = money.deadline;
        if (existing.status !== 'today') existing.status = 'today';
      } else {
        tasks.unshift({
          id: Date.now(),
          title: `[赚钱] ${money.desc}`,
          deadline: money.deadline,
          status: 'today',
          linkType: 'money',
          linkId: money.id,
        });
      }
    } else if (existing) {
      const idx = tasks.indexOf(existing);
      if (idx > -1) tasks.splice(idx, 1);
    }
  };

  return { autoCreateTodayTaskFromMoney, syncAutoTodayTaskForMoney };
}
