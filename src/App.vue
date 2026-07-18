<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import {
  Button,
  Input,
  Radio,
  Switch,
  Card,
  Title,
  Tabs,
  Collapse,
  Modal,
  Loading,
  Table,
  Time,
  Divider,
  Footer,
  Cursor,
  Typewriter,
  Icon,
  Wallet,
  Notification,
  NotificationContainer,
} from 'animal-island-vue';
import type { RadioOption } from 'animal-island-vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { use } from 'echarts/core';
import { init } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useTodayLog } from '@/composables/useTodayLog';
import { useDetailDrawers } from '@/composables/useDetailDrawers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { todayStr, formatDateStr } from '@/utils/date';
import { sanitizeHtml } from '@/utils/sanitize';
import { studyTypeText, statusText } from '@/utils/labels';
import type { StudyItem, MoneyItem, TaskItem } from '@/types';
import type { CustomSelectOption } from '@/components/CustomSelect.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import DetailDrawers from '@/components/DetailDrawers.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';
import InspirationComposer from '@/components/InspirationComposer.vue';
import TodayPanel from '@/components/panels/TodayPanel.vue';
import InspirationPanel from '@/components/panels/InspirationPanel.vue';
import HealthPanel from '@/components/panels/HealthPanel.vue';
import BackupPanel from '@/components/panels/BackupPanel.vue';

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, TitleComponent, LabelLayout]);

const {
  activeTab,
  studyItems,
  moneyItems,
  moneyPlan,
  tasks,
  isLoaded,
} = useMyDayStorage();

const { pushTodayLog } = useTodayLog();
const { openDetail, openMoneyDetail } = useDetailDrawers();
const { openDelete } = useDeleteConfirm();

const welcomeTrigger = ref(0);
onMounted(() => {
  welcomeTrigger.value++;
});

/* ==================== Tabs ==================== */
const tabItems = [
  { key: 'tasks', label: '任务' },
  { key: 'health', label: '健康' },
  { key: 'study', label: '学习' },
  { key: 'money', label: '赚钱' },
  { key: 'today', label: '动态' },
  { key: 'inspiration', label: '灵感' },
  { key: 'import-export', label: '备份' },
];

/* ==================== Tasks (Kanban) ==================== */
const taskColumns = [
  { key: 'today', label: '今日任务', color: 'app-red' },
  { key: 'todo', label: '待开始', color: 'app-yellow' },
  { key: 'doing', label: '进行中', color: 'app-blue' },
  { key: 'done', label: '已完成', color: 'app-green' },
] as const;

const taskTimeSlotOptions = [
  { key: 'dawn', label: '凌晨（00:00-06:00）' },
  { key: 'morning', label: '上午（06:00-12:00）' },
  { key: 'afternoon', label: '下午（12:00-18:00）' },
  { key: 'evening', label: '晚上（18:00-24:00）' },
];
const getCurrentTimeSlot = (): NonNullable<TaskItem['timeSlot']> => {
  const hour = new Date().getHours();
  if (hour < 6) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};
const getTaskTimeSlotLabel = (key?: TaskItem['timeSlot']) =>
  taskTimeSlotOptions.find((o) => o.key === key)?.label || '';
const getTaskTimeSlot = (task: TaskItem): NonNullable<TaskItem['timeSlot']> => {
  if (task.timeSlot) return task.timeSlot;
  const hour = new Date(task.id).getHours();
  if (hour < 6) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

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

const parseTaskLink = (key: string) => {
  if (key === 'none') return { linkType: undefined as 'study' | 'money' | undefined, linkId: undefined as number | undefined };
  const [type, id] = key.split('-');
  return { linkType: type as 'study' | 'money', linkId: Number(id) };
};

const formatTaskLink = (linkType?: 'study' | 'money' | null, linkId?: number) => {
  if (!linkType || linkId == null) return 'none';
  return `${linkType}-${linkId}`;
};

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
const openTaskModal = () => {
  resetTaskForm();
  taskModalMode.value = 'add';
  taskEditTarget.value = null;
  taskModalOpen.value = true;
};
const isDeadlineWithinDays = (deadline: string | undefined, days: number) => {
  if (!deadline) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + days);
  const d = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime() && d.getTime() <= end.getTime();
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

const draggingTaskId = ref<number | null>(null);
const handleDragStart = (task: TaskItem) => {
  draggingTaskId.value = task.id;
};
const handleDragEnd = () => {
  draggingTaskId.value = null;
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
  draggingTaskId.value = null;
};

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
    if (taskChartResizeObserver) {
      taskChartResizeObserver.disconnect();
      taskChartResizeObserver = null;
    }
    if (taskChartInstance) {
      taskChartInstance.dispose();
      taskChartInstance = null;
    }
  }
});
watch(taskChartOption, (option) => {
  if (taskChartInstance) {
    taskChartInstance.setOption(option, true);
  }
});

/* ==================== Study ==================== */
const studyType = ref('all');
const showCompletedStudy = ref(false);
const studyRadio: RadioOption[] = [
  { label: '全部', value: 'all' },
  { label: '视频', value: 'video' },
  { label: '书籍', value: 'book' },
  { label: '技能', value: 'skill' },
];
const studyCols: any[] = [
  { title: '项目', dataIndex: 'name' },
  { title: '类型', dataIndex: 'type', width: '90px', align: 'center' },
  { title: '进度', dataIndex: 'progress', width: '150px' },
  { title: '详情', dataIndex: 'detail', width: '240px' },
  { title: '操作', dataIndex: 'action', width: '100px', align: 'center' },
];
const studyTypeOptions: RadioOption[] = [
  { label: '视频', value: 'video' },
  { label: '书籍', value: 'book' },
  { label: '技能', value: 'skill' },
];
const studyColorMap: Record<string, string> = { video: '#b77dee', book: '#f8a6b2', skill: '#82d5bb' };
const studyForm = reactive({
  type: 'video',
  name: '',
  progress: '',
  link: '',
  lesson: '',
  totalLesson: '',
  chapter: '',
  totalChapter: '',
  page: '',
  totalPage: '',
  notes: '',
});
const resetStudyForm = () => {
  studyForm.type = 'video';
  studyForm.name = '';
  studyForm.progress = '';
  studyForm.link = '';
  studyForm.lesson = '';
  studyForm.totalLesson = '';
  studyForm.chapter = '';
  studyForm.totalChapter = '';
  studyForm.page = '';
  studyForm.totalPage = '';
  studyForm.notes = '';
};
const computedBookProgress = computed(() => {
  const total = Number(studyForm.totalPage) || 0;
  const page = Number(studyForm.page) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((page / total) * 100));
});
const computedVideoProgress = computed(() => {
  const total = Number(studyForm.totalLesson) || 0;
  const lesson = Number(studyForm.lesson) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((lesson / total) * 100));
});

const filteredStudy = computed(() => {
  let list = studyType.value === 'all' ? studyItems : studyItems.filter((s: StudyItem) => s.type === studyType.value);
  if (!showCompletedStudy.value) {
    list = list.filter((s: StudyItem) => s.progress < 100);
  }
  return list;
});
const studyPage = ref(1);
const studyPageSize = 10;
const studyTotalPages = computed(() => Math.ceil(filteredStudy.value.length / studyPageSize) || 1);
const paginatedStudy = computed(() => {
  const start = (studyPage.value - 1) * studyPageSize;
  return filteredStudy.value.slice(start, start + studyPageSize);
});
watch([studyType, showCompletedStudy], () => { studyPage.value = 1; });
watch(studyTotalPages, (total) => { if (studyPage.value > total) studyPage.value = total || 1; });

const draggingStudyId = ref<number | null>(null);
const dragOverStudyId = ref<number | null>(null);
const handleStudyDragStart = (record: StudyItem) => {
  draggingStudyId.value = record.id;
};
const handleStudyDragOver = (record: StudyItem) => {
  dragOverStudyId.value = record.id;
};
const handleStudyDrop = (targetRecord: StudyItem) => {
  if (draggingStudyId.value == null) return;
  const fromItem = paginatedStudy.value.find((s: StudyItem) => s.id === draggingStudyId.value);
  if (!fromItem || fromItem.id === targetRecord.id) return;
  const fromGlobal = studyItems.findIndex((s: StudyItem) => s.id === fromItem.id);
  const toGlobal = studyItems.findIndex((s: StudyItem) => s.id === targetRecord.id);
  if (fromGlobal === -1 || toGlobal === -1) return;
  const [moved] = studyItems.splice(fromGlobal, 1);
  studyItems.splice(toGlobal, 0, moved);
  draggingStudyId.value = null;
  dragOverStudyId.value = null;
};
const handleStudyDragEnd = () => {
  draggingStudyId.value = null;
  dragOverStudyId.value = null;
};
const addStudy = () => {
  const name = studyForm.name.trim();
  if (!name) return;
  const item: StudyItem = {
    id: Date.now(),
    type: studyForm.type as StudyItem['type'],
    name,
    image: studyColorMap[studyForm.type],
    abbr: name.slice(0, 2),
    progress: 0,
  };
  if (studyForm.type === 'video') {
    item.link = studyForm.link.trim();
    item.lesson = Number(studyForm.lesson) || 0;
    item.totalLesson = Number(studyForm.totalLesson) || 0;
    if (item.totalLesson > 0) {
      item.progress = Math.min(100, Math.round((item.lesson / item.totalLesson) * 100));
    } else {
      item.progress = 0;
    }
  } else if (studyForm.type === 'book') {
    item.chapter = Number(studyForm.chapter) || 0;
    item.totalChapter = Number(studyForm.totalChapter) || 0;
    item.page = Number(studyForm.page) || 0;
    item.totalPage = Number(studyForm.totalPage) || 0;
    if (item.totalPage > 0) {
      item.progress = Math.min(100, Math.round((item.page / item.totalPage) * 100));
    } else {
      item.progress = 0;
    }
  } else {
    item.notes = studyForm.notes.trim();
    item.progress = Math.min(100, Math.max(0, Number(studyForm.progress) || 0));
  }
  studyItems.push(item);
  resetStudyForm();
  pushTodayLog('study', `添加学习项 ${item.name}，进度 ${item.progress}%`);
};

const studyModalOpen = ref(false);
const openStudyModal = () => {
  resetStudyForm();
  studyModalOpen.value = true;
};
const submitStudy = () => {
  if (!studyForm.name.trim()) return;
  addStudy();
  studyModalOpen.value = false;
};

const editStudyModalOpen = ref(false);
const editStudyTarget = ref<StudyItem | null>(null);
const editProgress = ref('');
const editBookChapter = ref('');
const editBookTotalChapter = ref('');
const editBookPage = ref('');
const editBookTotalPage = ref('');
const editVideoLesson = ref('');
const editVideoTotalLesson = ref('');
const openEditStudy = (record: StudyItem) => {
  editStudyTarget.value = record;
  editProgress.value = String(record.progress);
  editBookChapter.value = String(record.chapter ?? '');
  editBookTotalChapter.value = String(record.totalChapter ?? '');
  editBookPage.value = String(record.page ?? '');
  editBookTotalPage.value = String(record.totalPage ?? '');
  editVideoLesson.value = String(record.lesson ?? '');
  editVideoTotalLesson.value = String(record.totalLesson ?? '');
  editStudyModalOpen.value = true;
};
const submitEditStudy = () => {
  if (!editStudyTarget.value) return;
  const record = editStudyTarget.value;
  if (record.type === 'book') {
    record.chapter = Number(editBookChapter.value) || 0;
    record.totalChapter = Number(editBookTotalChapter.value) || 0;
    record.page = Number(editBookPage.value) || 0;
    record.totalPage = Number(editBookTotalPage.value) || 0;
    if (record.totalPage > 0) {
      record.progress = Math.min(100, Math.round((record.page / record.totalPage) * 100));
    }
  } else if (record.type === 'video') {
    record.lesson = Number(editVideoLesson.value) || 0;
    record.totalLesson = Number(editVideoTotalLesson.value) || 0;
    if (record.totalLesson > 0) {
      record.progress = Math.min(100, Math.round((record.lesson / record.totalLesson) * 100));
    }
  } else {
    record.progress = Math.min(100, Math.max(0, Number(editProgress.value) || 0));
  }
  pushTodayLog('study', `更新 ${record.name} 进度为 ${record.progress}%`);
  editStudyModalOpen.value = false;
};

/* ==================== Money ==================== */
const moneyCols: any[] = [
  { title: '业务描述', dataIndex: 'desc' },
  { title: '金额', dataIndex: 'amount', width: '110px', align: 'right' },
  { title: '截止', dataIndex: 'deadline', width: '120px' },
  { title: '进度', dataIndex: 'progress', width: '150px' },
  { title: '状态', dataIndex: 'status', width: '100px' },
  { title: '操作', dataIndex: 'action', width: '120px', align: 'center' },
];
const moneyStatusOptions: CustomSelectOption[] = [
  { key: 'pending', label: '未完成' },
  { key: 'done', label: '完成' },
  { key: 'paused', label: '暂停' },
];
const moneyForm = reactive({
  desc: '',
  amount: '',
  deadline: '',
  status: 'pending',
  progress: '',
  description: '',
});
const resetMoneyForm = () => {
  moneyForm.desc = '';
  moneyForm.amount = '';
  moneyForm.deadline = todayStr();
  moneyForm.status = 'pending';
  moneyForm.progress = '';
  moneyForm.description = '';
};

const moneyModalOpen = ref(false);
const openMoneyModal = () => {
  resetMoneyForm();
  moneyModalOpen.value = true;
};
const autoCreateTodayTaskFromMoney = (money: MoneyItem) => {
  if (!isDeadlineWithinDays(money.deadline, 3)) return;
  const exists = tasks.some(
    (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
  );
  if (exists) return;
  tasks.push({
    id: Date.now(),
    title: `[赚钱] ${money.desc}`,
    deadline: money.deadline,
    timeSlot: getCurrentTimeSlot(),
    status: 'today',
    linkType: 'money',
    linkId: money.id,
  });
};
const syncAutoTodayTaskForMoney = (money: MoneyItem) => {
  const existing = tasks.find(
    (t: TaskItem) => t.linkType === 'money' && t.linkId === money.id
  );
  if (isDeadlineWithinDays(money.deadline, 3)) {
    if (existing) {
      existing.deadline = money.deadline;
      if (existing.status !== 'today') existing.status = 'today';
    } else {
      tasks.push({
        id: Date.now(),
        title: `[赚钱] ${money.desc}`,
        deadline: money.deadline,
        status: 'today',
        linkType: 'money',
        linkId: money.id,
      });
    }
  } else if (existing) {
    const idx = tasks.indexOf(existing);
    if (idx > -1) tasks.splice(idx, 1);
  }
};

const submitMoney = () => {
  if (!moneyForm.desc || !moneyForm.amount) return;
  const item: MoneyItem = {
    id: Date.now(),
    desc: moneyForm.desc,
    amount: Number(moneyForm.amount),
    deadline: moneyForm.deadline || todayStr(),
    progress: Math.min(100, Math.max(0, Number(moneyForm.progress) || 0)),
    status: moneyForm.status as MoneyItem['status'],
    description: moneyForm.description,
  };
  moneyItems.push(item);
  autoCreateTodayTaskFromMoney(item);
  resetMoneyForm();
  moneyModalOpen.value = false;
  pushTodayLog('money', `添加赚钱任务 ${item.desc} ¥${item.amount}，${statusText(item.status)}`);
};
const editMoneyModalOpen = ref(false);
const editMoneyTarget = ref<MoneyItem | null>(null);
const editMoneyForm = reactive({
  desc: '',
  amount: '',
  deadline: '',
  status: 'pending',
  progress: '',
  description: '',
});
const openEditMoney = (record: MoneyItem) => {
  editMoneyTarget.value = record;
  editMoneyForm.desc = record.desc;
  editMoneyForm.amount = String(record.amount);
  editMoneyForm.deadline = record.deadline;
  editMoneyForm.status = record.status;
  editMoneyForm.progress = String(record.progress);
  editMoneyForm.description = record.description || '';
  editMoneyModalOpen.value = true;
};
const submitEditMoney = () => {
  if (!editMoneyTarget.value) return;
  const record = editMoneyTarget.value;
  record.desc = editMoneyForm.desc.trim();
  record.amount = Number(editMoneyForm.amount) || 0;
  record.deadline = editMoneyForm.deadline || todayStr();
  record.status = editMoneyForm.status as MoneyItem['status'];
  record.progress = Math.min(100, Math.max(0, Number(editMoneyForm.progress) || 0));
  record.description = editMoneyForm.description;
  if (record.status === 'done') record.progress = 100;
  syncAutoTodayTaskForMoney(record);
  pushTodayLog('money', `更新赚钱任务 ${record.desc}，${statusText(record.status)}，进度 ${record.progress}%`);
  editMoneyModalOpen.value = false;
};

const datePickerOpen = ref(false);
const datePickerTarget = ref<'add' | 'edit' | 'task'>('add');
const datePickerValue = computed({
  get: () => {
    if (datePickerTarget.value === 'add') return moneyForm.deadline;
    if (datePickerTarget.value === 'edit') return editMoneyForm.deadline;
    return taskForm.deadline;
  },
  set: (v: string) => {
    if (datePickerTarget.value === 'add') {
      moneyForm.deadline = v;
    } else if (datePickerTarget.value === 'edit') {
      editMoneyForm.deadline = v;
    } else {
      taskForm.deadline = v;
    }
  },
});
const openDatePicker = (target: 'add' | 'edit' | 'task') => {
  datePickerTarget.value = target;
  datePickerOpen.value = true;
};

const sortedMoneyItems = computed(() =>
  [...moneyItems].sort((a: MoneyItem, b: MoneyItem) => a.deadline.localeCompare(b.deadline))
);

const moneyView = ref<'tasks' | 'calendar' | 'plan'>('tasks');

const moneyPage = ref(1);
const moneyPageSize = 10;
const moneyTotalPages = computed(() => Math.ceil(sortedMoneyItems.value.length / moneyPageSize) || 1);
const paginatedMoneyItems = computed(() => {
  const start = (moneyPage.value - 1) * moneyPageSize;
  return sortedMoneyItems.value.slice(start, start + moneyPageSize);
});
watch(moneyView, () => { moneyPage.value = 1; });
watch(moneyTotalPages, (total) => { if (moneyPage.value > total) moneyPage.value = total || 1; });

const moneyCalendarMonth = ref(new Date());
const moneyMonthLabel = computed(() =>
  `${moneyCalendarMonth.value.getFullYear()}年${moneyCalendarMonth.value.getMonth() + 1}月`
);
const moneyCalendarDays = computed(() => {
  const year = moneyCalendarMonth.value.getFullYear();
  const month = moneyCalendarMonth.value.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ds = formatDateStr(d);
    days.push({
      date: ds,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      tasks: moneyItems.filter((m: MoneyItem) => m.deadline === ds),
    });
  }
  return days;
});
const prevMoneyMonth = () => {
  moneyCalendarMonth.value = new Date(
    moneyCalendarMonth.value.getFullYear(),
    moneyCalendarMonth.value.getMonth() - 1,
    1
  );
};
const nextMoneyMonth = () => {
  moneyCalendarMonth.value = new Date(
    moneyCalendarMonth.value.getFullYear(),
    moneyCalendarMonth.value.getMonth() + 1,
    1
  );
};
const moneyPlanDraft = ref('');
watch(moneyView, (view) => {
  if (view === 'plan') {
    moneyPlanDraft.value = moneyPlan.value || '';
  }
});
const saveMoneyPlan = () => {
  moneyPlan.value = moneyPlanDraft.value;
  Notification.success('长期规划已保存');
};
const totalIncome = computed(() => moneyItems.reduce((s, m) => s + m.amount, 0));
const pendingIncome = computed(() =>
  moneyItems.filter((m: MoneyItem) => m.status !== 'done').reduce((s, m) => s + m.amount, 0)
);

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
            <!-- 任务 -->
            <template #tasks>
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
                        :class="{ 'is-dragging': draggingTaskId === task.id, 'is-urgent': isDeadlineWithinDays(task.deadline, 3) }"
                        draggable="true"
                        @dragstart="handleDragStart(task)"
                        @dragend="handleDragEnd"
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
              </div>
            </template>

            <!-- 健康 -->
            <template #health>
              <HealthPanel />
            </template>

            <!-- 学习 -->
            <template #study>
              <div class="section">
                <div class="section-head">
                  <div style="display:flex;align-items:center;gap:16px;">
                    <Title color="app-blue" size="middle">学习进度表</Title>
                    <Switch v-model="showCompletedStudy" class="study-switch">
                      <template #checked>显示已完成</template>
                      <template #unchecked>隐藏已完成</template>
                    </Switch>
                  </div>
                  <div class="form-row">
                    <Radio v-model="studyType" :options="studyRadio" size="middle" direction="horizontal" />
                    <Button type="primary" size="middle" @click="openStudyModal">添加学习项</Button>
                  </div>
                </div>
                <Table
                  :columns="studyCols"
                  :data-source="paginatedStudy"
                  row-key="id"
                  :striped="true"
                  :onRow="(record: StudyItem) => ({
                    onClick: () => openDetail(record),
                    style: { cursor: 'pointer' },
                    draggable: true,
                    onDragstart: () => handleStudyDragStart(record),
                    onDragover: (e: DragEvent) => { e.preventDefault(); handleStudyDragOver(record); },
                    onDrop: (e: DragEvent) => { e.preventDefault(); handleStudyDrop(record); },
                    onDragend: handleStudyDragEnd,
                    class: draggingStudyId === record.id ? 'study-row-dragging' : dragOverStudyId === record.id ? 'study-row-drag-over' : '',
                  })"
                >
                  <template #cell-name="{ record }">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div class="cell-thumb"
                        :style="{ background: record.image, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }"
                      >
                        {{ record.abbr }}
                      </div>
                      <div>
                        <div class="cell-title">{{ record.name }}</div>
                      </div>
                    </div>
                  </template>
                  <template #cell-type="{ record }">
                    <span class="study-type-badge" :class="record.type">{{ studyTypeText(record.type) }}</span>
                  </template>
                  <template #cell-progress="{ record }">
                    <div style="font-weight:700;color:var(--text);">{{ record.progress }}%</div>
                    <div class="progress-bar">
                      <div class="progress-bar-fill" :style="{ width: record.progress + '%' }"></div>
                    </div>
                  </template>
                  <template #cell-detail="{ record }">
                    <div v-if="record.type === 'video'" class="cell-meta">第 {{ record.lesson }} / {{ record.totalLesson }} 课</div>
                    <div v-else-if="record.type === 'book'" class="cell-meta">第 {{ record.chapter }} / {{ record.totalChapter }} 章 · 第 {{ record.page }} / {{ record.totalPage }} 页</div>
                    <div v-else class="cell-meta">{{ record.notes }}</div>
                  </template>
                  <template #cell-action="{ record }">
                    <div style="display:flex;gap:8px;justify-content:center;">
                      <Button type="text" size="middle" @click.stop="openEditStudy(record)">编辑</Button>
                      <Button type="text" size="middle" @click.stop="openDelete('study', record.id)">删除</Button>
                    </div>
                  </template>
                </Table>
                <div v-if="filteredStudy.length > studyPageSize" class="table-pagination">
                  <Button type="default" size="small" :disabled="studyPage === 1" @click="studyPage--">上一页</Button>
                  <span class="table-pagination-info">{{ studyPage }} / {{ studyTotalPages }}</span>
                  <Button type="default" size="small" :disabled="studyPage === studyTotalPages" @click="studyPage++">下一页</Button>
                </div>
              </div>
            </template>

            <!-- 赚钱 -->
            <template #money>
              <div class="summary-grid">
                <Card color="app-yellow">
                  <div class="summary-label">已到账收入</div>
                  <Wallet class="summary-wallet" :value="totalIncome" size="large" />
                </Card>
                <Card color="app-orange">
                  <div class="summary-label">进行中预估</div>
                  <Wallet class="summary-wallet" :value="Math.round(pendingIncome)" size="large" />
                </Card>
                <Card color="app-pink">
                  <div class="summary-count-card">
                    <div class="summary-label">总任务数</div>
                    <div class="summary-value">{{ moneyItems.length }}</div>
                  </div>
                </Card>
              </div>

              <Divider type="dashed-brown" />

              <div class="section">
                <div class="section-head">
                  <div style="display:flex;gap:32px;align-items:center;">
                    <Title
                      color="app-yellow"
                      size="middle"
                      :style="{ opacity: moneyView === 'tasks' ? 1 : 0.5, cursor: 'pointer' }"
                      @click="moneyView = 'tasks'"
                    >赚钱任务表</Title>
                    <Title
                      color="app-teal"
                      size="middle"
                      :style="{ opacity: moneyView === 'calendar' ? 1 : 0.5, cursor: 'pointer' }"
                      @click="moneyView = 'calendar'"
                    >日历视图</Title>
                    <Title
                      color="app-pink"
                      size="middle"
                      :style="{ opacity: moneyView === 'plan' ? 1 : 0.5, cursor: 'pointer' }"
                      @click="moneyView = 'plan'"
                    >长期规划</Title>
                  </div>
                  <Button v-if="moneyView === 'tasks'" type="primary" size="middle" @click="openMoneyModal">添加任务</Button>
                </div>
                <Table
                  v-if="moneyView === 'tasks'"
                  :columns="moneyCols"
                  :data-source="paginatedMoneyItems"
                  row-key="id"
                  :striped="true"
                  :onRow="(record: MoneyItem) => ({ onClick: () => openMoneyDetail(record), style: { cursor: 'pointer' } })"
                >
                  <template #cell-amount="{ record }">
                    <span style="font-weight:800;">¥{{ record.amount }}</span>
                  </template>
                  <template #cell-deadline="{ record }">
                    <span style="white-space: nowrap;">{{ record.deadline }}</span>
                  </template>
                  <template #cell-progress="{ record }">
                    <div style="font-weight:700;color:var(--text);">{{ record.progress }}%</div>
                    <div class="progress-bar">
                      <div class="progress-bar-fill" :style="{ width: record.progress + '%' }"></div>
                    </div>
                  </template>
                  <template #cell-status="{ record }">
                    <span class="status-badge" :class="record.status">
                      {{ statusText(record.status) }}
                    </span>
                  </template>
                  <template #cell-action="{ record }">
                    <div style="display:flex;gap:8px;justify-content:center;">
                      <Button type="text" size="middle" @click.stop="openEditMoney(record)">编辑</Button>
                      <Button type="text" size="middle" @click.stop="openDelete('money', record.id)">删除</Button>
                    </div>
                  </template>
                </Table>
                <div v-if="moneyView === 'tasks' && sortedMoneyItems.length > moneyPageSize" class="table-pagination">
                  <Button type="default" size="small" :disabled="moneyPage === 1" @click="moneyPage--">上一页</Button>
                  <span class="table-pagination-info">{{ moneyPage }} / {{ moneyTotalPages }}</span>
                  <Button type="default" size="small" :disabled="moneyPage === moneyTotalPages" @click="moneyPage++">下一页</Button>
                </div>
                <div v-if="moneyView === 'calendar'">
                  <Card pattern="default" style="width:100%;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                      <Button type="default" size="middle" style="font-size:30px" @click="prevMoneyMonth">‹</Button>
                      <span style="font-weight:800;color:var(--text);">{{ moneyMonthLabel }}</span>
                      <Button type="default" size="middle" style="font-size:30px" @click="nextMoneyMonth">›</Button>
                    </div>
                    <div class="calendar-grid">
                      <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="calendar-day-name">{{ d }}</div>
                      <div
                        v-for="(day, i) in moneyCalendarDays"
                        :key="i"
                        class="calendar-cell money-calendar-cell"
                        :class="{ 'text-disabled': !day.inMonth, 'is-today': day.date === todayStr() }"
                      >
                        <div class="money-calendar-day">{{ day.day }}</div>
                        <div v-if="day.tasks.length" class="money-calendar-tasks">
                          <div
                            v-for="task in day.tasks"
                            :key="task.id"
                            class="money-calendar-task"
                            :class="`status-${task.status}`"
                            @click="openMoneyDetail(task)"
                          >
                            <span class="money-calendar-task-desc">{{ task.desc }}</span>
                            <span class="money-calendar-task-amount">¥{{ task.amount }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
                <div v-if="moneyView === 'plan'" class="form-field money-plan-editor">
                  <QuillEditor
                    v-model:content="moneyPlanDraft"
                    content-type="html"
                    theme="snow"
                    toolbar="full"
                    placeholder="填写赚钱模块的长期规划、目标、策略..."
                  />
                  <div style="margin-top:14px;display:flex;justify-content:flex-end;">
                    <Button type="primary" size="middle" @click="saveMoneyPlan">保存</Button>
                  </div>
                </div>
              </div>
            </template>

            <!-- 动态 -->
            <template #today>
              <TodayPanel />
            </template>

            <!-- 灵感 -->
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

      <Modal
        v-model:open="studyModalOpen"
        title="添加学习项"
        :typewriter="false"
        :show-footer="true"
      >
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-field">
            <label class="form-field-label">类型</label>
            <Radio v-model="studyForm.type" :options="studyTypeOptions" direction="horizontal" size="middle" />
          </div>
          <div class="form-field">
            <label class="form-field-label">学习项目名称</label>
            <Input v-model="studyForm.name" placeholder="学习项目名称" style="width:100%;" />
          </div>

          <template v-if="studyForm.type === 'video'">
            <div class="form-field">
              <label class="form-field-label">课程链接</label>
              <Input v-model="studyForm.link" placeholder="课程链接" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">总课程数</label>
              <Input v-model="studyForm.totalLesson" placeholder="总课程数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">当前第几课</label>
              <Input v-model="studyForm.lesson" placeholder="当前第几课" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">进度</label>
              <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
                <span style="font-weight:800;color:var(--text);">{{ computedVideoProgress }}</span>
                <span style="font-size:13px;color:var(--text-secondary);">%</span>
              </div>
            </div>
          </template>

          <template v-else-if="studyForm.type === 'book'">
            <div class="form-field">
              <label class="form-field-label">第几章</label>
              <Input v-model="studyForm.chapter" placeholder="第几章" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">总章节数</label>
              <Input v-model="studyForm.totalChapter" placeholder="总章节数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">当前页</label>
              <Input v-model="studyForm.page" placeholder="当前页" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">总页数</label>
              <Input v-model="studyForm.totalPage" placeholder="总页数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">进度</label>
              <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
                <span style="font-weight:800;color:var(--text);">{{ computedBookProgress }}</span>
                <span style="font-size:13px;color:var(--text-secondary);">%</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="form-field">
              <label class="form-field-label">进度</label>
              <Input v-model="studyForm.progress" placeholder="进度 0-100" style="width:100%;">
                <template #suffix>%</template>
              </Input>
            </div>
            <div class="form-field">
              <label class="form-field-label">备注</label>
              <Input v-model="studyForm.notes" placeholder="备注，例如练习目标" style="width:100%;" />
            </div>
          </template>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <Button type="primary" size="middle" @click="studyModalOpen = false">取消</Button>
            <Button type="primary" size="middle" @click="submitStudy">添加</Button>
          </div>
        </template>
      </Modal>

      <Modal
        v-model:open="editStudyModalOpen"
        title="更新进度"
        :typewriter="false"
        :show-footer="true"
      >
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-field">
            <label class="form-field-label">项目名称</label>
            <div style="font-weight:700;color:var(--text);">{{ editStudyTarget?.name }}</div>
          </div>

          <template v-if="editStudyTarget?.type === 'video'">
            <div class="form-field">
              <label class="form-field-label">总课程数</label>
              <Input v-model="editVideoTotalLesson" placeholder="总课程数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">当前第几课</label>
              <Input v-model="editVideoLesson" placeholder="当前第几课" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">进度</label>
              <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
                <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editVideoLesson)||0) / (Number(editVideoTotalLesson)||1) * 100)) }}</span>
                <span style="font-size:13px;color:var(--text-secondary);">%</span>
              </div>
            </div>
          </template>

          <div v-else-if="editStudyTarget?.type !== 'book'" class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="editProgress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
          </div>

          <template v-else>
            <div class="form-field">
              <label class="form-field-label">第几章</label>
              <Input v-model="editBookChapter" placeholder="第几章" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">总章节数</label>
              <Input v-model="editBookTotalChapter" placeholder="总章节数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">当前页</label>
              <Input v-model="editBookPage" placeholder="当前页" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">总页数</label>
              <Input v-model="editBookTotalPage" placeholder="总页数" style="width:100%;" />
            </div>
            <div class="form-field">
              <label class="form-field-label">进度</label>
              <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
                <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editBookPage)||0) / (Number(editBookTotalPage)||1) * 100)) }}</span>
                <span style="font-size:13px;color:var(--text-secondary);">%</span>
              </div>
            </div>
          </template>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <Button type="primary" size="middle" @click="editStudyModalOpen = false">取消</Button>
            <Button type="primary" size="middle" @click="submitEditStudy">保存</Button>
          </div>
        </template>
      </Modal>
      <Modal
        v-model:open="moneyModalOpen"
        title="添加赚钱任务"
        :typewriter="false"
        :show-footer="true"
      >
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-field">
            <label class="form-field-label">业务描述</label>
            <Input v-model="moneyForm.desc" placeholder="业务描述" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">金额</label>
            <Input v-model="moneyForm.amount" placeholder="金额" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">截止日期</label>
            <Input
              v-model="moneyForm.deadline"
              readonly
              style="width:100%;cursor:pointer;"
              @click="openDatePicker('add')"
            >
              <template #suffix>📅</template>
            </Input>
          </div>
          <div class="form-field">
            <label class="form-field-label">状态</label>
            <CustomSelect v-model="moneyForm.status" :options="moneyStatusOptions" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="moneyForm.progress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
          </div>
          <div class="form-field">
            <label class="form-field-label">描述</label>
            <QuillEditor
              v-model:content="moneyForm.description"
              content-type="html"
              theme="snow"
              toolbar="full"
              placeholder="填写任务描述、执行步骤、备注..."
            />
          </div>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <Button type="primary" size="middle" @click="moneyModalOpen = false">取消</Button>
            <Button type="primary" size="middle" @click="submitMoney">添加</Button>
          </div>
        </template>
      </Modal>

      <Modal
        v-model:open="editMoneyModalOpen"
        title="编辑赚钱任务"
        :typewriter="false"
        :show-footer="true"
        :width="676"
      >
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-field">
            <label class="form-field-label">业务描述</label>
            <Input v-model="editMoneyForm.desc" placeholder="业务描述" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">金额</label>
            <Input v-model="editMoneyForm.amount" placeholder="金额" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">截止日期</label>
            <Input
              v-model="editMoneyForm.deadline"
              readonly
              style="width:100%;cursor:pointer;"
              @click="openDatePicker('edit')"
            >
              <template #suffix>📅</template>
            </Input>
          </div>
          <div class="form-field">
            <label class="form-field-label">状态</label>
            <CustomSelect v-model="editMoneyForm.status" :options="moneyStatusOptions" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="editMoneyForm.progress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
          </div>
          <div class="form-field">
            <label class="form-field-label">描述</label>
            <QuillEditor
              v-model:content="editMoneyForm.description"
              content-type="html"
              theme="snow"
              toolbar="full"
              placeholder="填写任务描述、执行步骤、备注..."
            />
          </div>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <Button type="primary" size="middle" @click="editMoneyModalOpen = false">取消</Button>
            <Button type="primary" size="middle" @click="submitEditMoney">保存</Button>
          </div>
        </template>
      </Modal>

      <DatePickerModal
        v-model:open="datePickerOpen"
        v-model="datePickerValue"
        title="选择截止日期"
        :mask-style="{ zIndex: 1200 }"
      />
      <DetailDrawers />
    </div>
    <NotificationContainer />

    <InspirationComposer />

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
            @click="openDatePicker('task')"
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

.health-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}
.health-stack > div {
  flex: 1 1 480px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.health-card {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
.health-card .chart-wrap {
  flex: 1 1 auto;
  min-height: 260px;
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

/* ============ Animal Crossing dynamic background ============ */
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

.inspiration-delete {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-secondary);
  font-size: 32px;
  line-height: 1;
  user-select: none;
  transition: color 0.2s;
}
.inspiration-delete:hover {
  color: var(--error);
}

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

:deep(.study-row-dragging) {
  opacity: 0.5;
}
:deep(.study-row-drag-over) {
  background: rgba(25, 200, 185, 0.18) !important;
}
.money-calendar-cell {
  aspect-ratio: auto;
  height: auto;
  min-height: 104px;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px;
  gap: 6px;
  overflow: hidden;
  background: #fffdf5;
  border: 2px solid #e8dcc8;
  border-radius: 18px;
  box-shadow: 0 2px 0 rgba(114, 93, 66, 0.06);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.money-calendar-cell:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 14px rgba(114, 93, 66, 0.12);
  border-color: var(--primary);
}
.money-calendar-cell.text-disabled {
  opacity: 0.45;
  background: #f7f4e8;
}
.money-calendar-cell.is-today .money-calendar-day {
  background: var(--primary-bg);
  color: var(--primary);
  box-shadow: inset 0 0 0 2px var(--primary);
}
.money-calendar-day {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 800;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 2px;
  transition: all 0.2s;
}
.money-calendar-tasks {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.money-calendar-task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 0 rgba(114, 93, 66, 0.08);
}
.money-calendar-task:hover {
  transform: scale(1.02);
  box-shadow: 0 3px 8px rgba(114, 93, 66, 0.15);
}
.money-calendar-task.status-pending {
  background: #fff8e0;
  color: #7a6528;
}
.money-calendar-task.status-done {
  background: #e8f5e8;
  color: #3a6b3a;
}
.money-calendar-task.status-paused {
  background: #fff0e8;
  color: #8a4a2a;
}
.money-calendar-task-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}
.money-calendar-task-amount {
  font-weight: 800;
  flex-shrink: 0;
  opacity: 0.85;
}

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
