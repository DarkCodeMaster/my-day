import { Notification } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { nowTimeStr } from '@/composables/useTodayLog';
import { todayStr } from '@/utils/date';

interface QuickInspirationBridge {
  onAddInspiration?: (cb: (text: string) => void) => void;
}

/**
 * 桌面浮动窗速记入口：主窗口接收主进程转发的灵感文本，
 * 写入 inspirations 单例（deep watch 自动落盘），并记录到今日时间线。
 * 在 App.vue setup 顶层调用一次。
 */
export function useQuickInspiration() {
  const { inspirations } = useMyDayStorage();

  const api = (window as unknown as { electronAPI?: QuickInspirationBridge }).electronAPI;
  api?.onAddInspiration?.((text: string) => {
    const content = String(text ?? '').trim();
    if (!content) return;
    inspirations.push({
      id: Date.now(),
      content,
      date: todayStr(),
      time: nowTimeStr(),
    });
    Notification.success('🌿 浮动窗速记：灵感已记录');
  });
}
