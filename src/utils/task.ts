import type { TaskItem } from '@/types';

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
