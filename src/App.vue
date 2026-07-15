<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Button,
  Input,
  Radio,
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
  Phone,
  Cursor,
  Typewriter,
  Icon,
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
      { id: 1, type: 'video', name: 'Vue 3 进阶实战', image: '#19c8b9', abbr: 'Vue', progress: 75, link: 'example.com/vue', lesson: 12 },
      { id: 2, type: 'book', name: '原子习惯', image: '#f8a6b2', abbr: '原子', progress: 45, chapter: 4, page: 128 },
      { id: 3, type: 'skill', name: '吉他指弹', image: '#82d5bb', abbr: '吉他', progress: 30, notes: '练习 C 大调音阶' },
      { id: 4, type: 'video', name: 'TypeScript 全栈', image: '#889df0', abbr: 'TS', progress: 20, link: 'example.com/ts', lesson: 3 },
      { id: 5, type: 'book', name: '深度工作', image: '#f7cd67', abbr: '深度', progress: 60, chapter: 2, page: 85 }
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
const studyRadio: RadioOption[] = [
  { label: '全部', value: 'all' },
  { label: '视频', value: 'video' },
  { label: '书籍', value: 'book' },
  { label: '技能', value: 'skill' },
];
const studyCols: any[] = [
  { title: '项目', dataIndex: 'name' },
  { title: '类型', dataIndex: 'type', width: '80px' },
  { title: '进度', dataIndex: 'progress', width: '140px' },
  { title: '详情', dataIndex: 'detail' },
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
  chapter: '',
  page: '',
  notes: '',
});
const resetStudyForm = () => {
  studyForm.type = 'video';
  studyForm.name = '';
  studyForm.progress = '';
  studyForm.link = '';
  studyForm.lesson = '';
  studyForm.chapter = '';
  studyForm.page = '';
  studyForm.notes = '';
};
const filteredStudy = computed(() =>
  studyType.value === 'all' ? studyItems : studyItems.filter((s: StudyItem) => s.type === studyType.value)
);
const addStudy = () => {
  const name = studyForm.name.trim();
  if (!name) return;
  const progress = Math.min(100, Math.max(0, Number(studyForm.progress) || 0));
  const item: StudyItem = {
    id: Date.now(),
    type: studyForm.type as StudyItem['type'],
    name,
    image: studyColorMap[studyForm.type],
    abbr: name.slice(0, 2),
    progress,
  };
  if (studyForm.type === 'video') {
    item.link = studyForm.link.trim();
    item.lesson = Number(studyForm.lesson) || 0;
  } else if (studyForm.type === 'book') {
    item.chapter = Number(studyForm.chapter) || 0;
    item.page = Number(studyForm.page) || 0;
  } else {
    item.notes = studyForm.notes.trim();
  }
  studyItems.push(item);
  resetStudyForm();
};

/* ==================== Money ==================== */
const moneyCols: any[] = [
  { title: '业务描述', dataIndex: 'desc' },
  { title: '金额', dataIndex: 'amount', width: '100px', align: 'right' },
  { title: '截止', dataIndex: 'deadline', width: '110px' },
  { title: '进度', dataIndex: 'progress', width: '140px' },
  { title: '状态', dataIndex: 'status', width: '100px' },
  { title: '操作', dataIndex: 'action', width: '80px', align: 'center' },
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
});
const addMoney = () => {
  if (!moneyForm.desc || !moneyForm.amount) return;
  moneyItems.push({
    id: Date.now(),
    desc: moneyForm.desc,
    amount: Number(moneyForm.amount),
    deadline: moneyForm.deadline || todayStr(),
    progress: 0,
    status: moneyForm.status as MoneyItem['status'],
  });
  moneyForm.desc = '';
  moneyForm.amount = '';
  moneyForm.deadline = '';
  moneyForm.status = 'pending';
};
const toggleMoneyStatus = (row: MoneyItem) => {
  const order: Record<MoneyItem['status'], MoneyItem['status']> = { pending: 'done', done: 'paused', paused: 'pending' };
  row.status = order[row.status];
  if (row.status === 'done') row.progress = 100;
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

/* ==================== Helpers ==================== */
const studyTypeText = (type: string) => (type === 'video' ? '视频' : type === 'book' ? '书籍' : '技能');
const statusText = (status: string) => (status === 'done' ? '完成' : status === 'pending' ? '未完成' : '暂停');
</script>

<template>
  <Cursor>
    <div class="page-root">
      <Loading :active="!isLoaded" style="position: absolute; inset: 0; z-index: 999;" />

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
              <div class="two-col">
                <div>
                  <div class="panel-title">
                    <span class="dot"></span>
                    <Title color="app-green" size="middle">体重日历</Title>
                  </div>
                  <Card color="app-green">
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
                  <Card color="app-teal">
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
                <div class="panel-title">
                  <span class="dot"></span>
                  <Title color="app-blue" size="middle">添加学习项</Title>
                </div>
                <Card color="app-blue">
                  <div style="display:flex;flex-direction:column;gap:14px;">
                    <div class="form-row">
                      <Radio v-model="studyForm.type" :options="studyTypeOptions" direction="horizontal" size="small" />
                    </div>
                    <div class="form-row">
                      <Input v-model="studyForm.name" placeholder="学习项目名称" style="flex:1;min-width:160px;" />
                      <Input v-model="studyForm.progress" placeholder="进度 0-100" style="width:120px;">
                        <template #suffix>%</template>
                      </Input>
                    </div>
                    <div v-if="studyForm.type === 'video'" class="form-row">
                      <Input v-model="studyForm.link" placeholder="课程链接" style="flex:1;min-width:160px;" />
                      <Input v-model="studyForm.lesson" placeholder="第几课" style="width:100px;" />
                    </div>
                    <div v-if="studyForm.type === 'book'" class="form-row">
                      <Input v-model="studyForm.chapter" placeholder="第几章" style="width:100px;" />
                      <Input v-model="studyForm.page" placeholder="第几页" style="width:100px;" />
                    </div>
                    <div v-if="studyForm.type === 'skill'" class="form-row">
                      <Input v-model="studyForm.notes" placeholder="备注，例如练习目标" style="flex:1;min-width:200px;" />
                    </div>
                    <div class="form-row" style="justify-content:flex-end;">
                      <Button type="primary" size="middle" @click="addStudy">添加学习项</Button>
                    </div>
                  </div>
                </Card>
              </div>

              <div class="section">
                <div class="section-head">
                  <Title color="app-blue" size="middle">学习进度表</Title>
                  <Radio v-model="studyType" :options="studyRadio" size="small" direction="horizontal" />
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
                    <div v-if="record.type === 'video'" class="cell-meta">课程链接：{{ record.link }} · 第 {{ record.lesson }} 课</div>
                    <div v-else-if="record.type === 'book'" class="cell-meta">第 {{ record.chapter }} 章 · 第 {{ record.page }} 页</div>
                    <div v-else class="cell-meta">{{ record.notes }}</div>
                  </template>
                  <template #cell-action="{ record }">
                    <Button type="text" size="small" danger @click="openDelete('study', record.id)">删除</Button>
                  </template>
                </Table>
              </div>
            </template>

            <!-- 赚钱 -->
            <template #money>
              <div class="summary-grid">
                <Card color="app-yellow">
                  <div class="summary-label">已到账收入</div>
                  <div class="summary-value">¥{{ totalIncome }}</div>
                </Card>
                <Card color="app-orange">
                  <div class="summary-label">进行中预估</div>
                  <div class="summary-value">¥{{ Math.round(pendingIncome) }}</div>
                </Card>
                <Card color="app-pink">
                  <div class="summary-label">总任务数</div>
                  <div class="summary-value">{{ moneyItems.length }}</div>
                </Card>
              </div>

              <div class="section">
                <div class="section-head">
                  <Title color="app-yellow" size="middle">赚钱任务表</Title>
                  <div class="form-row">
                    <Input v-model="moneyForm.desc" size="small" placeholder="业务描述" style="width:180px" />
                    <Input v-model="moneyForm.amount" size="small" placeholder="金额" style="width:90px" />
                    <Input v-model="moneyForm.deadline" size="small" placeholder="截止日期" style="width:120px" />
                    <Select v-model="moneyForm.status" :options="moneyStatusOptions" />
                    <Button type="primary" size="small" @click="addMoney">添加</Button>
                  </div>
                </div>
                <Table :columns="moneyCols" :data-source="moneyItems" row-key="id" :striped="true">
                  <template #cell-amount="{ record }">
                    <span style="font-weight:800;">¥{{ record.amount }}</span>
                  </template>
                  <template #cell-progress="{ record }">
                    <div style="font-weight:700;color:var(--text);">{{ record.progress }}%</div>
                    <div class="progress-bar">
                      <div class="progress-bar-fill" :style="{ width: record.progress + '%' }"></div>
                    </div>
                  </template>
                  <template #cell-status="{ record }">
                    <Tooltip title="点击切换状态" placement="top">
                      <span class="status-badge" :class="record.status" @click="toggleMoneyStatus(record)" style="cursor:pointer;">
                        {{ statusText(record.status) }}
                      </span>
                    </Tooltip>
                  </template>
                  <template #cell-action="{ record }">
                    <Button type="text" size="small" danger @click="openDelete('money', record.id)">删除</Button>
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
                  <Card color="app-pink">
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

                  <div class="phone-decoration">
                    <Phone />
                  </div>
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
</style>
