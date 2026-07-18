<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Card,
  Title,
  Tabs,
  Collapse,
  Loading,
  Time,
  Divider,
  Footer,
  Cursor,
  Typewriter,
  Icon,
  NotificationContainer,
} from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import DetailDrawers from '@/components/DetailDrawers.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';
import InspirationComposer from '@/components/InspirationComposer.vue';
import TasksPanel from '@/components/panels/TasksPanel.vue';
import HealthPanel from '@/components/panels/HealthPanel.vue';
import StudyPanel from '@/components/panels/StudyPanel.vue';
import MoneyPanel from '@/components/panels/MoneyPanel.vue';
import TodayPanel from '@/components/panels/TodayPanel.vue';
import InspirationPanel from '@/components/panels/InspirationPanel.vue';
import BackupPanel from '@/components/panels/BackupPanel.vue';

const { activeTab, isLoaded } = useMyDayStorage();

const welcomeTrigger = ref(0);
onMounted(() => {
  welcomeTrigger.value++;
});

const tabItems = [
  { key: 'tasks', label: '任务' },
  { key: 'health', label: '健康' },
  { key: 'study', label: '学习' },
  { key: 'money', label: '赚钱' },
  { key: 'today', label: '动态' },
  { key: 'inspiration', label: '灵感' },
  { key: 'import-export', label: '备份' },
];
</script>

<template>
  <Cursor>
    <div class="page-root">
      <div class="ac-background" aria-hidden="true">
        <div class="ac-bg-sky"></div>
        <div class="ac-cloud cloud-1"></div>
        <div class="ac-cloud cloud-2"></div>
        <div class="ac-cloud cloud-3"></div>
        <div class="ac-leaf leaf-1">🌿</div>
        <div class="ac-leaf leaf-2">🍃</div>
        <div class="ac-leaf leaf-3">🌿</div>
        <div class="ac-leaf leaf-4">🍃</div>
        <div class="ac-leaf leaf-5">🌿</div>
      </div>
      <Loading :active="!isLoaded" style="position: fixed; inset: 0; z-index: 9999;" />

      <img src="/sun.png" alt="" class="corner-sun" aria-hidden="true" />

      <div class="page">
        <header class="page-header">
          <div class="page-header-left">
            <Icon name="icon-miles" :size="32" />
            <Title color="app-teal" size="large">我的个人岛</Title>
          </div>
          <Time />
        </header>

        <div class="grass-banner"></div>

        <Card color="app-yellow" style="margin-bottom: 16px;">
          <Typewriter :trigger="welcomeTrigger" :speed="60">
            欢迎回到小岛，今天也要元气满满哦！🌿
          </Typewriter>
        </Card>

        <div class="tabs-wrapper">
          <Tabs v-model="activeTab" :items="tabItems" :shadow="true" :leaf-animation="true">
            <template #tasks>
              <TasksPanel />
            </template>
            <template #health>
              <HealthPanel />
            </template>
            <template #study>
              <StudyPanel />
            </template>
            <template #money>
              <MoneyPanel />
            </template>
            <template #today>
              <TodayPanel />
            </template>
            <template #inspiration>
              <InspirationPanel />
            </template>
            <template #import-export>
              <BackupPanel />
            </template>
          </Tabs>
        </div>

        <div class="help-section">
          <Collapse question="这个页面怎么用？">
            <ul style="margin:0;padding-left:18px;line-height:1.8;">
              <li><b>任务</b>：看板管理待开始/进行中/已完成的任务，可关联学习或赚钱项。</li>
              <li><b>健康</b>：记录每日体重，查看趋势曲线。</li>
              <li><b>学习</b>：添加学习项目并跟踪进度。</li>
              <li><b>赚钱</b>：管理任务和收入状态。</li>
              <li><b>动态</b>：回顾一天的时间线。</li>
              <li><b>灵感</b>：查看所有记录的灵感。</li>
              <li><b>备份</b>：备份和恢复本地数据。</li>
            </ul>
          </Collapse>
        </div>

        <Divider type="wave-yellow" />
        <Footer type="tree" />
      </div>

      <DeleteConfirmModal />
      <DetailDrawers />
    </div>
    <NotificationContainer />
    <InspirationComposer />
  </Cursor>
</template>

<style scoped>
.tabs-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.animal-tabs) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.animal-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.corner-sun {
  position: fixed;
  top: -120px;
  right: -120px;
  width: 360px;
  height: auto;
  z-index: -1;
  pointer-events: none;
  opacity: 0.92;
}

.ac-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}
.ac-bg-sky {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(255, 245, 200, 0.6) 0 120px, transparent 180px),
    radial-gradient(circle at 85% 15%, rgba(200, 245, 220, 0.5) 0 100px, transparent 160px),
    linear-gradient(180deg, #dff6f3 0%, #f8f8f0 45%, #eef6e8 100%);
}
.ac-cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 50px;
  filter: blur(1px);
  opacity: 0.85;
}
.ac-cloud::before,
.ac-cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
}
.cloud-1 { width: 140px; height: 48px; top: 10%; left: -160px; animation: cloudDrift 28s linear infinite; }
.cloud-1::before { width: 70px; height: 70px; top: -32px; left: 18px; }
.cloud-1::after { width: 55px; height: 55px; top: -22px; right: 14px; }
.cloud-2 { width: 110px; height: 38px; top: 28%; left: -140px; animation: cloudDrift 38s linear infinite 8s; }
.cloud-2::before { width: 55px; height: 55px; top: -26px; left: 14px; }
.cloud-2::after { width: 42px; height: 42px; top: -18px; right: 12px; }
.cloud-3 { width: 170px; height: 56px; top: 16%; left: -200px; animation: cloudDrift 48s linear infinite 18s; }
.cloud-3::before { width: 85px; height: 85px; top: -40px; left: 22px; }
.cloud-3::after { width: 65px; height: 65px; top: -30px; right: 18px; }

.ac-leaf {
  position: absolute;
  font-size: 18px;
  opacity: 0;
  text-shadow: 0 2px 4px rgba(61, 52, 40, 0.12);
}
.leaf-1 { left: 10%; top: -5%; animation: leafFall 14s ease-in-out infinite; }
.leaf-2 { left: 30%; top: -8%; animation: leafFall 18s ease-in-out infinite 4s; }
.leaf-3 { left: 55%; top: -3%; animation: leafFall 16s ease-in-out infinite 2s; }
.leaf-4 { left: 75%; top: -10%; animation: leafFall 20s ease-in-out infinite 7s; }
.leaf-5 { left: 90%; top: -6%; animation: leafFall 15s ease-in-out infinite 10s; }

@keyframes cloudDrift {
  from { transform: translateX(0); }
  to { transform: translateX(calc(100vw + 250px)); }
}
@keyframes leafFall {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.75; }
  90% { opacity: 0.75; }
  100% { transform: translate(30px, 110vh) rotate(360deg); opacity: 0; }
}
</style>
