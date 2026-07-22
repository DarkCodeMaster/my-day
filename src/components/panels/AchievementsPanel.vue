<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Card, Drawer, Modal, Progress, Tag, Title } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useAchievements, ACHIEVEMENT_MODULE_LABELS, TIER_LABELS } from '@/composables/useAchievements';
import type { AchievementModule, AchievementTier } from '@/composables/useAchievements';
import { sanitizeHtml } from '@/utils/sanitize';
import { formatDateStr, pad } from '@/utils/date';
import type { ArchivedTask } from '@/types';

const { archivedTasks } = useMyDayStorage();
const { list, stats, unlockedCount, totalCount } = useAchievements();

const MODULE_ORDER: AchievementModule[] = ['task', 'study', 'money', 'health', 'inspiration', 'meta'];

/** 奖杯墙按模块分组 */
const grouped = computed(() =>
  MODULE_ORDER.map((m) => ({
    module: m,
    label: ACHIEVEMENT_MODULE_LABELS[m],
    items: list.value.filter((a) => a.module === m),
  })),
);

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_EMOJI: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '👑',
};
const TIER_TAG_COLORS: Record<AchievementTier, 'brown' | 'app-blue' | 'app-yellow' | 'app-teal'> = {
  bronze: 'brown',
  silver: 'app-blue',
  gold: 'app-yellow',
  platinum: 'app-teal',
};

const tierCounts = computed(() =>
  TIER_ORDER.map((t) => ({
    tier: t,
    emoji: TIER_EMOJI[t],
    unlocked: list.value.filter((a) => a.tier === t && a.unlocked).length,
    total: list.value.filter((a) => a.tier === t).length,
  })),
);

const completionPercent = computed(() =>
  totalCount ? Math.round((unlockedCount.value / totalCount) * 100) : 0,
);

const progressPercent = (p?: { current: number; target: number }) =>
  p && p.target > 0 ? Math.round((p.current / p.target) * 100) : 0;

const formatUnlockDate = (iso?: string) => (iso ? formatDateStr(new Date(iso)) : '');

/** 归档历史：按归档时间倒序 */
const sortedArchives = computed(() =>
  [...archivedTasks].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
);

/* ---------- 归档抽屉与详情 ---------- */
const archiveDrawerOpen = ref(false);
const archiveDetailTarget = ref<ArchivedTask | null>(null);

const openArchiveDetail = (task: ArchivedTask) => {
  archiveDetailTarget.value = task;
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${formatDateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 任务创建时间：id 即创建时间戳 */
const formatCreatedAt = (id: number) => formatDateTime(new Date(id).toISOString());

const LINK_TYPE_LABELS: Record<string, string> = {
  study: '📚 学习',
  money: '💰 赚钱',
};
</script>

<template>
  <div class="section">
    <div class="section-head">
      <Title color="app-orange" size="middle">成就殿堂</Title>
      <Button type="text" size="small" @click="archiveDrawerOpen = true">📦 历史归档 ({{ archivedTasks.length }})</Button>
    </div>

    <div class="summary-grid">
      <Card color="app-yellow">
        <div class="summary-label">已解锁成就</div>
        <div class="summary-value">{{ unlockedCount }} / {{ totalCount }}</div>
      </Card>
      <Card color="app-teal">
        <div class="summary-label">完成度</div>
        <div class="summary-value">{{ completionPercent }}%</div>
        <Progress :percent="completionPercent" :show-info="false" size="small" />
      </Card>
      <Card color="app-pink">
        <div class="summary-label">奖杯收集</div>
        <div class="tier-counts">
          <span v-for="t in tierCounts" :key="t.tier" class="tier-count">
            <span class="tier-count-emoji">{{ t.emoji }}</span>
            <span class="tier-count-num">{{ t.unlocked }}/{{ t.total }}</span>
          </span>
        </div>
      </Card>
      <Card color="app-green">
        <div class="summary-label">累计完成任务</div>
        <div class="summary-value">{{ stats.totalCompleted }}</div>
      </Card>
    </div>

    <div v-for="g in grouped" :key="g.module" class="ach-group">
      <div class="panel-title"><span class="dot"></span>{{ g.label }}</div>
      <div class="ach-grid">
        <div
          v-for="ach in g.items"
          :key="ach.id"
          class="ach-card"
          :class="ach.unlocked ? `unlocked tier-${ach.tier}` : 'locked'"
        >
          <div class="ach-emoji">{{ ach.unlocked ? ach.emoji : '❓' }}</div>
          <div class="ach-name">{{ ach.name }}</div>
          <Tag
            size="small"
            :variant="ach.unlocked ? 'solid' : 'dashed'"
            :color="TIER_TAG_COLORS[ach.tier]"
          >{{ TIER_LABELS[ach.tier] }}</Tag>
          <div class="ach-desc">{{ ach.description }}</div>
          <div v-if="ach.unlocked" class="ach-date">🎉 {{ formatUnlockDate(ach.unlockedAt) }} 解锁</div>
          <div v-else-if="ach.progress" class="ach-progress">
            <Progress :percent="progressPercent(ach.progress)" :show-info="false" size="small" />
            <span class="ach-progress-text">{{ ach.progress.current }} / {{ ach.progress.target }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史归档抽屉 -->
    <Drawer
      :open="archiveDrawerOpen"
      title="📦 历史归档"
      placement="right"
      :width="420"
      @close="archiveDrawerOpen = false"
    >
      <div v-if="!sortedArchives.length" class="archive-empty">还没有归档的任务哦~ 🌿</div>
      <div
        v-for="a in sortedArchives"
        :key="a.id"
        class="archive-row"
        @click="openArchiveDetail(a)"
      >
        <span class="archive-date">{{ formatUnlockDate(a.completedAt ?? a.archivedAt) }}</span>
        <span class="archive-title">
          <span v-if="a.linkType === 'study'">📚</span>
          <span v-else-if="a.linkType === 'money'">💰</span>
          {{ a.title }}
        </span>
        <Tag size="small" variant="outlined" color="app-teal">{{ a.boardName }}</Tag>
      </div>
    </Drawer>

    <!-- 归档任务详情（高于抽屉层级） -->
    <Modal
      :open="!!archiveDetailTarget"
      title="任务详情"
      :typewriter="false"
      :mask-style="{ zIndex: 1200 }"
      @close="archiveDetailTarget = null"
    >
      <template v-if="archiveDetailTarget">
        <div class="archive-detail">
          <div class="archive-detail-title">
            <span v-if="archiveDetailTarget.linkType">{{ LINK_TYPE_LABELS[archiveDetailTarget.linkType] }}</span>
            {{ archiveDetailTarget.title }}
          </div>
          <Tag size="small" variant="outlined" color="app-teal">{{ archiveDetailTarget.boardName }}</Tag>
          <div
            v-if="archiveDetailTarget.description"
            class="archive-detail-desc"
            v-html="sanitizeHtml(archiveDetailTarget.description)"
          ></div>
          <div class="archive-detail-grid">
            <span class="archive-detail-label">创建时间</span>
            <span>{{ formatCreatedAt(archiveDetailTarget.id) }}</span>
            <span class="archive-detail-label">截止时间</span>
            <span>{{ archiveDetailTarget.deadline || '长期' }}</span>
            <span class="archive-detail-label">完成时间</span>
            <span>{{ formatDateTime(archiveDetailTarget.completedAt) }}</span>
            <span class="archive-detail-label">归档时间</span>
            <span>{{ formatDateTime(archiveDetailTarget.archivedAt) }}</span>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.ach-group {
  margin-bottom: 26px;
}

.ach-grid {
  display: grid;
  /* auto-fill 保留空轨道：项目少的分组卡片宽度与任务组一致，不会拉伸占满整行 */
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.ach-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 196px;
  padding: 18px 14px 14px;
  background: #fffdf6;
  border-top: 5px solid transparent;
  border-radius: var(--r-base);
  box-shadow: 0 2px 8px rgba(121, 79, 39, 0.08);
  text-align: center;
  transition: transform 0.2s var(--ease);
}

.ach-card.unlocked:hover {
  transform: translateY(-3px);
}

.tier-bronze { border-top-color: #c98a5a; }
.tier-silver { border-top-color: #a8b2c1; }
.tier-gold { border-top-color: #e6b93d; }
.tier-platinum { border-top-color: #19c8b9; }

.ach-card.locked {
  filter: grayscale(1);
  opacity: 0.65;
  border-top-color: #d8d2c4;
}

.ach-emoji {
  font-size: 38px;
  line-height: 1;
}

.ach-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.ach-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.ach-date {
  font-size: 12px;
  font-weight: 700;
  color: var(--success);
}

.ach-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ach-progress-text {
  font-size: 12px;
  color: var(--text-muted);
}

.tier-counts {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 10px;
}

.tier-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tier-count-emoji {
  font-size: 30px;
  line-height: 1;
}

.tier-count-num {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
}

.archive-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px;
  border-bottom: 1px dashed var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.15s var(--ease);
}

.archive-row:hover {
  background: var(--primary-bg);
}

.archive-row:last-of-type {
  border-bottom: none;
}

.archive-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.archive-title {
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-empty {
  padding: 24px 0;
  color: var(--text-secondary);
  text-align: center;
}

.archive-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.archive-detail-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}

.archive-detail-desc {
  width: 100%;
  padding: 10px 12px;
  background: var(--primary-bg);
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--text-body);
}

.archive-detail-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  font-size: 13px;
  color: var(--text);
}

.archive-detail-label {
  color: var(--text-muted);
  font-weight: 700;
}
</style>
