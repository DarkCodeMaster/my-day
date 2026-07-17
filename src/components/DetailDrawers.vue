<script setup lang="ts">
import { Drawer } from 'animal-island-vue';
import { useDetailDrawers } from '@/composables/useDetailDrawers';
import { sanitizeHtml } from '@/utils/sanitize';
import { studyTypeText, statusText } from '@/utils/labels';

const {
  detailDrawerOpen,
  detailRecord,
  moneyDetailDrawerOpen,
  moneyDetailRecord,
} = useDetailDrawers();

const normalizeLink = (url?: string) => {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};
</script>

<template>
  <Drawer
    :open="detailDrawerOpen"
    title="学习详情"
    placement="bottom"
    height="400"
    @close="detailDrawerOpen = false"
  >
    <div v-if="detailRecord" class="drawer-detail">
      <div class="drawer-detail-head">
        <div
          class="cell-thumb"
          :style="{ background: detailRecord.image, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }"
        >
          {{ detailRecord.abbr }}
        </div>
        <div>
          <div class="drawer-detail-title">{{ detailRecord.name }}</div>
          <span class="study-type-badge" :class="detailRecord.type">{{ studyTypeText(detailRecord.type) }}</span>
        </div>
      </div>

      <div class="drawer-detail-section">
        <div class="drawer-detail-label">进度</div>
        <div style="font-weight:700;color:var(--text);">{{ detailRecord.progress }}%</div>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: detailRecord.progress + '%' }"></div>
        </div>
      </div>

      <div v-if="detailRecord.type === 'video'" class="drawer-detail-section">
        <div class="drawer-detail-label">课程链接</div>
        <a
          class="drawer-detail-link"
          :href="normalizeLink(detailRecord.link)"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ detailRecord.link || '未填写' }}
        </a>
        <div class="drawer-detail-label" style="margin-top:12px;">课时进度</div>
        <div>第 {{ detailRecord.lesson }} / {{ detailRecord.totalLesson }} 课</div>
      </div>

      <div v-else-if="detailRecord.type === 'book'" class="drawer-detail-section">
        <div class="drawer-detail-label">第几章</div>
        <div style="font-weight:700;color:var(--text);">{{ detailRecord.chapter }}</div>
        <div class="drawer-detail-label" style="margin-top:12px;">总章节数</div>
        <div style="font-weight:700;color:var(--text);">{{ detailRecord.totalChapter }}</div>
        <div class="drawer-detail-label" style="margin-top:12px;">当前页</div>
        <div style="font-weight:700;color:var(--text);">{{ detailRecord.page }}</div>
        <div class="drawer-detail-label" style="margin-top:12px;">总页数</div>
        <div style="font-weight:700;color:var(--text);">{{ detailRecord.totalPage }}</div>
      </div>

      <div v-else class="drawer-detail-section">
        <div class="drawer-detail-label">备注</div>
        <div>{{ detailRecord.notes }}</div>
      </div>
    </div>
  </Drawer>

  <Drawer
    :open="moneyDetailDrawerOpen"
    title="赚钱任务详情"
    placement="bottom"
    height="400"
    @close="moneyDetailDrawerOpen = false"
  >
    <div v-if="moneyDetailRecord" class="drawer-detail">
      <div class="drawer-detail-head">
        <div style="font-weight:800;font-size:20px;color:var(--text);">{{ moneyDetailRecord.desc }}</div>
        <span class="status-badge" :class="moneyDetailRecord.status">{{ statusText(moneyDetailRecord.status) }}</span>
      </div>

      <div class="drawer-detail-section">
        <div class="drawer-detail-label">金额</div>
        <div style="font-weight:700;color:var(--text);">¥{{ moneyDetailRecord.amount }}</div>
      </div>

      <div class="drawer-detail-section">
        <div class="drawer-detail-label">截止日期</div>
        <div>{{ moneyDetailRecord.deadline }}</div>
      </div>

      <div class="drawer-detail-section">
        <div class="drawer-detail-label">进度</div>
        <div style="font-weight:700;color:var(--text);">{{ moneyDetailRecord.progress }}%</div>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: moneyDetailRecord.progress + '%' }"></div>
        </div>
      </div>

      <div v-if="moneyDetailRecord.description" class="drawer-detail-section">
        <div class="drawer-detail-label">描述</div>
        <div v-html="sanitizeHtml(moneyDetailRecord.description)"></div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.drawer-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.drawer-detail-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.drawer-detail-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 4px;
}
.drawer-detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.drawer-detail-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 700;
}
.drawer-detail-link {
  color: var(--primary);
  text-decoration: none;
  word-break: break-all;
}
.drawer-detail-link:hover {
  text-decoration: underline;
}
</style>
