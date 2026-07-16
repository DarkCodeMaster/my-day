<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';

export interface CustomSelectOption {
  key: string;
  label: string;
}

const props = defineProps<{
  modelValue: string;
  options: CustomSelectOption[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const open = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.key === props.modelValue);
  return opt?.label ?? props.placeholder ?? props.modelValue;
});

const computePosition = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  };
};

const toggle = () => {
  open.value = !open.value;
  if (open.value) {
    nextTick(computePosition);
  }
};

const select = (key: string) => {
  emit('update:modelValue', key);
  open.value = false;
};

const onClickOutside = (e: MouseEvent) => {
  if (!triggerRef.value) return;
  const target = e.target as Node;
  if (!triggerRef.value.contains(target)) {
    open.value = false;
  }
};

const onResize = () => {
  if (open.value) computePosition();
};

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onClickOutside, true);
    window.addEventListener('resize', onResize);
    nextTick(computePosition);
  } else {
    document.removeEventListener('click', onClickOutside, true);
    window.removeEventListener('resize', onResize);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div ref="triggerRef" class="custom-select">
    <div class="custom-select-trigger" :class="{ 'is-open': open }" @click.stop="toggle">
      <span>{{ selectedLabel }}</span>
      <span class="custom-select-arrow">▾</span>
    </div>
    <Teleport to="body">
      <Transition name="custom-select-fade">
        <div
          v-if="open"
          class="custom-select-dropdown"
          :style="dropdownStyle"
          @click.stop
        >
          <div
            v-for="opt in options"
            :key="opt.key"
            class="custom-select-option"
            :class="{ active: modelValue === opt.key }"
            @click.stop="select(opt.key)"
          >
            {{ opt.label }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
}
.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 2px solid var(--border, #e6d5b8);
  background: var(--input-bg, #fffdf5);
  color: var(--text, #5c4b37);
  font-size: 14px;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.custom-select-trigger:hover,
.custom-select-trigger.is-open {
  border-color: var(--primary, #0d9488);
}
.custom-select-arrow {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  transition: transform 0.2s;
}
.custom-select-trigger.is-open .custom-select-arrow {
  transform: rotate(180deg);
}
.custom-select-dropdown {
  background: var(--card-bg, #fffdf5);
  border: 2px solid var(--border, #e6d5b8);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  box-sizing: border-box;
  max-height: 240px;
  overflow-y: auto;
}
.custom-select-option {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text, #5c4b37);
  transition: background 0.15s;
}
.custom-select-option:hover {
  background: var(--hover-bg, #f3f0e6);
}
.custom-select-option.active {
  background: var(--primary-light, #ccfbf1);
  color: var(--primary, #0d9488);
  font-weight: 700;
}
.custom-select-fade-enter-active,
.custom-select-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.custom-select-fade-enter-from,
.custom-select-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
