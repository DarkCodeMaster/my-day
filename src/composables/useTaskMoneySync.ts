import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { getCurrentTimeSlot, isDeadlineWithinDays } from '@/utils/task';
import type { MoneyItem, TaskItem } from '@/types';

/** 赚钱任务截止 3 天内时，自动在「今日列」创建关联任务 */
export function useTaskMoneySync() {
  const { tasks, boards } = useMyDayStorage();

  /** 自动任务落点：默认看板的今日列（不跟随 UI 激活看板） */
  const resolveTodayTarget = () => {
    const board = boards.find((b) => b.id === 'default') ?? boards[0];
    const col = board?.columns.find((c) => c.isToday) ?? board?.columns[0];
    return { boardId: board?.id ?? 'default', status: col?.id ?? 'today' };
  };

  const autoCreateTodayTaskFromMoney = (money: MoneyItem) => {
    if (!isDeadlineWithinDays(money.deadline, 3)) return;
    const exists = tasks.some(
      (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
    );
    if (exists) return;
    const target = resolveTodayTarget();
    // 数组顺序即看板列内显示顺序，自动任务也插入到列顶部
    tasks.unshift({
      id: Date.now(),
      title: `[赚钱] ${money.desc}`,
      deadline: money.deadline,
      timeSlot: getCurrentTimeSlot(),
      status: target.status,
      boardId: target.boardId,
      linkType: 'money',
      linkId: money.id,
    });
  };

  /** 编辑赚钱任务后，按新截止日期 创建/更新/删除 关联的今日任务 */
  const syncAutoTodayTaskForMoney = (money: MoneyItem) => {
    const existing = tasks.find(
      (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
    );
    const target = resolveTodayTarget();
    if (isDeadlineWithinDays(money.deadline, 3)) {
      if (existing) {
        existing.deadline = money.deadline;
        if (existing.boardId !== target.boardId || existing.status !== target.status) {
          existing.boardId = target.boardId;
          existing.status = target.status;
        }
      } else {
        tasks.unshift({
          id: Date.now(),
          title: `[赚钱] ${money.desc}`,
          deadline: money.deadline,
          status: target.status,
          boardId: target.boardId,
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
