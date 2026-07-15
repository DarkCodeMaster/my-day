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
  Notification,
  NotificationContainer,
} from 'animal-island-vue';
import type { SelectOption, RadioOption } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { todayStr, formatDateStr } from '@/utils/date';
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
});

/* ==================== Tabs ==================== */
const tabItems = [
  { key: 'health', label: '健康' },
  { key: 'study', label: '学习' },
  { key: 'money', label: '赚钱' },
  { key: 'today', label: '今日动态' },
  { key: 'import-export', label: '导入导出' },
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
  const existed = idx > -1;
  if (existed) weights[idx].weight = val;
  else weights.push({ date: newWeightDate.value, weight: val });
  newWeightValue.value = '';
  weights.sort((a: WeightRecord, b: WeightRecord) => a.date.localeCompare(b.date));

  const isToday = newWeightDate.value === todayStr();
  const prev = weights
    .filter((w: WeightRecord) => w.date < todayStr())
    .sort((a: WeightRecord, b: WeightRecord) => b.date.localeCompare(a.date))[0];
  let content = `${existed ? '更新' : '记录'}体重 ${val} kg`;
  if (!isToday) {
    content += `（${newWeightDate.value}）`;
  }
  if (isToday && prev) {
    const diff = Number((val - prev.weight).toFixed(1));
    content += `，比昨天 ${diff > 0 ? '+' : ''}${diff} kg ${diff < 0 ? '🎉' : ''}`;
  }
  pushTodayLog('health', content);
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
    const ds = formatDateStr(d);
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
  const fmt = (d: Date) => formatDateStr(d);
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

const moneyDeadlineError = ref('');
const editMoneyDeadlineError = ref('');

const isValidDateYYYYMMDD = (s: string) => {
  if (!s) return false;
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10);
    const d = parseInt(s.slice(6, 8), 10);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }
  return false;
};

const normalizeDate = (s: string) => {
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
};

const moneyModalOpen = ref(false);
const openMoneyModal = () => {
  resetMoneyForm();
  moneyDeadlineError.value = '';
  moneyModalOpen.value = true;
};
const submitMoney = () => {
  if (!moneyForm.desc || !moneyForm.amount) return;
  moneyDeadlineError.value = '';
  const deadline = moneyForm.deadline.trim();
  if (deadline && !isValidDateYYYYMMDD(deadline)) {
    moneyDeadlineError.value = '日期格式无效，请使用 YYYYMMDD 或 YYYY-MM-DD';
    return;
  }
  const item: MoneyItem = {
    id: Date.now(),
    desc: moneyForm.desc,
    amount: Number(moneyForm.amount),
    deadline: normalizeDate(deadline) || todayStr(),
    progress: Math.min(100, Math.max(0, Number(moneyForm.progress) || 0)),
    status: moneyForm.status as MoneyItem['status'],
  };
  moneyItems.push(item);
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
});
const openEditMoney = (record: MoneyItem) => {
  editMoneyTarget.value = record;
  editMoneyForm.desc = record.desc;
  editMoneyForm.amount = String(record.amount);
  editMoneyForm.deadline = record.deadline;
  editMoneyForm.status = record.status;
  editMoneyForm.progress = String(record.progress);
  editMoneyDeadlineError.value = '';
  editMoneyModalOpen.value = true;
};
const submitEditMoney = () => {
  if (!editMoneyTarget.value) return;
  editMoneyDeadlineError.value = '';
  const deadline = editMoneyForm.deadline.trim();
  if (deadline && !isValidDateYYYYMMDD(deadline)) {
    editMoneyDeadlineError.value = '日期格式无效，请使用 YYYYMMDD 或 YYYY-MM-DD';
    return;
  }
  const record = editMoneyTarget.value;
  record.desc = editMoneyForm.desc.trim();
  record.amount = Number(editMoneyForm.amount) || 0;
  record.deadline = normalizeDate(deadline) || todayStr();
  record.status = editMoneyForm.status as MoneyItem['status'];
  record.progress = Math.min(100, Math.max(0, Number(editMoneyForm.progress) || 0));
  if (record.status === 'done') record.progress = 100;
  pushTodayLog('money', `更新赚钱任务 ${record.desc}，${statusText(record.status)}，进度 ${record.progress}%`);
  editMoneyModalOpen.value = false;
};
const totalIncome = computed(() => moneyItems.reduce((s, m) => s + m.amount, 0));
const pendingIncome = computed(() =>
  moneyItems.filter((m: MoneyItem) => m.status !== 'done').reduce((s, m) => s + m.amount, 0)
);

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

/* ==================== Import / Export ==================== */
const exportJson = ref('');
const importJson = ref('');
const importError = ref('');
const importFileInput = ref<HTMLInputElement | null>(null);
const importConfirmModalOpen = ref(false);

const generateExport = () => {
  const raw = localStorage.getItem('myday') || '{}';
  try {
    const data = JSON.parse(raw);
    exportJson.value = JSON.stringify(data, null, 2);
  } catch {
    exportJson.value = raw;
  }
};

const copyExport = async () => {
  if (!exportJson.value) generateExport();
  try {
    await navigator.clipboard.writeText(exportJson.value);
    Notification.success('已复制到剪贴板');
  } catch {
    Notification.error('复制失败，请手动复制');
  }
};

const downloadExport = () => {
  if (!exportJson.value) generateExport();
  const blob = new Blob([exportJson.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myday-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const uploadImportFile = () => {
  importFileInput.value?.click();
};

const handleImportFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    importJson.value = String(reader.result || '');
    importError.value = '';
  };
  reader.onerror = () => {
    importError.value = '文件读取失败';
  };
  reader.readAsText(file);
  target.value = '';
};

const validateImportData = (data: any): { valid: false; error: string } | { valid: true; data: any } => {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: '数据必须是 JSON 对象' };
  }
  if (!Array.isArray(data.weights)) return { valid: false, error: '缺少 weights 数组' };
  if (!Array.isArray(data.studyItems)) return { valid: false, error: '缺少 studyItems 数组' };
  if (!Array.isArray(data.moneyItems)) return { valid: false, error: '缺少 moneyItems 数组' };
  if (data.todayLogs != null && !Array.isArray(data.todayLogs)) {
    return { valid: false, error: 'todayLogs 必须是数组' };
  }
  return { valid: true, data };
};

const confirmImport = () => {
  importError.value = '';
  if (!importJson.value.trim()) {
    importError.value = '请输入或上传 JSON 数据';
    return;
  }
  try {
    const parsed = JSON.parse(importJson.value);
    const result = validateImportData(parsed);
    if (!result.valid) {
      importError.value = result.error;
      return;
    }
    importConfirmModalOpen.value = true;
  } catch (e) {
    importError.value = `JSON 解析失败：${e instanceof Error ? e.message : String(e)}`;
  }
};

const executeImport = () => {
  try {
    const parsed = JSON.parse(importJson.value);
    const result = validateImportData(parsed);
    if (!result.valid) return;

    weights.splice(0, weights.length, ...(parsed.weights || []));
    studyItems.splice(0, studyItems.length, ...(parsed.studyItems || []));
    moneyItems.splice(0, moneyItems.length, ...(parsed.moneyItems || []));

    const today = todayStr();
    const logs = (parsed.todayLogs || [])
      .map((log: any) => (typeof log === 'object' && log ? { ...log, date: log.date || today } : null))
      .filter((log: any) => log && log.date === today);
    todayLogs.splice(0, todayLogs.length, ...logs);

    importJson.value = '';
    importConfirmModalOpen.value = false;
    Notification.success('导入成功');
  } catch (e) {
    importError.value = `导入失败：${e instanceof Error ? e.message : String(e)}`;
  }
};

const clearAllModalOpen = ref(false);
const executeClearAll = () => {
  weights.splice(0, weights.length);
  studyItems.splice(0, studyItems.length);
  moneyItems.splice(0, moneyItems.length);
  todayLogs.splice(0, todayLogs.length);
  clearAllModalOpen.value = false;
  Notification.success('已清空所有数据');
};

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
    if (idx > -1) {
      const name = studyItems[idx].name;
      studyItems.splice(idx, 1);
      pushTodayLog('study', `删除学习项 ${name}`);
    }
  } else {
    const idx = moneyItems.findIndex((m: MoneyItem) => m.id === id);
    if (idx > -1) {
      const desc = moneyItems[idx].desc;
      moneyItems.splice(idx, 1);
      pushTodayLog('money', `删除赚钱任务 ${desc}`);
    }
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

const nowTimeStr = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
const pushTodayLog = (category: 'health' | 'study' | 'money', content: string) => {
  todayLogs.push({ date: todayStr(), time: nowTimeStr(), category, content });
};
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
            <!-- 健康 -->
            <template #health>
              <div class="health-stack">
                <div>
                  <div class="panel-title">
                    <Title color="app-green" size="middle">体重日历</Title>
                  </div>
                  <Card class="health-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                      <Button type="default" size="middle" style="font-size:30px" @click="prevMonth">‹</Button>
                      <span style="font-weight:800;color:var(--text);">{{ monthLabel }}</span>
                      <Button type="default" size="middle" style="font-size:30px" @click="nextMonth">›</Button>
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
                      <Input v-model="newWeightDate" size="middle" style="width:150px" />
                      <Input v-model="newWeightValue" size="middle" placeholder="体重 kg" style="width:120px" />
                      <Button type="primary" size="middle" @click="addWeight">记录</Button>
                    </div>
                  </Card>
                </div>

                <div>
                  <div class="panel-title">
                    <Title color="app-teal" size="middle">趋势曲线</Title>
                  </div>
                  <Card class="health-card">
                    <div style="display:flex;justify-content:flex-start;align-items:center;gap:12px;margin-bottom:12px;">
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
                    <Radio v-model="studyType" :options="studyRadio" size="middle" direction="horizontal" />
                    <Button type="primary" size="middle" @click="openStudyModal">添加学习项</Button>
                  </div>
                </div>
                <Table :columns="studyCols" :data-source="filteredStudy" row-key="id" :striped="true">
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
                    <div v-if="record.type === 'video'" class="cell-meta detail-clickable" @click="openDetail(record)">第 {{ record.lesson }} / {{ record.totalLesson }} 课</div>
                    <div v-else-if="record.type === 'book'" class="cell-meta detail-clickable" @click="openDetail(record)">第 {{ record.chapter }} / {{ record.totalChapter }} 章 · 第 {{ record.page }} / {{ record.totalPage }} 页</div>
                    <div v-else class="cell-meta detail-clickable" @click="openDetail(record)">{{ record.notes }}</div>
                  </template>
                  <template #cell-action="{ record }">
                    <div style="display:flex;gap:8px;justify-content:center;">
                      <Button type="text" size="middle" @click="openEditStudy(record)">编辑</Button>
                      <Button type="text" size="middle" @click="openDelete('study', record.id)">删除</Button>
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
                    <div style="display:flex;gap:8px;justify-content:center;">
                      <Button type="text" size="middle" @click="openEditMoney(record)">编辑</Button>
                      <Button type="text" size="middle" @click="openDelete('money', record.id)">删除</Button>
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

            <!-- 导入导出 -->
            <template #import-export>
              <div class="section">
                <div class="section-head">
                  <Title color="app-green" size="middle">数据备份与恢复</Title>
                </div>

                <Card color="app-teal">
                  <div class="form-field">
                    <label class="form-field-label">导出数据</label>
                    <textarea
                      v-model="exportJson"
                      class="import-textarea"
                      readonly
                      rows="8"
                      placeholder="点击导出后 JSON 会显示在这里"
                    ></textarea>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
                      <Button type="primary" size="middle" @click="generateExport">生成 JSON</Button>
                      <Button type="primary" size="middle" @click="copyExport">复制到剪贴板</Button>
                      <Button type="primary" size="middle" @click="downloadExport">下载文件</Button>
                    </div>
                  </div>
                </Card>

                <Card color="app-yellow" style="margin-top:20px;">
                  <div class="form-field">
                    <label class="form-field-label">导入数据</label>
                    <textarea
                      v-model="importJson"
                      class="import-textarea"
                      rows="8"
                      placeholder="粘贴 JSON 或点击上传文件"
                    ></textarea>
                    <div v-if="importError" class="form-field-error">{{ importError }}</div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
                      <Button type="primary" size="middle" @click="uploadImportFile">上传 JSON 文件</Button>
                      <Button type="primary" size="middle" @click="confirmImport">导入并覆盖</Button>
                    </div>
                    <input
                      ref="importFileInput"
                      type="file"
                      accept=".json,application/json"
                      style="display:none"
                      @change="handleImportFile"
                    />
                    <p style="margin:10px 0 0;color:var(--text-secondary);font-size:13px;">
                      导入会覆盖当前所有数据，建议先导出备份。
                    </p>
                  </div>
                </Card>

                <Card color="app-red" style="margin-top:20px;">
                  <div class="form-field">
                    <label class="form-field-label">清除所有数据</label>
                    <p style="margin:0 0 10px;color:var(--text);font-size:14px;line-height:1.6;">
                      清空体重、学习、赚钱和时间线记录。此操作不可恢复，请先导出备份。
                    </p>
                    <Button type="primary" size="middle" @click="clearAllModalOpen = true">清空全部数据</Button>
                  </div>
                </Card>
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
              <li><b>导入导出</b>：备份和恢复本地数据。</li>
            </ul>
          </Collapse>
        </div>

        <Divider type="wave-yellow" />
        <Footer type="tree" />
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
        v-model:open="importConfirmModalOpen"
        title="确认导入"
        :typewriter="false"
        @ok="executeImport"
      >
        导入会覆盖当前所有数据，确定要继续吗？建议先导出备份哦~
      </Modal>

      <Modal
        v-model:open="clearAllModalOpen"
        title="确认清空"
        :typewriter="false"
        @ok="executeClearAll"
      >
        确定要清空所有数据吗？此操作不可恢复，建议先导出备份哦~
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
            <Input v-model="moneyForm.deadline" placeholder="YYYYMMDD 或 YYYY-MM-DD" style="width:100%;" />
            <div v-if="moneyDeadlineError" class="form-field-error">{{ moneyDeadlineError }}</div>
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
            <Input v-model="editMoneyForm.deadline" placeholder="YYYYMMDD 或 YYYY-MM-DD" style="width:100%;" />
            <div v-if="editMoneyDeadlineError" class="form-field-error">{{ editMoneyDeadlineError }}</div>
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
    </div>
    <NotificationContainer />
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
  gap: 8px;
}
.form-field-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
}
.form-field-error {
  font-size: 12px;
  color: var(--error);
  font-weight: 700;
  margin-top: 2px;
}
.drawer-detail {
  padding: 10px 6px;
}
.drawer-detail-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.drawer-detail-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
}
.drawer-detail-section {
  background: var(--bg-content);
  border: 2px solid var(--border);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 16px;
  color: var(--text);
  line-height: 1.8;
}
.drawer-detail-label {
  font-size: 13px;
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
