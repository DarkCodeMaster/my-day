import { reactive } from 'vue';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CelebrationBurst {
  id: number;
  tier: AchievementTier;
}

/* 庆祝队列：解锁成就时入队，CelebrationOverlay 消费并错开播放。
 * 模块级单例，与 App 同寿命。 */
const queue = reactive<CelebrationBurst[]>([]);
let nextId = 1;

export function celebrate(tier: AchievementTier) {
  queue.push({ id: nextId++, tier });
}

export function consumeCelebration(id: number) {
  const idx = queue.findIndex((b) => b.id === id);
  if (idx > -1) queue.splice(idx, 1);
}

export function useCelebration() {
  return { queue, celebrate, consumeCelebration };
}
