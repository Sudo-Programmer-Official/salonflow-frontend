<script setup lang="ts">
import { ElDialog } from 'element-plus';

withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    customer?: string;
    description: string;
  }>(),
  {
    customer: 'Customer',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  closed: [];
}>();
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="title"
    width="min(520px, calc(100vw - 24px))"
    class="staff-picker-modal"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <div class="staff-picker-shell">
      <div class="staff-picker-context">
        <div class="staff-picker-customer">{{ customer }}</div>
        <div class="staff-picker-description">{{ description }}</div>
      </div>

      <div class="staff-picker-list">
        <slot />
      </div>

      <div class="staff-picker-footer">
        <slot name="footer" />
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
:global(.staff-picker-modal.el-dialog) {
  width: min(520px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  margin-top: 12px !important;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
:global(.staff-picker-modal .el-dialog__header) {
  flex: 0 0 auto;
  margin-right: 0;
  padding: 18px 20px 12px;
}
:global(.staff-picker-modal .el-dialog__body) {
  display: flex;
  min-height: 0;
  height: min(640px, calc(100dvh - 120px));
  max-height: calc(100dvh - 120px);
  padding: 0 20px 16px;
  overflow: hidden;
}
.staff-picker-shell {
  display: flex;
  min-height: 0;
  width: 100%;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}
.staff-picker-context {
  flex: 0 0 auto;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}
.staff-picker-customer {
  color: #0f172a;
  font-size: 17px;
  font-weight: 750;
}
.staff-picker-description {
  margin-top: 3px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
.staff-picker-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 2px;
}
.staff-picker-footer {
  display: flex;
  min-height: 44px;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
  border-top: 1px solid #e2e8f0;
  background: #fff;
}
.staff-picker-footer :deep(.el-button) {
  min-height: 44px;
  padding: 0 18px;
}
</style>
