import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { todayStr } from '@/utils/date';
import type { TodayLog } from '@/types';

export const nowTimeStr = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export function useTodayLog() {
  const { todayLogs } = useMyDayStorage();

  const pushTodayLog = (category: TodayLog['category'], content: string) => {
    todayLogs.push({ date: todayStr(), time: nowTimeStr(), category, content });
  };

  return { todayLogs, pushTodayLog };
}
