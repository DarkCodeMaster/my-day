<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
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
  Select,
  Tooltip,
  Loading,
  Table,
  Time,
  Divider,
  Footer,
  Cursor,
  Typewriter,
  Icon,
  Drawer,
  Wallet,
} from 'animal-island-vue';
import type { SelectOption, RadioOption } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { todayStr } from '@/utils/date';
import type { StudyItem, MoneyItem, WeightRecord } from '@/types';

const {
  activeTab,
  chartRange,
  weights,
  studyItems,
  moneyItems,
  todayLogs,
  isLoaded,
} = useMyDayStorage();

const welcomeTrigger = ref(0);
onMounted(() => {
  welcomeTrigger.value++;
  // 首次无数据时填充示例，避免空状态
  if (!weights.length) {
    weights.push(
      { date: '2026-07-08', weight: 68.5 },
      { date: '2026-07-09', weight: 68.2 },
      { date: '2026-07-10', weight: 67.9 },
      { date: '2026-07-11', weight: 67.8 },
      { date: '2026-07-12', weight: 67.5 },
      { date: '2026-07-13', weight: 67.3 },
      { date: '2026-07-14', weight: 67.0 }
    );
  }
  if (!studyItems.length) {
    studyItems.push(
      { id: 1, type: 'video', name: 'Vue 3 进阶实战', image: '#19c8b9', abbr: 'Vue', progress: 75, link: 'example.com/vue', lesson: 12, totalLesson: 16 },
      { id: 2, type: 'book', name: '原子习惯', image: '#f8a6b2', abbr: '原子', progress: 45, chapter: 4, totalChapter: 10, page: 128, totalPage: 280 },
      { id: 3, type: 'skill', name: '吉他指弹', image: '#82d5bb', abbr: '吉他', progress: 30, notes: '练习 C 大调音阶' },
      { id: 4, type: 'video', name: 'TypeScript 全栈', image: '#889df0', abbr: 'TS', progress: 20, link: 'example.com/ts', lesson: 3, totalLesson: 15 },
      { id: 5, type: 'book', name: '深度工作', image: '#f7cd67', abbr: '深度', progress: 60, chapter: 2, totalChapter: 8, page: 85, totalPage: 260 }
    );
  }
  if (!moneyItems.length) {
    moneyItems.push(
      { id: 1, desc: '帮朋友做网站首页', amount: 1200, deadline: '2026-07-20', progress: 60, status: 'pending' },
      { id: 2, desc: '二手书出售', amount: 180, deadline: '2026-07-15', progress: 100, status: 'done' },
      { id: 3, desc: '设计一套表情包', amount: 800, deadline: '2026-07-28', progress: 0, status: 'paused' },
      { id: 4, desc: '接单翻译文档', amount: 450, deadline: '2026-07-18', progress: 30, status: 'pending' }
    );
  }
  if (!todayLogs.length) {
    todayLogs.push(
      { time: '07:30', category: 'health', content: '晨间体重 67.0 kg，比昨天 -0.3 kg 🎉' },
      { time: '09:00', category: 'study', content: '完成 Vue 第 12 课：Composition API 深入' },
      { time: '12:00', category: 'money', content: '收到二手书转账 ¥180' },
      { time: '15:30', category: 'study', content: '阅读《原子习惯》第 4 章，进度 45%' },
      { time: '18:00', category: 'health', content: '晚餐记录：沙拉 + 鸡胸肉' }
    );
  }
});

/* ==================== Tabs ==================== */
const tabItems = [
  { key: 'health', label: '健康' },
  { key: 'study', label: '学习' },
  { key: 'money', label: '赚钱' },
  { key: 'today', label: '今日动态' },
];

/* ==================== Health ==================== */
const newWeightDate = ref(todayStr());
const newWeightValue = ref('');
const chartOptions: SelectOption[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: 'all', label: '全部' },
];
const currentMonth = ref(new Date());
const selectedDate = ref(todayStr());

const addWeight = () => {
  const val = parseFloat(newWeightValue.value);
  if (!newWeightDate.value || isNaN(val)) return;
  const idx = weights.findIndex((w: WeightRecord) => w.date === newWeightDate.value);
  if (idx > -1) weights[idx].weight = val;
  else weights.push({ date: newWeightDate.value, weight: val });
  newWeightValue.value = '';
  weights.sort((a: WeightRecord, b: WeightRecord) => a.date.localeCompare(b.date));
};

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      date: ds,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      weight: weights.find((w: WeightRecord) => w.date === ds)?.weight,
    });
  }
  return days;
});
const monthLabel = computed(() => `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`);
const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
};
const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
};
const selectDay = (day: any) => {
  if (!day.inMonth) return;
  selectedDate.value = day.date;
  newWeightDate.value = day.date;
};

const chartData = computed(() => {
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (chartRange.value === 'all') {
    const data = weights.filter((w: WeightRecord) => w.weight !== null).sort((a: WeightRecord, b: WeightRecord) => a.date.localeCompare(b.date));
    return data.map((d: WeightRecord) => ({ date: d.date, label: d.date.slice(5), weight: d.weight }));
  }
  const end = new Date();
  const days = chartRange.value === '7d' ? 7 : 30;
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const ds = fmt(d);
    const rec = weights.find((w: WeightRecord) => w.date === ds);
    arr.push({ date: ds, label: `${d.getMonth() + 1}/${d.getDate()}`, weight: rec ? rec.weight : null });
  }
  return arr;
});

const chartComputed = computed(() => {
  const data = chartData.value
    .filter((d: any) => d.weight !== null)
    .map((d: any) => ({ ...d, weight: d.weight as number }));
  if (!data.length) return null;
  const w = 600;
  const h = 240;
  const pad = { top: 20, right: 30, bottom: 30, left: 40 };
  const time = (s: string) => new Date(s).getTime();
  let minX: number, maxX: number;
  if (chartRange.value === 'all') {
    const times = data.map((d: any) => time(d.date));
    minX = Math.min(...times);
    maxX = Math.max(...times);
  } else {
    const all = chartData.value;
    minX = time(all[0].date);
    maxX = time(all[all.length - 1].date);
  }
  const min = Math.min(...data.map((d: any) => d.weight)) - 0.5;
  const max = Math.max(...data.map((d: any) => d.weight)) + 0.5;
  const x = (dateStr: string) => pad.left + (w - pad.left - pad.right) * (maxX === minX ? 0.5 : (time(dateStr) - minX) / (maxX - minX));
  const y = (v: number) => pad.top + (h - pad.top - pad.bottom) * (1 - (v - min) / (max - min || 1));
  const points = data.map((d: any) => `${x(d.date)},${y(d.weight)}`).join(' ');
  const areaPoints = `${x(data[0].date)},${h - pad.bottom} ${points} ${x(data[data.length - 1].date)},${h - pad.bottom}`;
  const selectedX = selectedDate.value ? x(selectedDate.value) : null;
  return { w, h, pad, data, points, areaPoints, x, y, min, max, selectedX };
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
  { title: '类型', dataIndex: 'type', width: '80px', align: 'center' },
  { title: '进度', dataIndex: 'progress', width: '140px' },
  { title: '详情', dataIndex: 'detail', width: '220px' },
  { title: '操作', dataIndex: 'action', width: '80px', align: 'center' },
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
  editStudyModalOpen.value = false;
};

/* ==================== Money ==================== */
const moneyCols: any[] = [
  { title: '业务描述', dataIndex: 'desc' },
  { title: '金额', dataIndex: 'amount', width: '100px', align: 'right' },
  { title: '截止', dataIndex: 'deadline', width: '110px' },
  { title: '进度', dataIndex: 'progress', width: '140px' },
  { title: '状态', dataIndex: 'status', width: '90px' },
  { title: '操作', dataIndex: 'action', width: '110px', align: 'center' },
];
const moneyStatusOptions: SelectOption[] = [
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
});
const resetMoneyForm = () => {
  moneyForm.desc = '';
  moneyForm.amount = '';
  moneyForm.deadline = '';
  moneyForm.status = 'pending';
  moneyForm.progress = '';
};
const moneyModalOpen = ref(false);
const openMoneyModal = () => {
  resetMoneyForm();
  moneyModalOpen.value = true;
};
const submitMoney = () => {
  if (!moneyForm.desc || !moneyForm.amount) return;
  moneyItems.push({
    id: Date.now(),
    desc: moneyForm.desc,
    amount: Number(moneyForm.amount),
    deadline: moneyForm.deadline || todayStr(),
    progress: Math.min(100, Math.max(0, Number(moneyForm.progress) || 0)),
    status: moneyForm.status as MoneyItem['status'],
  });
  resetMoneyForm();
  moneyModalOpen.value = false;
};
const editMoneyModalOpen = ref(false);
const editMoneyTarget = ref<MoneyItem | null>(null);
const editMoneyForm = reactive({
  desc: '',
  amount: '',
  deadline: '',
  status: 'pending',
  progress: '',
});
const openEditMoney = (record: MoneyItem) => {
  editMoneyTarget.value = record;
  editMoneyForm.desc = record.desc;
  editMoneyForm.amount = String(record.amount);
  editMoneyForm.deadline = record.deadline;
  editMoneyForm.status = record.status;
  editMoneyForm.progress = String(record.progress);
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
  if (record.status === 'done') record.progress = 100;
  editMoneyModalOpen.value = false;
};
const totalIncome = computed(() => moneyItems.filter((m: MoneyItem) => m.status === 'done').reduce((s, m) => s + m.amount, 0));
const pendingIncome = computed(() =>
  moneyItems.filter((m: MoneyItem) => m.status === 'pending').reduce((s, m) => s + m.amount * (m.progress / 100), 0)
);

/* ==================== Today ==================== */
const categoryName = (c: 'health' | 'study' | 'money') => ({ health: '健康', study: '学习', money: '赚钱' }[c]);

/* ==================== Delete Modal ==================== */
const deleteModalOpen = ref(false);
const deleteTarget = ref<{ type: 'study' | 'money'; id: number } | null>(null);
const openDelete = (type: 'study' | 'money', id: number) => {
  deleteTarget.value = { type, id };
  deleteModalOpen.value = true;
};
const confirmDelete = () => {
  if (!deleteTarget.value) return;
  const { type, id } = deleteTarget.value;
  if (type === 'study') {
    const idx = studyItems.findIndex((s: StudyItem) => s.id === id);
    if (idx > -1) studyItems.splice(idx, 1);
  } else {
    const idx = moneyItems.findIndex((m: MoneyItem) => m.id === id);
    if (idx > -1) moneyItems.splice(idx, 1);
  }
  deleteModalOpen.value = false;
};

/* ==================== Detail Drawer ==================== */
const detailDrawerOpen = ref(false);
const detailRecord = ref<StudyItem | null>(null);
const openDetail = (record: StudyItem) => {
  detailRecord.value = record;
  detailDrawerOpen.value = true;
};
const normalizeLink = (url?: string) => {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

/* ==================== Helpers ==================== */
const studyTypeText = (type: string) => (type === 'video' ? '视频' : type === 'book' ? '书籍' : '技能');
const statusText = (status: string) => (status === 'done' ? '完成' : status === 'pending' ? '未完成' : '暂停');
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
            <!-- 健康 -->
            <template #health>
              <div class="health-stack">
                <div>
                  <div class="panel-title">
                    <span class="dot"></span>
                    <Title color="app-green" size="middle">体重日历</Title>
                  </div>
                  <Card>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                      <Button type="default" size="small" @click="prevMonth">‹</Button>
                      <span style="font-weight:800;color:var(--text);">{{ monthLabel }}</span>
                      <Button type="default" size="small" @click="nextMonth">›</Button>
                    </div>
                    <div class="calendar-grid">
                      <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="calendar-day-name">{{ d }}</div>
                      <Tooltip v-for="(day, i) in calendarDays" :key="i" variant="island" placement="top">
                        <template #title>
                          {{ day.date }}<br />
                          体重：{{ day.weight ?? '未记录' }} kg
                        </template>
                        <div
                          class="calendar-cell"
                          :class="{ 'is-today': day.date === selectedDate, 'has-weight': !!day.weight, 'text-disabled': !day.inMonth }"
                          @click="selectDay(day)"
                        >
                          <span>{{ day.day }}</span>
                          <span v-if="day.weight" class="weight">{{ day.weight }}</span>
                        </div>
                      </Tooltip>
                    </div>
                    <div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                      <Input v-model="newWeightDate" size="small" style="width:130px" />
                      <Input v-model="newWeightValue" size="small" placeholder="体重 kg" style="width:100px" />
                      <Button type="primary" size="small" @click="addWeight">记录</Button>
                    </div>
                  </Card>
                </div>

                <div>
                  <div class="panel-title">
                    <span class="dot"></span>
                    <Title color="app-teal" size="middle">趋势曲线</Title>
                  </div>
                  <Card>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                      <span style="font-weight:700;color:var(--text);">体重变化趋势</span>
                      <Select v-model="chartRange" :options="chartOptions" />
                    </div>
                    <div class="chart-wrap">
                      <svg v-if="chartComputed" class="chart-svg" :viewBox="`0 0 ${chartComputed.w} ${chartComputed.h}`">
                        <line class="chart-grid" :x1="chartComputed.pad.left" :y1="chartComputed.pad.top" :x2="chartComputed.pad.left" :y2="chartComputed.h - chartComputed.pad.bottom" />
                        <line class="chart-grid" :x1="chartComputed.pad.left" :y1="chartComputed.h - chartComputed.pad.bottom" :x2="chartComputed.w - chartComputed.pad.right" :y2="chartComputed.h - chartComputed.pad.bottom" />
                        <line v-if="chartComputed.selectedX" class="chart-selected-line" :x1="chartComputed.selectedX" :y1="chartComputed.pad.top" :x2="chartComputed.selectedX" :y2="chartComputed.h - chartComputed.pad.bottom" />
                        <polyline class="chart-area" :points="chartComputed.areaPoints" />
                        <polyline class="chart-line" :points="chartComputed.points" />
                        <g v-for="(d, i) in chartComputed.data" :key="i">
                          <circle class="chart-dot" :cx="chartComputed.x(d.date)" :cy="chartComputed.y(d.weight)" r="5" />
                          <text class="chart-text" :x="chartComputed.x(d.date)" :y="chartComputed.h - 10" text-anchor="middle">{{ d.label }}</text>
                          <text class="chart-text" :x="chartComputed.x(d.date)" :y="chartComputed.y(d.weight) - 10" text-anchor="middle">{{ d.weight }}</text>
                        </g>
                      </svg>
                      <div v-else class="animal-table-empty" style="padding:40px 0;">暂无数据</div>
                    </div>
                  </Card>
                </div>
              </div>
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
                    <Radio v-model="studyType" :options="studyRadio" size="small" direction="horizontal" />
                    <Button type="primary" size="middle" @click="openStudyModal">添加学习项</Button>
                  </div>
                </div>
                <Table :columns="studyCols" :data-source="filteredStudy" row-key="id" :striped="true">
                  <template #cell-name="{ record }">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div
                        class="cell-thumb"
                        :style="{ background: record.image, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }"
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
                    <div v-if="record.type === 'video'" class="cell-meta detail-clickable" @click="openDetail(record)">第 {{ record.lesson }} / {{ record.totalLesson }} 课</div>
                    <div v-else-if="record.type === 'book'" class="cell-meta detail-clickable" @click="openDetail(record)">第 {{ record.chapter }} / {{ record.totalChapter }} 章 · 第 {{ record.page }} / {{ record.totalPage }} 页</div>
                    <div v-else class="cell-meta detail-clickable" @click="openDetail(record)">{{ record.notes }}</div>
                  </template>
                  <template #cell-action="{ record }">
                    <div style="display:flex;gap:6px;justify-content:center;">
                      <Button type="text" size="small" @click="openEditStudy(record)">编辑</Button>
                      <Button type="text" size="small" @click="openDelete('study', record.id)">删除</Button>
                    </div>
                  </template>
                </Table>
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
                  <Title color="app-yellow" size="middle">赚钱任务表</Title>
                  <Button type="primary" size="middle" @click="openMoneyModal">添加任务</Button>
                </div>
                <Table :columns="moneyCols" :data-source="moneyItems" row-key="id" :striped="true">
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
                    <div style="display:flex;gap:6px;justify-content:center;">
                      <Button type="text" size="small" @click="openEditMoney(record)">编辑</Button>
                      <Button type="text" size="small" @click="openDelete('money', record.id)">删除</Button>
                    </div>
                  </template>
                </Table>
              </div>
            </template>

            <!-- 今日动态 -->
            <template #today>
              <div class="two-col">
                <div>
                  <div class="panel-title">
                    <span class="dot"></span>
                    <Title color="app-pink" size="middle">今日时间线</Title>
                  </div>
                  <Card>
                    <div class="timeline">
                      <div v-for="(log, i) in todayLogs" :key="i" class="timeline-item">
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
                    <p style="margin:0;line-height:1.7;">
                      今天体重 <b>{{ weights[weights.length - 1]?.weight }} kg</b>，学习
                      <b>{{ filteredStudy.length }}</b> 项，赚钱任务完成
                      <b>{{ moneyItems.filter((m: MoneyItem) => m.status === 'done').length }}</b> 个。继续加油 🌿
                    </p>
                  </Card>
                </div>
              </div>
            </template>
          </Tabs>
        </div>

        <div class="help-section">
          <Collapse question="这个页面怎么用？">
            <ul style="margin:0;padding-left:18px;line-height:1.8;">
              <li><b>健康</b>：记录每日体重，查看趋势曲线。</li>
              <li><b>学习</b>：添加学习项目并跟踪进度。</li>
              <li><b>赚钱</b>：管理任务和收入状态。</li>
              <li><b>今日动态</b>：回顾一天的时间线。</li>
            </ul>
          </Collapse>
        </div>

        <Divider type="wave-yellow" />
        <Footer type="sea" />
      </div>

      <Modal
        v-model:open="deleteModalOpen"
        title="确认删除"
        :typewriter="false"
        @ok="confirmDelete"
      >
        确定要删除这条记录吗？动森的世界里也要学会断舍离哦~
      </Modal>

      <Modal
        v-model:open="studyModalOpen"
        title="添加学习项"
        :typewriter="false"
        :show-footer="true"
      >
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-field">
            <label class="form-field-label">类型</label>
            <Radio v-model="studyForm.type" :options="studyTypeOptions" direction="horizontal" size="small" />
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
              <div style="display:flex;align-items:center;gap:6px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:40px;padding:0 14px;">
                <span style="font-weight:800;color:var(--text);">{{ computedVideoProgress }}</span>
                <span style="font-size:12px;color:var(--text-secondary);">%</span>
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
              <div style="display:flex;align-items:center;gap:6px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:40px;padding:0 14px;">
                <span style="font-weight:800;color:var(--text);">{{ computedBookProgress }}</span>
                <span style="font-size:12px;color:var(--text-secondary);">%</span>
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
              <div style="display:flex;align-items:center;gap:6px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:40px;padding:0 14px;">
                <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editVideoLesson)||0) / (Number(editVideoTotalLesson)||1) * 100)) }}</span>
                <span style="font-size:12px;color:var(--text-secondary);">%</span>
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
              <div style="display:flex;align-items:center;gap:6px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:40px;padding:0 14px;">
                <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editBookPage)||0) / (Number(editBookTotalPage)||1) * 100)) }}</span>
                <span style="font-size:12px;color:var(--text-secondary);">%</span>
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
            <Input v-model="moneyForm.deadline" placeholder="截止日期" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">状态</label>
            <Select v-model="moneyForm.status" :options="moneyStatusOptions" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="moneyForm.progress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
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
            <Input v-model="editMoneyForm.deadline" placeholder="截止日期" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">状态</label>
            <Select v-model="editMoneyForm.status" :options="moneyStatusOptions" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="editMoneyForm.progress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
          </div>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <Button type="primary" size="middle" @click="editMoneyModalOpen = false">取消</Button>
            <Button type="primary" size="middle" @click="submitEditMoney">保存</Button>
          </div>
        </template>
      </Modal>

      <Drawer
        :open="detailDrawerOpen"
        title="学习详情"
        placement="bottom"
        height="360"
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
    </div>
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
  flex-direction: row;
  gap: 20px;
}
.health-stack > div {
  flex: 1 1 0;
  min-width: 0;
}
.health-stack .chart-wrap {
  height: 300px;
}
@media (max-width: 900px) {
  .health-stack {
    flex-direction: column;
  }
  .health-stack > div {
    flex: 1 1 auto;
  }
}

.detail-clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}
.detail-clickable:hover {
  opacity: 0.75;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}
.drawer-detail {
  padding: 8px 4px;
}
.drawer-detail-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.drawer-detail-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
}
.drawer-detail-section {
  background: var(--bg-content);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 14px;
  color: var(--text);
  line-height: 1.7;
}
.drawer-detail-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
}
.drawer-detail-link {
  color: #2b6cb0;
  font-weight: 700;
  text-decoration: underline;
  word-break: break-all;
}
.drawer-detail-link:hover {
  color: #1a4d8a;
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
