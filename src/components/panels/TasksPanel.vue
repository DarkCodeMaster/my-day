<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { Button, Input, Title, Modal } from 'animal-island-vue';
import { QuillEditor } from '@vueup/vue-quill';
import { init } from '@/lib/echarts';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useDetailDrawers } from '@/composables/useDetailDrawers';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  taskTimeSlotOptions,
  getCurrentTimeSlot,
  getTaskTimeSlot,
  getTaskTimeSlotLabel,
  isDeadlineWithinDays,
  parseTaskLink,
  formatTaskLink,
} from '@/utils/task';
import type { StudyItem, MoneyItem, TaskItem } from '@/types';
import CustomSelect from '@/components/CustomSelect.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';

const { tasks, studyItems, moneyItems } = useMyDayStorage();
const { openDetail, openMoneyDetail } = useDetailDrawers();

const taskColumns = [
  { key: 'today', label: '今日任务', color: 'app-red' },
  { key: 'todo', label: '待开始', color: 'app-yellow' },
  { key: 'doing', label: '进行中', color: 'app-blue' },
  { key: 'done', label: '已完成', color: 'app-green' },
] as const;

/* ---------- 新建/编辑任务 ---------- */
const taskForm = reactive({
  title: '',
  description: '',
  deadline: '',
  timeSlot: 'morning',
  linkKey: 'none',
});
const resetTaskForm = () => {
  taskForm.title = '';
  taskForm.description = '';
  taskForm.deadline = '';
  taskForm.timeSlot = getCurrentTimeSlot();
  taskForm.linkKey = 'none';
};

const taskLinkOptions = computed(() => {
  const options: { key: string; label: string }[] = [{ key: 'none', label: '无关联' }];
  studyItems.forEach((s: StudyItem) => options.push({ key: `study-${s.id}`, label: `学习：${s.name}` }));
  moneyItems.forEach((m: MoneyItem) => options.push({ key: `money-${m.id}`, label: `赚钱：${m.desc}` }));
  return options;
});

const findTaskLinkLabel = (linkType?: 'study' | 'money' | null, linkId?: number) => {
  if (!linkType || linkId == null) return '';
  if (linkType === 'study') {
    const item = studyItems.find((s: StudyItem) => s.id === linkId);
    return item ? `学习：${item.name}` : '';
  }
  const item = moneyItems.find((m: MoneyItem) => m.id === linkId);
  return item ? `赚钱：${item.desc}` : '';
};

const taskModalOpen = ref(false);
const taskModalMode = ref<'add' | 'edit'>('add');
const taskEditTarget = ref<TaskItem | null>(null);
const datePickerOpen = ref(false);

const openTaskModal = () => {
  resetTaskForm();
  taskModalMode.value = 'add';
  taskEditTarget.value = null;
  taskModalOpen.value = true;
};

const openEditTask = (task: TaskItem) => {
  taskEditTarget.value = task;
  taskForm.title = task.title;
  taskForm.description = task.description || '';
  taskForm.deadline = task.deadline || '';
  taskForm.timeSlot = task.timeSlot || getCurrentTimeSlot() || 'morning';
  taskForm.linkKey = formatTaskLink(task.linkType, task.linkId);
  taskModalMode.value = 'edit';
  taskModalOpen.value = true;
};

const submitTask = () => {
  const title = taskForm.title.trim();
  if (!title) return;
  const { linkType, linkId } = parseTaskLink(taskForm.linkKey);
  const deadline = taskForm.deadline || undefined;
  const timeSlot = taskForm.timeSlot as TaskItem['timeSlot'];
  if (taskModalMode.value === 'edit' && taskEditTarget.value) {
    const task = taskEditTarget.value;
    task.title = title;
    task.description = taskForm.description;
    task.deadline = deadline;
    task.timeSlot = timeSlot;
    task.linkType = linkType;
    task.linkId = linkId;
  } else {
    const status: TaskItem['status'] = deadline && isDeadlineWithinDays(deadline, 3) ? 'today' : 'todo';
    tasks.push({
      id: Date.now(),
      title,
      description: taskForm.description,
      deadline,
      timeSlot,
      status,
      linkType,
      linkId,
    });
  }
  resetTaskForm();
  taskModalOpen.value = false;
};

const deleteTask = (task: TaskItem) => {
  const idx = tasks.findIndex((t: TaskItem) => t.id === task.id);
  if (idx > -1) tasks.splice(idx, 1);
};

const openTaskLink = (task: TaskItem) => {
  if (task.linkType === 'study') {
    const item = studyItems.find((s: StudyItem) => s.id === task.linkId);
    if (item) openDetail(item);
  } else if (task.linkType === 'money') {
    const item = moneyItems.find((m: MoneyItem) => m.id === task.linkId);
    if (item) openMoneyDetail(item);
  }
};

/* ---------- 看板拖拽 ---------- */
const draggingTaskId = ref<number | null>(null);
const dragOverTaskId = ref<number | null>(null);
const dragOverPosition = ref<'top' | 'bottom'>('top');

const clearDragState = () => {
  draggingTaskId.value = null;
  dragOverTaskId.value = null;
};

const handleDragStart = (task: TaskItem) => {
  draggingTaskId.value = task.id;
};
const handleDragEnd = () => {
  clearDragState();
};
const handleDrop = (status: 'today' | 'todo' | 'doing' | 'done') => {
  if (draggingTaskId.value == null) return;
  const task = tasks.find((t: TaskItem) => t.id === draggingTaskId.value);
  if (task) {
    task.status = status;
    if (status === 'done') {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = undefined;
    }
  }
  clearDragState();
};

/** 卡片上拖动：按鼠标在卡片上下半区判定插入位置 */
const handleCardDragOver = (task: TaskItem, e: DragEvent) => {
  e.preventDefault();
  if (draggingTaskId.value == null || draggingTaskId.value === task.id) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  dragOverTaskId.value = task.id;
  dragOverPosition.value = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
};

/** 落到某张卡片上：插入到其上方或下方（跨列时同步状态） */
const handleCardDrop = (target: TaskItem, e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (draggingTaskId.value == null || draggingTaskId.value === target.id) return;
  const fromIdx = tasks.findIndex((t: TaskItem) => t.id === draggingTaskId.value);
  if (fromIdx === -1) return;

  const [moved] = tasks.splice(fromIdx, 1);
  // 跨列时同步状态与完成时间；同列排序不动 completedAt
  if (moved.status !== target.status) {
    moved.status = target.status;
    moved.completedAt = target.status === 'done' ? new Date().toISOString() : undefined;
  }
  // 移除后目标索引可能前移，重新定位插入点
  const baseIdx = tasks.findIndex((t: TaskItem) => t.id === target.id);
  const insertIdx = dragOverPosition.value === 'bottom' ? baseIdx + 1 : baseIdx;
  tasks.splice(insertIdx, 0, moved);
  clearDragState();
};

/* ---------- 时段分布图 ---------- */
const taskPeriods = [
  { key: 'dawn', label: '凌晨', start: 0, end: 6, color: '#889df0' },
  { key: 'morning', label: '上午', start: 6, end: 12, color: '#f7cd67' },
  { key: 'afternoon', label: '下午', start: 12, end: 18, color: '#82d5bb' },
  { key: 'evening', label: '晚上', start: 18, end: 24, color: '#b77dee' },
];
const taskChartOpen = ref(false);
const taskChartSelectedPeriod = ref<string | null>(null);
const taskChartRef = ref<HTMLDivElement | null>(null);
let taskChartInstance: any = null;
let taskChartResizeObserver: ResizeObserver | null = null;

const todayTasks = computed(() => tasks.filter((t: TaskItem) => t.status === 'today'));
const taskChartData = computed(() =>
  taskPeriods
    .map((period) => {
      const value = todayTasks.value.filter(
        (t: TaskItem) => getTaskTimeSlot(t) === period.key
      ).length;
      return {
        value,
        name: period.label,
        key: period.key,
        itemStyle: { color: period.color },
      };
    })
    .filter((d) => d.value > 0)
);
const taskChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: '0%', left: 'center' },
  series: [
    {
      name: '任务时段',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}' },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: taskChartData.value,
    },
  ],
}));
const selectedPeriodTasks = computed(() => {
  if (!taskChartSelectedPeriod.value) return [];
  const period = taskPeriods.find((p) => p.key === taskChartSelectedPeriod.value);
  if (!period) return [];
  return todayTasks.value.filter((t: TaskItem) => getTaskTimeSlot(t) === period.key);
});
const handleTaskChartClick = (params: any) => {
  const period = taskPeriods.find((p) => p.label === params.name);
  if (period) taskChartSelectedPeriod.value = period.key;
};

const disposeTaskChart = () => {
  if (taskChartResizeObserver) {
    taskChartResizeObserver.disconnect();
    taskChartResizeObserver = null;
  }
  if (taskChartInstance) {
    taskChartInstance.dispose();
    taskChartInstance = null;
  }
};

watch(taskChartOpen, (open) => {
  if (open) {
    taskChartSelectedPeriod.value = null;
    nextTick(() => {
      if (!taskChartRef.value) return;
      taskChartResizeObserver = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width === 0 || height === 0) return;
        if (!taskChartInstance) {
          taskChartInstance = init(taskChartRef.value);
          taskChartInstance.setOption(taskChartOption.value);
          taskChartInstance.on('click', handleTaskChartClick);
        } else {
          taskChartInstance.resize();
        }
      });
      taskChartResizeObserver.observe(taskChartRef.value);
      // 兜底：Modal 动画 300ms 后如果还没初始化，再试一次
      setTimeout(() => {
        if (taskChartInstance || !taskChartRef.value) return;
        const rect = taskChartRef.value.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          taskChartInstance = init(taskChartRef.value);
          taskChartInstance.setOption(taskChartOption.value);
          taskChartInstance.on('click', handleTaskChartClick);
        }
      }, 350);
    });
  } else {
    disposeTaskChart();
  }
});
watch(taskChartOption, (option) => {
  if (taskChartInstance) {
    taskChartInstance.setOption(option, true);
  }
});

// 面板被 Tabs v-if 卸载时兜底清理，避免泄漏
onBeforeUnmount(disposeTaskChart);
</script>

<template>
  <div class="section">
    <div class="section-head">
      <Title color="app-yellow" size="middle">任务看板</Title>
      <Button type="primary" size="middle" @click="openTaskModal">新建任务</Button>
    </div>
    <div class="kanban-board">
      <div
        v-for="col in taskColumns"
        :key="col.key"
        class="kanban-column"
        @dragover.prevent
        @drop="handleDrop(col.key)"
      >
        <div class="kanban-column-header" :class="col.color">
          <span class="kanban-column-dot"></span>
          <span>{{ col.label }}</span>
          <Button
            v-if="col.key === 'today'"
            type="text"
            size="small"
            @click="taskChartOpen = true"
          >📊 时段</Button>
          <span class="kanban-column-count">{{ tasks.filter((t: TaskItem) => t.status === col.key).length }}</span>
        </div>
        <div class="kanban-column-body">
          <div
            v-for="task in tasks.filter((t: TaskItem) => t.status === col.key)"
            :key="task.id"
            class="kanban-card"
            :class="{
              'is-dragging': draggingTaskId === task.id,
              'is-urgent': isDeadlineWithinDays(task.deadline, 3),
              'drop-above': dragOverTaskId === task.id && dragOverPosition === 'top',
              'drop-below': dragOverTaskId === task.id && dragOverPosition === 'bottom',
            }"
            draggable="true"
            @dragstart="handleDragStart(task)"
            @dragend="handleDragEnd"
            @dragover="handleCardDragOver(task, $event)"
            @drop="handleCardDrop(task, $event)"
            @click="openEditTask(task)"
          >
            <div class="kanban-card-title">{{ task.title }}</div>
            <div class="kanban-card-deadline">
              <span class="kanban-card-tag" :class="{ 'is-longterm': !task.deadline }">
                ⏰ {{ task.deadline || '长期' }}
              </span>
            </div>
            <div
              v-if="task.description"
              class="kanban-card-desc"
              v-html="sanitizeHtml(task.description)"
            ></div>
            <div
              v-if="task.linkType"
              class="kanban-card-link"
              @click.stop="openTaskLink(task)"
            >{{ findTaskLinkLabel(task.linkType, task.linkId) }}</div>
            <div class="kanban-card-actions">
              <Button type="text" size="small" @click.stop="deleteTask(task)">删除</Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal
      v-model:open="taskModalOpen"
      :title="taskModalMode === 'add' ? '新建任务' : '编辑任务'"
      :typewriter="false"
      :show-footer="true"
      :width="676"
      :mask-style="{ zIndex: 1100 }"
    >
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-field">
          <label class="form-field-label">任务标题</label>
          <Input v-model="taskForm.title" placeholder="任务标题" style="width:100%;" />
        </div>
        <div class="form-field">
          <label class="form-field-label">截止时间</label>
          <Input
            v-model="taskForm.deadline"
            readonly
            placeholder="未选择则为长期任务"
            style="width:100%;cursor:pointer;"
            @click="datePickerOpen = true"
          >
            <template #suffix>📅</template>
          </Input>
        </div>
        <div class="form-field">
          <label class="form-field-label">计划时段</label>
          <CustomSelect v-model="taskForm.timeSlot" :options="taskTimeSlotOptions" />
        </div>
        <div class="form-field">
          <label class="form-field-label">描述</label>
          <QuillEditor
            v-model:content="taskForm.description"
            content-type="html"
            theme="snow"
            toolbar="full"
            placeholder="补充说明..."
            style="width:100%;"
          />
        </div>
        <div class="form-field">
          <label class="form-field-label">关联</label>
          <CustomSelect v-model="taskForm.linkKey" :options="taskLinkOptions" />
        </div>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="taskModalOpen = false">取消</Button>
          <Button type="primary" size="middle" @click="submitTask">{{ taskModalMode === 'add' ? '创建' : '保存' }}</Button>
        </div>
      </template>
    </Modal>

    <DatePickerModal
      v-model:open="datePickerOpen"
      v-model="taskForm.deadline"
      title="选择截止日期"
      :mask-style="{ zIndex: 1200 }"
    />

    <Modal
      v-model:open="taskChartOpen"
      title="今日任务时段分布"
      :typewriter="false"
      :show-footer="true"
      :width="620"
      @ok="taskChartOpen = false"
    >
      <div class="task-chart-body">
        <div
          v-if="taskChartData.length"
          ref="taskChartRef"
          class="task-chart"
        ></div>
        <div v-else class="animal-table-empty" style="padding:40px 0;text-align:center;">
          今日任务列还没有任务哦~ 🌿
        </div>
        <div v-if="taskChartSelectedPeriod && selectedPeriodTasks.length" class="task-chart-detail">
          <div class="task-chart-detail-title">
            {{ taskPeriods.find((p) => p.key === taskChartSelectedPeriod)?.label }}时段完成
          </div>
          <div class="task-chart-detail-list">
            <div
              v-for="task in selectedPeriodTasks"
              :key="task.id"
              class="task-chart-detail-item"
              @click="openEditTask(task)"
            >
              <span class="task-chart-detail-time">{{ getTaskTimeSlotLabel(task.timeSlot) }}</span>
              <span class="task-chart-detail-title-text">{{ task.title }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="taskChartOpen = false">关闭</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.kanban-column {
  display: flex;
  flex-direction: column;
  min-height: 420px;
  background: rgba(247, 243, 223, 0.6);
  border: 2px dashed #e8dcc8;
  border-radius: 22px;
  padding: 14px;
  transition: background 0.2s, border-color 0.2s;
}
.kanban-column:has(.kanban-card.is-dragging) {
  background: rgba(247, 243, 223, 0.9);
}
.kanban-column-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  font-weight: 800;
  font-size: 15px;
  color: #725d42;
  margin-bottom: 14px;
}
.kanban-column-header.app-yellow { background: #fff8e0; }
.kanban-column-header.app-blue { background: #e8edff; }
.kanban-column-header.app-green { background: #e8f5e8; }
.kanban-column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.kanban-column-count {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}
.kanban-column-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
}
.kanban-card {
  background: #fffdf5;
  border: 2px solid #e8dcc8;
  border-radius: 16px;
  padding: 12px;
  cursor: grab;
  box-shadow: 0 2px 0 rgba(114, 93, 66, 0.06);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(114, 93, 66, 0.12);
  border-color: var(--primary);
}
.kanban-card.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.kanban-card.is-urgent {
  border-color: var(--error);
}
.kanban-card.is-urgent:hover {
  border-color: var(--error-active);
}
.kanban-card.drop-above {
  box-shadow: 0 -3px 0 0 var(--primary), 0 2px 0 rgba(114, 93, 66, 0.06);
}
.kanban-card.drop-below {
  box-shadow: 0 3px 0 0 var(--primary), 0 2px 0 rgba(114, 93, 66, 0.06);
}
.kanban-card-title {
  font-weight: 800;
  font-size: 15px;
  color: var(--text);
  margin-bottom: 6px;
}
.kanban-card-deadline {
  margin-bottom: 6px;
}
.kanban-card-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.7);
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.kanban-card-tag.is-longterm {
  color: var(--text-muted);
  background: var(--bg-disabled);
}
.kanban-card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.kanban-card-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-bg);
  padding: 3px 8px;
  border-radius: 10px;
  margin-bottom: 8px;
  width: fit-content;
  cursor: pointer;
  transition: background 0.2s;
}
.kanban-card-link:hover {
  background: rgba(25, 200, 185, 0.2);
}
.kanban-card-actions {
  display: flex;
  justify-content: flex-end;
}

.task-chart-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.task-chart {
  width: 500px;
  height: 360px;
  max-width: 100%;
}
.task-chart-detail-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 12px;
  text-align: center;
}
.task-chart-detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-chart-detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fffdf5;
  border: 2px solid #e8dcc8;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.task-chart-detail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(114, 93, 66, 0.12);
  border-color: var(--primary);
}
.task-chart-detail-time {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}
.task-chart-detail-title-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
</style>
