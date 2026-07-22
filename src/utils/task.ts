import type { KanbanColorKey, TaskItem } from '@/types';

/** 看板列预设色板 */
export const KANBAN_COLOR_OPTIONS: { key: KanbanColorKey; label: string }[] = [
  { key: 'red', label: '🔴 红色' },
  { key: 'yellow', label: '🟡 黄色' },
  { key: 'blue', label: '🔵 蓝色' },
  { key: 'green', label: '🟢 绿色' },
  { key: 'pink', label: '🌸 粉色' },
  { key: 'teal', label: '🩵 青色' },
  { key: 'purple', label: '🟣 紫色' },
  { key: 'orange', label: '🟠 橙色' },
];

/** 新建看板时的默认列模板（id 需调用方替换时间戳保证唯一） */
export const createDefaultColumns = (suffix: string) => [
  { id: `today${suffix}`, label: '今日任务', color: 'red' as KanbanColorKey, isToday: true },
  { id: `todo${suffix}`, label: '待开始', color: 'yellow' as KanbanColorKey },
  { id: `doing${suffix}`, label: '进行中', color: 'blue' as KanbanColorKey },
  { id: `done${suffix}`, label: '已完成', color: 'green' as KanbanColorKey, isDone: true },
];

export const taskTimeSlotOptions = [
  { key: 'dawn', label: '凌晨（00:00-06:00）' },
  { key: 'morning', label: '上午（06:00-12:00）' },
  { key: 'afternoon', label: '下午（12:00-18:00）' },
  { key: 'evening', label: '晚上（18:00-24:00）' },
];

export const getCurrentTimeSlot = (): NonNullable<TaskItem['timeSlot']> => {
  const hour = new Date().getHours();
  if (hour < 6) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

export const getTaskTimeSlotLabel = (key?: TaskItem['timeSlot']) =>
  taskTimeSlotOptions.find((o) => o.key === key)?.label || '';

/** 任务未显式设置时段时，按创建时间（id 即时间戳）推断 */
export const getTaskTimeSlot = (task: TaskItem): NonNullable<TaskItem['timeSlot']> => {
  if (task.timeSlot) return task.timeSlot;
  const hour = new Date(task.id).getHours();
  if (hour < 6) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

/** 截止时间是否在今天起 days 天内（含今天） */
export const isDeadlineWithinDays = (deadline: string | undefined, days: number) => {
  if (!deadline) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + days);
  const d = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime() && d.getTime() <= end.getTime();
};

export const parseTaskLink = (key: string) => {
  if (key === 'none') return { linkType: undefined as 'study' | 'money' | undefined, linkId: undefined as number | undefined };
  const [type, id] = key.split('-');
  return { linkType: type as 'study' | 'money', linkId: Number(id) };
};

export const formatTaskLink = (linkType?: 'study' | 'money' | null, linkId?: number) => {
  if (!linkType || linkId == null) return 'none';
  return `${linkType}-${linkId}`;
};
