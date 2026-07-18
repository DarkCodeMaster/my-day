<script setup lang="ts">
import { ref } from 'vue';
import { Button, Card, Title, Modal, Notification } from 'animal-island-vue';
import { useMyDayStorage, migrateMyDayState } from '@/composables/useMyDayStorage';
import { todayStr } from '@/utils/date';

const {
  activeTab,
  chartRange,
  weights,
  studyItems,
  moneyItems,
  moneyPlan,
  todayLogs,
  tasks,
  inspirations,
  saveState,
} = useMyDayStorage();

const exportJson = ref('');
const importJson = ref('');
const importError = ref('');
const importFileInput = ref<HTMLInputElement | null>(null);
const importConfirmModalOpen = ref(false);
const clearAllModalOpen = ref(false);

const generateExport = () => {
  const raw = localStorage.getItem('myday') || '{}';
  try {
    const data = JSON.parse(raw);
    exportJson.value = JSON.stringify(data, null, 2);
  } catch {
    exportJson.value = '';
    Notification.error('本地数据格式异常，无法导出');
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
  if (data.version != null && typeof data.version !== 'number') {
    return { valid: false, error: 'version 必须是数字' };
  }
  if (data.version != null && data.version < 1) {
    return { valid: false, error: 'version 不能小于 1' };
  }

  const arrayFields = ['weights', 'studyItems', 'moneyItems', 'todayLogs', 'tasks', 'inspirations'];
  for (const key of arrayFields) {
    if (data[key] != null && !Array.isArray(data[key])) {
      return { valid: false, error: `${key} 必须是数组` };
    }
  }

  if (data.moneyPlan != null && typeof data.moneyPlan !== 'string') {
    return { valid: false, error: 'moneyPlan 必须是字符串' };
  }
  if (data.activeTab != null && typeof data.activeTab !== 'string') {
    return { valid: false, error: 'activeTab 必须是字符串' };
  }
  if (data.chartRange != null && typeof data.chartRange !== 'string') {
    return { valid: false, error: 'chartRange 必须是字符串' };
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
    if (!result.valid) {
      importError.value = result.error;
      return;
    }

    const migrated = migrateMyDayState(parsed);

    activeTab.value = migrated.activeTab;
    chartRange.value = migrated.chartRange;
    moneyPlan.value = migrated.moneyPlan;
    weights.splice(0, weights.length, ...migrated.weights);
    studyItems.splice(0, studyItems.length, ...migrated.studyItems);
    moneyItems.splice(0, moneyItems.length, ...migrated.moneyItems);
    todayLogs.splice(0, todayLogs.length, ...migrated.todayLogs);
    tasks.splice(0, tasks.length, ...migrated.tasks);
    inspirations.splice(0, inspirations.length, ...migrated.inspirations);

    importJson.value = '';
    importConfirmModalOpen.value = false;
    Notification.success('导入成功');
  } catch (e) {
    importError.value = `导入失败：${e instanceof Error ? e.message : String(e)}`;
  }
};

const executeClearAll = () => {
  weights.splice(0, weights.length);
  studyItems.splice(0, studyItems.length);
  moneyItems.splice(0, moneyItems.length);
  todayLogs.splice(0, todayLogs.length);
  tasks.splice(0, tasks.length);
  inspirations.splice(0, inspirations.length);
  moneyPlan.value = '';
  clearAllModalOpen.value = false;
  saveState();
  Notification.success('已清空所有数据');
};
</script>

<template>
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
  </div>
</template>
