<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { Button, Input, Title, Modal, Notification } from 'animal-island-vue';
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
  KANBAN_COLOR_OPTIONS,
  createDefaultColumns,
} from '@/utils/task';
import type { StudyItem, MoneyItem, TaskItem, KanbanColumn } from '@/types';
import CustomSelect from '@/components/CustomSelect.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';

const { tasks, studyItems, moneyItems, boards, activeBoardId, cardDisplay, archivedTasks } = useMyDayStorage();
const { openDetail, openMoneyDetail } = useDetailDrawers();

/* ---------- 当前看板与列 ---------- */
const activeBoard = computed(() => boards.find((b) => b.id === activeBoardId.value) ?? boards[0]);
const activeColumns = computed(() => activeBoard.value?.columns ?? []);
const todayColumnId = computed(() =>
  activeColumns.value.find((c) => c.isToday)?.id ?? activeColumns.value[0]?.id ?? ''
);
const firstNonTodayColumnId = computed(() =>
  activeColumns.value.find((c) => !c.isToday)?.id ?? todayColumnId.value
);
const isDoneColumn = (colId: string) =>
  !!activeColumns.value.find((c) => c.id === colId)?.isDone;

/* ---------- 看板管理 ---------- */
const boardOptions = computed(() => boards.map((b) => ({ key: b.id, label: b.name })));
const boardManagerOpen = ref(false);
const boardDeleteTarget = ref<{ id: string; name: string; taskCount: number } | null>(null);

const createBoard = () => {
  const ts = Date.now();
  const board = {
    id: `board-${ts}`,
    name: '新看板',
    columns: createDefaultColumns(`-${ts}`),
  };
  boards.push(board);
  activeBoardId.value = board.id;
};

const requestDeleteBoard = (id: string) => {
  if (boards.length <= 1) return;
  const board = boards.find((b) => b.id === id);
  if (!board) return;
  const taskCount = tasks.filter((t) => t.boardId === id).length;
  boardDeleteTarget.value = { id, name: board.name, taskCount };
};

const confirmDeleteBoard = () => {
  const target = boardDeleteTarget.value;
  if (!target) return;
  // 级联删除看板内任务
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].boardId === target.id) tasks.splice(i, 1);
  }
  const idx = boards.findIndex((b) => b.id === target.id);
  if (idx > -1) boards.splice(idx, 1);
  if (activeBoardId.value === target.id) {
    activeBoardId.value = boards[0]?.id ?? 'default';
  }
  boardDeleteTarget.value = null;
};

/* ---------- 列设置 ---------- */
const columnSettingsOpen = ref(false);
const columnDeleteTarget = ref<{ colId: string; label: string; taskCount: number } | null>(null);

const columnSemantic = (col: KanbanColumn) => (col.isToday ? 'today' : col.isDone ? 'done' : 'none');
const setColumnSemantic = (col: KanbanColumn, value: string) => {
  const board = activeBoard.value;
  if (!board) return;
  // 语义标记互斥且每板至多各一个：先清掉其他列的同名标记
  board.columns.forEach((c) => {
    if (value === 'today') c.isToday = false;
    if (value === 'done') c.isDone = false;
  });
  col.isToday = value === 'today';
  col.isDone = value === 'done';
};

const moveColumn = (index: number, direction: -1 | 1) => {
  const cols = activeBoard.value?.columns;
  if (!cols) return;
  const target = index + direction;
  if (target < 0 || target >= cols.length) return;
  const [moved] = cols.splice(index, 1);
  cols.splice(target, 0, moved);
};

const addColumn = () => {
  const board = activeBoard.value;
  if (!board) return;
  const color = KANBAN_COLOR_OPTIONS[board.columns.length % KANBAN_COLOR_OPTIONS.length].key;
  board.columns.push({ id: `col-${Date.now()}`, label: '新列', color });
};

const requestDeleteColumn = (col: KanbanColumn) => {
  if (!activeBoard.value || activeBoard.value.columns.length <= 1) return;
  const taskCount = tasks.filter((t) => t.boardId === activeBoardId.value && t.status === col.id).length;
  columnDeleteTarget.value = { colId: col.id, label: col.label, taskCount };
};

const confirmDeleteColumn = () => {
  const target = columnDeleteTarget.value;
  const board = activeBoard.value;
  if (!target || !board) return;
  const remaining = board.columns.filter((c) => c.id !== target.colId);
  const fallbackId = remaining[0].id;
  // 该列任务迁移到剩余第一列
  tasks.forEach((t) => {
    if (t.boardId === board.id && t.status === target.colId) t.status = fallbackId;
  });
  const idx = board.columns.findIndex((c) => c.id === target.colId);
  const wasToday = board.columns[idx]?.isToday;
  if (idx > -1) board.columns.splice(idx, 1);
  // 删了今日列则把标记转移给剩余第一列
  if (wasToday && !board.columns.some((c) => c.isToday)) {
    board.columns[0].isToday = true;
  }
  columnDeleteTarget.value = null;
};

/* ---------- 卡片显示设置 ---------- */
const cardDisplayOpen = ref(false);

/* ---------- 新建/编辑任务 ---------- */
const taskForm = reactive({
  title: '',
  description: '',
  deadline: '',
  timeSlot: 'morning',
  linkKey: 'none',
  boardId: 'default',
});
const resetTaskForm = () => {
  taskForm.title = '';
  taskForm.description = '';
  taskForm.deadline = '';
  taskForm.timeSlot = getCurrentTimeSlot();
  taskForm.linkKey = 'none';
  taskForm.boardId = activeBoardId.value;
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
  taskForm.boardId = task.boardId;
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
    // 跨看板移动：status 落到目标看板的第一列
    if (task.boardId !== taskForm.boardId) {
      const targetBoard = boards.find((b) => b.id === taskForm.boardId);
      if (targetBoard) {
        task.boardId = targetBoard.id;
        task.status = targetBoard.columns[0].id;
      }
    }
  } else {
    const status = deadline && isDeadlineWithinDays(deadline, 3)
      ? todayColumnId.value
      : firstNonTodayColumnId.value;
    // 数组顺序即看板列内显示顺序，新任务插入到数组头部，显示在列顶部
    tasks.unshift({
      id: Date.now(),
      title,
      description: taskForm.description,
      deadline,
      timeSlot,
      status,
      boardId: activeBoardId.value,
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
const handleDrop = (status: string) => {
  if (draggingTaskId.value == null) return;
  const task = tasks.find((t: TaskItem) => t.id === draggingTaskId.value);
  if (task) {
    task.status = status;
    if (isDoneColumn(status)) {
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
    moved.completedAt = isDoneColumn(target.status) ? new Date().toISOString() : undefined;
  }
  // 移除后目标索引可能前移，重新定位插入点
  const baseIdx = tasks.findIndex((t: TaskItem) => t.id === target.id);
  const insertIdx = dragOverPosition.value === 'bottom' ? baseIdx + 1 : baseIdx;
  tasks.splice(insertIdx, 0, moved);
  clearDragState();
};

/* ---------- 归档已完成任务 ---------- */
const archiveConfirmOpen = ref(false);
/** 当前看板完成列里的任务（isDoneColumn 基于当前看板列，安全） */
const archivableTasks = computed(() =>
  tasks.filter((t: TaskItem) => t.boardId === activeBoardId.value && isDoneColumn(t.status))
);

/** 归档：快照移入成就页历史（含看板名），再从看板移除；完成记录仍计入成就统计 */
const confirmArchive = () => {
  const targets = archivableTasks.value;
  if (targets.length) {
    const boardName = activeBoard.value?.name ?? '';
    const now = new Date().toISOString();
    targets.forEach((t) => {
      archivedTasks.push({
        id: t.id,
        title: t.title,
        description: t.description,
        deadline: t.deadline,
        boardId: t.boardId,
        boardName,
        completedAt: t.completedAt, // 遗留任务可能缺失，展示/统计回退 archivedAt
        archivedAt: now,
        linkType: t.linkType,
        linkId: t.linkId,
      });
    });
    const ids = new Set(targets.map((t) => t.id));
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (ids.has(tasks[i].id)) tasks.splice(i, 1);
    }
    Notification.success(`已归档 ${targets.length} 个任务`);
  }
  archiveConfirmOpen.value = false;
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

const todayTasks = computed(() =>
  tasks.filter((t: TaskItem) => t.boardId === activeBoardId.value && t.status === todayColumnId.value)
);
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
    <div class="section-head" style="flex-direction:column;align-items:stretch;">
      <Title color="app-yellow" size="middle">任务看板</Title>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:200px;">
            <CustomSelect v-model="activeBoardId" :options="boardOptions" />
          </div>
          <Button type="text" size="small" @click="boardManagerOpen = true">📋 管理</Button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <Button type="text" size="small" @click="cardDisplayOpen = true">🎛 卡片</Button>
          <Button type="text" size="small" @click="columnSettingsOpen = true">⚙️ 列设置</Button>
          <Button type="primary" size="middle" @click="openTaskModal">新建任务</Button>
        </div>
      </div>
    </div>
    <div class="kanban-board">
      <div
        v-for="col in activeColumns"
        :key="col.id"
        class="kanban-column"
        @dragover.prevent
        @drop="handleDrop(col.id)"
      >
        <div class="kanban-column-header" :class="`col-${col.color}`">
          <span class="kanban-column-dot"></span>
          <span>{{ col.label }}</span>
          <Button
            v-if="col.isToday"
            type="text"
            size="small"
            @click="taskChartOpen = true"
          >📊 时段</Button>
          <Button
            v-if="col.isDone"
            type="text"
            size="small"
            :disabled="archivableTasks.length === 0"
            @click="archiveConfirmOpen = true"
          >📦 归档</Button>
          <span class="kanban-column-count">{{ tasks.filter((t: TaskItem) => t.boardId === activeBoardId && t.status === col.id).length }}</span>
        </div>
        <div class="kanban-column-body">
          <div
            v-for="task in tasks.filter((t: TaskItem) => t.boardId === activeBoardId && t.status === col.id)"
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
            <div v-if="cardDisplay.deadline" class="kanban-card-deadline">
              <span class="kanban-card-tag" :class="{ 'is-longterm': !task.deadline }">
                ⏰ {{ task.deadline || '长期' }}
              </span>
            </div>
            <div
              v-if="cardDisplay.description && task.description"
              class="kanban-card-desc"
              v-html="sanitizeHtml(task.description)"
            ></div>
            <div
              v-if="cardDisplay.link && task.linkType"
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
        <div v-if="taskModalMode === 'edit'" class="form-field">
          <label class="form-field-label">所属看板</label>
          <CustomSelect v-model="taskForm.boardId" :options="boardOptions" />
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

    <!-- 列设置 -->
    <Modal
      v-model:open="columnSettingsOpen"
      title="列设置"
      :typewriter="false"
      :show-footer="true"
      :width="640"
    >
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div
          v-for="(col, i) in activeColumns"
          :key="col.id"
          style="display:flex;align-items:center;gap:8px;"
        >
          <div style="width:130px;flex-shrink:0;">
            <CustomSelect v-model="col.color" :options="KANBAN_COLOR_OPTIONS" />
          </div>
          <Input v-model="col.label" placeholder="列名称" style="flex:1;min-width:0;" />
          <div style="width:120px;flex-shrink:0;">
            <CustomSelect
              :model-value="columnSemantic(col)"
              :options="[
                { key: 'none', label: '普通列' },
                { key: 'today', label: '今日列' },
                { key: 'done', label: '完成列' },
              ]"
              @update:model-value="setColumnSemantic(col, $event)"
            />
          </div>
          <Button type="text" size="small" :disabled="i === 0" @click="moveColumn(i, -1)">↑</Button>
          <Button type="text" size="small" :disabled="i === activeColumns.length - 1" @click="moveColumn(i, 1)">↓</Button>
          <Button type="text" size="small" :disabled="activeColumns.length <= 1" @click="requestDeleteColumn(col)">删</Button>
        </div>
        <Button type="primary" size="middle" @click="addColumn">+ 添加列</Button>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="columnSettingsOpen = false">完成</Button>
        </div>
      </template>
    </Modal>

    <!-- 删除列确认（非空列提示迁移） -->
    <Modal
      :open="!!columnDeleteTarget"
      title="删除列"
      :typewriter="false"
      @ok="confirmDeleteColumn"
      @close="columnDeleteTarget = null"
    >
      <template v-if="columnDeleteTarget">
        <template v-if="columnDeleteTarget.taskCount > 0">
          「{{ columnDeleteTarget.label }}」里还有 {{ columnDeleteTarget.taskCount }} 个任务，删除后它们会自动移动到剩余的第一列。确定删除吗？
        </template>
        <template v-else>
          确定要删除列「{{ columnDeleteTarget.label }}」吗？
        </template>
      </template>
    </Modal>

    <!-- 看板管理 -->
    <Modal
      v-model:open="boardManagerOpen"
      title="看板管理"
      :typewriter="false"
      :show-footer="true"
      :width="560"
    >
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div
          v-for="board in boards"
          :key="board.id"
          style="display:flex;align-items:center;gap:8px;"
        >
          <Input v-model="board.name" placeholder="看板名称" style="flex:1;min-width:0;" />
          <span v-if="board.id === activeBoardId" style="font-size:12px;color:var(--primary);font-weight:700;flex-shrink:0;">当前</span>
          <Button
            type="text"
            size="small"
            :disabled="boards.length <= 1"
            @click="requestDeleteBoard(board.id)"
          >删除</Button>
        </div>
        <Button type="primary" size="middle" @click="createBoard">+ 新建看板</Button>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="boardManagerOpen = false">完成</Button>
        </div>
      </template>
    </Modal>

    <!-- 删除看板确认（级联删除任务） -->
    <Modal
      :open="!!boardDeleteTarget"
      title="删除看板"
      :typewriter="false"
      @ok="confirmDeleteBoard"
      @close="boardDeleteTarget = null"
    >
      <template v-if="boardDeleteTarget">
        <template v-if="boardDeleteTarget.taskCount > 0">
          看板「{{ boardDeleteTarget.name }}」里还有 {{ boardDeleteTarget.taskCount }} 个任务，删除后将一并移除（重要任务请先在编辑弹窗中转移到其他看板）。确定删除吗？
        </template>
        <template v-else>
          确定要删除看板「{{ boardDeleteTarget.name }}」吗？
        </template>
      </template>
    </Modal>

    <!-- 归档确认 -->
    <Modal
      v-model:open="archiveConfirmOpen"
      title="归档已完成任务"
      :typewriter="false"
      @ok="confirmArchive"
    >
      将把当前看板完成列的 {{ archivableTasks.length }} 个任务移入「成就」页的历史归档，
      移出后不再显示在看板上（完成记录仍会计入成就统计）。确定归档吗？
    </Modal>

    <!-- 卡片显示设置 -->
    <Modal
      v-model:open="cardDisplayOpen"
      title="卡片显示"
      :typewriter="false"
      :show-footer="true"
      :width="420"
    >
      <div style="display:flex;flex-direction:column;gap:14px;">
        <label class="card-display-option">
          <input type="checkbox" v-model="cardDisplay.description" />
          <span>显示任务描述</span>
        </label>
        <label class="card-display-option">
          <input type="checkbox" v-model="cardDisplay.deadline" />
          <span>显示截止时间标签</span>
        </label>
        <label class="card-display-option">
          <input type="checkbox" v-model="cardDisplay.link" />
          <span>显示关联链接</span>
        </label>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="cardDisplayOpen = false">完成</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.kanban-board {
  display: grid;
  /* 横屏一行最多 4 列，超出换行 */
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  /* 看板整体固定高度（视口减去页头/页签/区块头），滚动发生在各列内部 */
  height: calc(100vh - 320px);
  min-height: 420px;
}
/* 竖屏/窄屏：两列排列，每列固定较矮高度，列内滚动 */
@media (max-width: 900px), (orientation: portrait) {
  .kanban-board {
    grid-template-columns: repeat(2, 1fr);
    height: auto;
    min-height: 0;
  }
  .kanban-column {
    height: 500px;
  }
}
.kanban-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
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
.kanban-column-header.col-red { background: #ffe9e4; }
.kanban-column-header.col-yellow { background: #fff8e0; }
.kanban-column-header.col-blue { background: #e8edff; }
.kanban-column-header.col-green { background: #e8f5e8; }
.kanban-column-header.col-pink { background: #ffe9f3; }
.kanban-column-header.col-teal { background: #e0f6f3; }
.kanban-column-header.col-purple { background: #f1e9ff; }
.kanban-column-header.col-orange { background: #fff0dd; }
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
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.kanban-card {
  background: #fffdf5;
  border: 2px solid #e8dcc8;
  border-radius: 16px;
  padding: 12px;
  cursor: grab;
  flex-shrink: 0;
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

.card-display-option {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}
.card-display-option input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
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
