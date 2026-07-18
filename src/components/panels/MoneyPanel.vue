<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue';
import { Button, Input, Card, Title, Divider, Modal, Table, Wallet, Notification } from 'animal-island-vue';
import { QuillEditor } from '@vueup/vue-quill';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useTodayLog } from '@/composables/useTodayLog';
import { useDetailDrawers } from '@/composables/useDetailDrawers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useTaskMoneySync } from '@/composables/useTaskMoneySync';
import { usePanelUiState } from '@/composables/usePanelUiState';
import { todayStr, formatDateStr } from '@/utils/date';
import { statusText } from '@/utils/labels';
import type { MoneyItem } from '@/types';
import type { CustomSelectOption } from '@/components/CustomSelect.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';

const { moneyItems, moneyPlan } = useMyDayStorage();
const { pushTodayLog } = useTodayLog();
const { openMoneyDetail } = useDetailDrawers();
const { openDelete } = useDeleteConfirm();
const { autoCreateTodayTaskFromMoney, syncAutoTodayTaskForMoney } = useTaskMoneySync();
const { moneyView, moneyPage, moneyCalendarMonth, moneyPlanDraft } = usePanelUiState();

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

/* ---------- 添加任务 ---------- */
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
const addDatePickerOpen = ref(false);
const openMoneyModal = () => {
  resetMoneyForm();
  moneyModalOpen.value = true;
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

/* ---------- 编辑任务 ---------- */
const editMoneyModalOpen = ref(false);
const editDatePickerOpen = ref(false);
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

/* ---------- 任务表视图 ---------- */
const sortedMoneyItems = computed(() =>
  [...moneyItems].sort((a: MoneyItem, b: MoneyItem) => a.deadline.localeCompare(b.deadline))
);

const moneyPageSize = 10;
const moneyTotalPages = computed(() => Math.ceil(sortedMoneyItems.value.length / moneyPageSize) || 1);
const paginatedMoneyItems = computed(() => {
  const start = (moneyPage.value - 1) * moneyPageSize;
  return sortedMoneyItems.value.slice(start, start + moneyPageSize);
});
watch(moneyView, () => { moneyPage.value = 1; });
watch(moneyTotalPages, (total) => { if (moneyPage.value > total) moneyPage.value = total || 1; });

/* ---------- 日历视图 ---------- */
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

/* ---------- 长期规划 ---------- */
watch(moneyView, (view) => {
  if (view === 'plan') {
    moneyPlanDraft.value = moneyPlan.value || '';
  }
});
const saveMoneyPlan = () => {
  moneyPlan.value = moneyPlanDraft.value;
  Notification.success('长期规划已保存');
};

/* ---------- 汇总 ---------- */
const totalIncome = computed(() => moneyItems.reduce((s, m) => s + m.amount, 0));
const pendingIncome = computed(() =>
  moneyItems.filter((m: MoneyItem) => m.status !== 'done').reduce((s, m) => s + m.amount, 0)
);
</script>

<template>
  <div>
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
            @click="addDatePickerOpen = true"
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
            @click="editDatePickerOpen = true"
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
      v-model:open="addDatePickerOpen"
      v-model="moneyForm.deadline"
      title="选择截止日期"
      :mask-style="{ zIndex: 1200 }"
    />
    <DatePickerModal
      v-model:open="editDatePickerOpen"
      v-model="editMoneyForm.deadline"
      title="选择截止日期"
      :mask-style="{ zIndex: 1200 }"
    />
  </div>
</template>

<style scoped>
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
</style>
