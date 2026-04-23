<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElIcon } from 'element-plus';
import { MoreFilled } from '@element-plus/icons-vue';

import type { Appointment } from '@/api/appointments';

type PrimaryAction = 'confirm' | 'complete';
type MenuAction = 'view' | 'edit' | 'cancel';

const props = defineProps<{
  appointment: Appointment;
  disabled?: boolean;
  loading?: boolean;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  (e: 'view', appointment: Appointment): void;
  (e: 'edit', appointment: Appointment): void;
  (e: 'cancel', appointment: Appointment): void;
  (e: 'primary', payload: { appointment: Appointment; action: PrimaryAction }): void;
}>();

const primaryAction = computed<null | { action: PrimaryAction; label: string; type: 'primary' | 'success' }>(() => {
  if (props.appointment.status === 'PENDING') {
    return {
      action: 'confirm',
      label: 'Confirm',
      type: 'primary',
    };
  }

  if (props.appointment.status === 'CONFIRMED' || props.appointment.status === 'CHECKED_IN') {
    return {
      action: 'complete',
      label: 'Complete',
      type: 'success',
    };
  }

  return null;
});

const showEdit = computed(() => Boolean(props.canManage));
const showCancel = computed(
  () =>
    Boolean(props.canManage) &&
    props.appointment.status !== 'CANCELED' &&
    props.appointment.status !== 'COMPLETED',
);

const handlePrimaryClick = () => {
  if (!primaryAction.value) return;
  emit('primary', {
    appointment: props.appointment,
    action: primaryAction.value.action,
  });
};

const handleCommand = (command: MenuAction) => {
  if (command === 'view') {
    emit('view', props.appointment);
    return;
  }
  if (command === 'edit') {
    emit('edit', props.appointment);
    return;
  }
  emit('cancel', props.appointment);
};
</script>

<template>
  <div class="appointment-actions-menu">
    <ElButton
      v-if="primaryAction"
      size="small"
      :type="primaryAction.type"
      class="sf-btn sf-btn--table appointment-actions-menu__primary"
      :disabled="disabled"
      :loading="loading"
      @click="handlePrimaryClick"
    >
      {{ primaryAction.label }}
    </ElButton>

    <ElDropdown
      trigger="click"
      placement="bottom-end"
      class="appointment-actions-menu__dropdown"
      @command="handleCommand"
    >
      <ElButton
        text
        size="small"
        class="sf-btn sf-btn--table appointment-actions-menu__trigger"
        :disabled="disabled || loading"
        aria-label="Open appointment actions menu"
      >
        <ElIcon aria-hidden="true">
          <MoreFilled />
        </ElIcon>
      </ElButton>

      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem command="view">View</ElDropdownItem>
          <ElDropdownItem v-if="showEdit" command="edit">Edit</ElDropdownItem>
          <ElDropdownItem
            v-if="showCancel"
            command="cancel"
            divided
            class="appointment-actions-menu__danger"
          >
            Cancel
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </div>
</template>

<style scoped>
.appointment-actions-menu {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 0.5rem;
  width: 100%;
}

.appointment-actions-menu__primary {
  flex: 0 0 auto;
  min-height: 2.75rem;
  padding-inline: 1rem;
  border-radius: 999px;
}

.appointment-actions-menu__trigger {
  flex: 0 0 auto;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: 999px;
  color: #475569;
}

.appointment-actions-menu__trigger:hover {
  background: rgba(148, 163, 184, 0.14);
  color: #0f172a;
}

:deep(.appointment-actions-menu__danger) {
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 768px) {
  .appointment-actions-menu {
    gap: 0.35rem;
  }

  .appointment-actions-menu__primary,
  .appointment-actions-menu__trigger {
    min-height: 2.9rem;
  }
}
</style>
