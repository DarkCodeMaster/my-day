<script setup lang="ts">
import { Modal } from 'animal-island-vue';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';

const { deleteModalOpen, confirmDelete } = useDeleteConfirm();
</script>

<template>
  <Modal
    v-model:open="deleteModalOpen"
    title="确认删除"
    :typewriter="false"
    @ok="confirmDelete"
  >
    确定要删除这条记录吗？动森的世界里也要学会断舍离哦~
  </Modal>
</template>
