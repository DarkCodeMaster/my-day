<script setup lang="ts">
import { computed } from 'vue';
import { Card, Title } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { todayStr } from '@/utils/date';
import { categoryName } from '@/utils/labels';

const { todayLogs } = useMyDayStorage();

const displayTodayLogs = computed(() =>
  todayLogs
    .filter((log) => log.date && log.date === todayStr())
    .sort((a, b) => a.time.localeCompare(b.time))
);

const todayReport = computed(() => {
  const logs = displayTodayLogs.value;
  if (logs.length === 0) {
    return '今天还没有记录，去健康/学习/赚钱页面添加吧 🌿';
  }
  const healthCount = logs.filter((l) => l.category === 'health').length;
  const studyAdd = logs.filter((l) => l.category === 'study' && l.content.startsWith('添加')).length;
  const studyUpdate = logs.filter((l) => l.category === 'study' && l.content.startsWith('更新')).length;
  const studyDelete = logs.filter((l) => l.category === 'study' && l.content.startsWith('删除')).length;
  const moneyAdd = logs.filter((l) => l.category === 'money' && l.content.startsWith('添加')).length;
  const moneyUpdate = logs.filter((l) => l.category === 'money' && l.content.startsWith('更新')).length;
  const moneyDelete = logs.filter((l) => l.category === 'money' && l.content.startsWith('删除')).length;

  const parts: string[] = [];
  if (healthCount) parts.push(`记录体重 ${healthCount} 次`);
  if (studyAdd || studyUpdate || studyDelete) {
    const sub: string[] = [];
    if (studyAdd) sub.push(`新增 ${studyAdd} 项`);
    if (studyUpdate) sub.push(`更新 ${studyUpdate} 项`);
    if (studyDelete) sub.push(`删除 ${studyDelete} 项`);
    parts.push(`学习${sub.join('、')}`);
  }
  if (moneyAdd || moneyUpdate || moneyDelete) {
    const sub: string[] = [];
    if (moneyAdd) sub.push(`新增 ${moneyAdd} 个`);
    if (moneyUpdate) sub.push(`更新 ${moneyUpdate} 个`);
    if (moneyDelete) sub.push(`删除 ${moneyDelete} 个`);
    parts.push(`赚钱任务${sub.join('、')}`);
  }
  return `今天${parts.join('，')}。继续加油 🌿`;
});
</script>

<template>
  <div class="two-col">
    <div>
      <div class="panel-title">
        <span class="dot"></span>
        <Title color="app-pink" size="middle">今日时间线</Title>
      </div>
      <Card>
        <div class="timeline" style="height: 600px; overflow-y: auto;">
          <div v-for="(log, i) in displayTodayLogs" :key="i" class="timeline-item">
            <span class="timeline-dot" :class="log.category"></span>
            <div class="timeline-time">{{ log.time }} · {{ categoryName(log.category) }}</div>
            <div class="timeline-content">{{ log.content }}</div>
          </div>
        </div>
      </Card>
    </div>

    <div>
      <div class="panel-title">
        <span class="dot"></span>
        <Title color="app-yellow" size="middle">今日报告</Title>
      </div>
      <Card color="app-yellow">
        <p style="margin:0;line-height:1.7;">{{ todayReport }}</p>
      </Card>
    </div>
  </div>
</template>
