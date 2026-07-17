<script setup lang="ts">
import { computed } from 'vue';
import { Card, Title } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';

const { inspirations } = useMyDayStorage();

const inspirationLogs = computed(() =>
  [...inspirations].sort(
    (a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
  )
);

const deleteInspiration = (id: number) => {
  const idx = inspirations.findIndex((item) => item.id === id);
  if (idx !== -1) inspirations.splice(idx, 1);
};
</script>

<template>
  <div class="section">
    <div class="section-head">
      <Title color="app-red" size="middle">灵感收集</Title>
    </div>
    <Card>
      <div v-if="inspirationLogs.length" class="timeline">
        <div v-for="item in inspirationLogs" :key="item.id" class="timeline-item">
          <span class="timeline-dot inspiration"></span>
          <div class="timeline-time">{{ item.date }} {{ item.time }}</div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="timeline-content" style="flex:1;">{{ item.content }}</div>
            <span class="inspiration-delete" @click="deleteInspiration(item.id)">×</span>
          </div>
        </div>
      </div>
      <div v-else class="animal-table-empty" style="padding:40px 0;text-align:center;">
        还没有记录灵感，点击右下角 💡 按钮添加吧~
      </div>
    </Card>
  </div>
</template>

<style scoped>
.inspiration-delete {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}
.inspiration-delete:hover {
  color: var(--error);
  background: rgba(220, 80, 80, 0.12);
}
</style>
