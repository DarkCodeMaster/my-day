<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button, Modal, Card } from 'animal-island-vue';
import { todayStr, formatDateStr } from '@/utils/date';

const props = defineProps<{
  open: boolean;
  modelValue: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void;
  (e: 'update:modelValue', v: string): void;
}>();

const currentMonth = ref(new Date());
const selectedDate = computed(() => props.modelValue || todayStr());

watch(
  () => props.open,
  (v) => {
    if (v) {
      currentMonth.value = props.modelValue ? new Date(props.modelValue) : new Date();
    }
  }
);

const monthLabel = computed(() =>
  `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`
);

const prevMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
};

const nextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
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
      isSelected: ds === selectedDate.value,
      isToday: ds === todayStr(),
    });
  }
  return days;
});

const selectDay = (day: any) => {
  emit('update:modelValue', day.date);
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    :title="title || '选择日期'"
    :typewriter="false"
    :show-footer="false"
    :width="520"
    @update:open="(v) => emit('update:open', v)"
  >
    <Card style="width:100%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <Button type="default" size="middle" style="font-size:30px" @click="prevMonth">‹</Button>
        <span style="font-weight:800;color:var(--text);">{{ monthLabel }}</span>
        <Button type="default" size="middle" style="font-size:30px" @click="nextMonth">›</Button>
      </div>
      <div class="calendar-grid">
        <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="calendar-day-name">{{ d }}</div>
        <div
          v-for="(day, i) in calendarDays"
          :key="i"
          class="calendar-cell date-picker-cell"
          :class="{
            'text-disabled': !day.inMonth,
            'is-today': day.isToday,
            'is-selected': day.isSelected,
          }"
          @click="selectDay(day)"
        >
          <span>{{ day.day }}</span>
        </div>
      </div>
    </Card>
  </Modal>
</template>

<style scoped>
.date-picker-cell {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.date-picker-cell.is-selected {
  background: var(--primary-bg);
  border-color: var(--primary);
}
</style>
