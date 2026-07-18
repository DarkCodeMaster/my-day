<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button, Input, Card, Title, Select, Switch, Tooltip } from 'animal-island-vue';
import type { SelectOption } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useTodayLog } from '@/composables/useTodayLog';
import { usePanelUiState } from '@/composables/usePanelUiState';
import { todayStr, formatDateStr } from '@/utils/date';
import type { WeightRecord } from '@/types';

const { weights, chartRange } = useMyDayStorage();
const { pushTodayLog } = useTodayLog();
const { currentMonth, selectedDate, newWeightDate, weightUnit } = usePanelUiState();

const newWeightValue = ref('');
const chartOptions: SelectOption[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: 'all', label: '全部' },
];

/* ---------- 单位切换（kg 存储，斤仅显示换算 1kg = 2斤） ---------- */
const isJin = computed({
  get: () => weightUnit.value === 'jin',
  set: (v: boolean) => { weightUnit.value = v ? 'jin' : 'kg'; },
});
const unitLabel = computed(() => (weightUnit.value === 'jin' ? '斤' : 'kg'));
const displayWeight = (kg: number) =>
  weightUnit.value === 'jin' ? Number((kg * 2).toFixed(1)) : kg;
// 切换单位时，把输入框里的数值同步换算，避免输入错位
watch(weightUnit, (unit) => {
  const v = parseFloat(newWeightValue.value);
  if (isNaN(v)) return;
  newWeightValue.value = String(unit === 'jin' ? Number((v * 2).toFixed(1)) : Number((v / 2).toFixed(2)));
});

const addWeight = () => {
  const input = parseFloat(newWeightValue.value);
  if (!newWeightDate.value || isNaN(input)) return;
  const val = weightUnit.value === 'jin' ? Number((input / 2).toFixed(2)) : input;
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
  let content = `${existed ? '更新' : '记录'}体重 ${displayWeight(val)} ${unitLabel.value}`;
  if (!isToday) {
    content += `（${newWeightDate.value}）`;
  }
  if (isToday && prev) {
    const diff = Number((displayWeight(val) - displayWeight(prev.weight)).toFixed(1));
    content += `，比昨天 ${diff > 0 ? '+' : ''}${diff} ${unitLabel.value} ${diff < 0 ? '🎉' : ''}`;
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
</script>

<template>
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
              体重：{{ day.weight == null ? '未记录' : displayWeight(day.weight) }} {{ day.weight == null ? 'kg' : unitLabel }}
            </template>
            <div
              class="calendar-cell"
              :class="{ 'is-today': day.date === selectedDate, 'has-weight': !!day.weight, 'text-disabled': !day.inMonth }"
              @click="selectDay(day)"
            >
              <span>{{ day.day }}</span>
              <span v-if="day.weight" class="weight">{{ displayWeight(day.weight) }}</span>
            </div>
          </Tooltip>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <Input v-model="newWeightDate" size="middle" style="width:150px" />
          <Input v-model="newWeightValue" size="middle" :placeholder="`体重 ${unitLabel}`" style="width:120px" />
          <Button type="primary" size="middle" @click="addWeight">记录</Button>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:flex-start;">
          <Switch v-model="isJin" class="unit-switch">
            <template #checked>斤</template>
            <template #unchecked>公斤</template>
          </Switch>
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
              <text class="chart-text" :x="chartComputed.x(d.date)" :y="chartComputed.y(d.weight) - 10" text-anchor="middle">{{ displayWeight(d.weight) }}</text>
            </g>
          </svg>
          <div v-else class="animal-table-empty" style="padding:40px 0;">暂无数据</div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
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
</style>
