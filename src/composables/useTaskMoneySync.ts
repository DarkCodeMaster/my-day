import { watch } from 'vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { getCurrentTimeSlot, isDeadlineWithinDays } from '@/utils/task';
import type { KanbanBoard, KanbanColumn, MoneyItem, TaskItem } from '@/types';

/* ==================== 赚钱任务 → 看板任务 全量同步 ====================
 * 规则（与用户确认）：
 * - 每个赚钱任务 ↔ 一个看板任务（linkType:'money' + linkId）
 * - 新建落点：截止 ≤3 天 → 默认看板今日列；>3 天 → 第一个普通列（待开始）
 * - 赚钱标完成 → 看板任务移入完成列（记 completedAt，计入成就）；
 *   取消完成 → 移回普通列并清 completedAt
 * - 用户手动拖动过的列位置不动（完成联动除外），只同步标题/截止日期
 * - 赚钱删除 → 看板任务级联删除（useDeleteConfirm 主路径，此处兜底孤儿）
 * 在 App.vue setup 顶层调用一次（与 MoneyPanel 是否挂载无关）。
 */

let inited = false;
let armed = false;
/** 避免同毫秒批量创建时 id 冲突 */
let idSeq = 0;

const AUTO_PREFIX = '[赚钱] ';
/** 只接管自动创建的同步任务；用户手动关联（标题非 [赚钱] 前缀）的任务不动 */
const isAutoManaged = (t: TaskItem) => t.linkType === 'money' && t.title.startsWith(AUTO_PREFIX);

export function useTaskMoneySync() {
  const { tasks, boards, moneyItems, isLoaded } = useMyDayStorage();

  /** 默认看板的三类目标列（默认看板被删时回退第一个看板） */
  const resolveColumns = (): {
    board: KanbanBoard | undefined;
    todayCol: KanbanColumn | undefined;
    todoCol: KanbanColumn | undefined;
    doneCol: KanbanColumn | undefined;
  } => {
    const board = boards.find((b) => b.id === 'default') ?? boards[0];
    const todayCol = board?.columns.find((c) => c.isToday) ?? board?.columns[0];
    const todoCol = board?.columns.find((c) => !c.isToday && !c.isDone) ?? todayCol;
    const doneCol = board?.columns.find((c) => c.isDone);
    return { board, todayCol, todoCol, doneCol };
  };

  const createLinkedTask = (money: MoneyItem, status: string, boardId: string, completedAt?: string) => {
    tasks.unshift({
      id: Date.now() + idSeq++,
      title: `[赚钱] ${money.desc}`,
      deadline: money.deadline,
      timeSlot: getCurrentTimeSlot(),
      status,
      boardId,
      completedAt,
      linkType: 'money',
      linkId: money.id,
    });
  };

  const syncOne = (money: MoneyItem) => {
    const { board, todayCol, todoCol, doneCol } = resolveColumns();
    if (!board || !todayCol || !todoCol) return;
    const existing = tasks.find((t: TaskItem) => t.linkType === 'money' && t.linkId === money.id);
    if (existing && !isAutoManaged(existing)) return; // 用户手动关联的任务不接管

    if (money.status === 'done') {
      // 完成联动：进入完成列并记完成时间
      if (existing) {
        if (doneCol && existing.status !== doneCol.id) {
          existing.status = doneCol.id;
          existing.completedAt = new Date().toISOString();
        } else if (doneCol && !existing.completedAt) {
          existing.completedAt = new Date().toISOString();
        }
      } else if (doneCol) {
        createLinkedTask(money, doneCol.id, board.id, new Date().toISOString());
      }
      return;
    }

    // pending / paused
    if (existing) {
      if (doneCol && existing.status === doneCol.id) {
        // 取消完成：移回普通列，清完成时间
        existing.status = todoCol.id;
        existing.completedAt = undefined;
      }
      // 其他情况尊重用户手动摆放的列，只同步字段
      if (existing.title !== `[赚钱] ${money.desc}`) existing.title = `[赚钱] ${money.desc}`;
      if (existing.deadline !== money.deadline) existing.deadline = money.deadline;
    } else {
      const near = isDeadlineWithinDays(money.deadline, 3);
      createLinkedTask(money, near ? todayCol.id : todoCol.id, board.id);
    }
  };

  const syncAll = () => {
    moneyItems.forEach(syncOne);
    // 兜底：清理赚钱侧已不存在的自动同步任务（如导入数据产生的孤儿）
    const moneyIds = new Set(moneyItems.map((m) => m.id));
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (isAutoManaged(tasks[i]) && !moneyIds.has(tasks[i].linkId!)) {
        tasks.splice(i, 1);
      }
    }
  };

  if (!inited) {
    inited = true;
    // 存储加载完成后做首轮全量同步（老数据/导入数据自动补齐），之后再武装实时监听
    watch(
      isLoaded,
      (loaded) => {
        if (!loaded) return;
        syncAll();
        armed = true;
      },
      { immediate: true },
    );
    watch(moneyItems, () => { if (armed) syncAll(); }, { deep: true });
  }

  return { syncAll };
}
