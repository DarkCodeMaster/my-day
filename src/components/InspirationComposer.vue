<script setup lang="ts">
import { ref } from 'vue';
import { Button, Modal, Notification } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { nowTimeStr } from '@/composables/useTodayLog';
import { todayStr } from '@/utils/date';

const { inspirations } = useMyDayStorage();

const inspirationModalOpen = ref(false);
const inspirationForm = ref('');

const openInspirationModal = () => {
  inspirationForm.value = '';
  inspirationModalOpen.value = true;
};

const submitInspiration = () => {
  const content = inspirationForm.value.trim();
  if (!content) return;
  inspirations.push({
    id: Date.now(),
    content,
    date: todayStr(),
    time: nowTimeStr(),
  });
  inspirationForm.value = '';
  inspirationModalOpen.value = false;
  Notification.success('灵感已记录');
};
</script>

<template>
  <Button
    danger
    type="primary"
    size="large"
    style="position:fixed;right:28px;bottom:28px;z-index:1000;"
    @click="openInspirationModal"
  >
    💡
  </Button>

  <Modal
    v-model:open="inspirationModalOpen"
    title="记录灵感"
    :typewriter="false"
    :show-footer="true"
    :width="1040"
  >
    <div class="form-field" style="align-self: stretch; width: 100%;">
      <label class="form-field-label">灵感内容</label>
      <textarea
        v-model="inspirationForm"
        class="import-textarea"
        style="width:100%;"
        rows="4"
        placeholder="突然想到什么？记下来吧..."
      ></textarea>
    </div>
    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <Button type="primary" size="middle" @click="inspirationModalOpen = false">取消</Button>
        <Button danger type="primary" size="middle" @click="submitInspiration">保存</Button>
      </div>
    </template>
  </Modal>
</template>
