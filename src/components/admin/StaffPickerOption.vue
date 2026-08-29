<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string;
    status: string;
    detail?: string;
    variant?: 'available' | 'busy' | 'inactive';
    selected?: boolean;
    selectable?: boolean;
    disabled?: boolean;
  }>(),
  {
    detail: '',
    variant: 'available',
    selected: false,
    selectable: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <button
    v-if="selectable"
    type="button"
    class="staff-picker-option"
    :class="[
      `staff-picker-option--${variant}`,
      { 'staff-picker-option--selected': selected },
    ]"
    :aria-pressed="selected"
    :disabled="disabled"
    @click="emit('select')"
  >
    <span
      class="staff-picker-avatar"
      :class="{ 'staff-picker-avatar--busy': variant === 'busy' }"
    >
      {{ name.slice(0, 1).toUpperCase() }}
    </span>
    <span class="staff-picker-option-copy">
      <span class="staff-picker-name">{{ name }}</span>
      <span class="staff-picker-status">{{ status }}</span>
      <span v-if="detail" class="staff-picker-assignment-detail">{{ detail }}</span>
    </span>
    <span class="staff-picker-check" aria-hidden="true">{{ selected ? '✓' : '' }}</span>
  </button>

  <div
    v-else
    class="staff-picker-option staff-picker-option--inactive"
    :class="{ 'staff-picker-option--selected': selected }"
  >
    <span class="staff-picker-avatar staff-picker-avatar--inactive">
      {{ name.slice(0, 1).toUpperCase() }}
    </span>
    <span class="staff-picker-option-copy">
      <span class="staff-picker-name">{{ name }}</span>
      <span class="staff-picker-status">{{ status }}</span>
      <span v-if="detail" class="staff-picker-assignment-detail">{{ detail }}</span>
    </span>
    <span v-if="selected" class="staff-picker-check" aria-hidden="true">✓</span>
  </div>
</template>

<style scoped>
.staff-picker-option {
  display: flex;
  width: 100%;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}
.staff-picker-option:hover:not(:disabled),
.staff-picker-option:focus-visible {
  border-color: var(--sf-primary, #0ea5e9);
  box-shadow: 0 8px 18px rgba(14, 165, 233, 0.14);
  outline: none;
  transform: translateY(-1px);
}
.staff-picker-option--selected {
  border-color: var(--sf-primary, #0ea5e9);
  background: #f0f9ff;
  box-shadow: inset 0 0 0 1px var(--sf-primary, #0ea5e9);
}
.staff-picker-option:disabled {
  cursor: wait;
  opacity: 0.65;
}
.staff-picker-avatar {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #dcfce7;
  color: #15803d;
  font-size: 16px;
  font-weight: 800;
}
.staff-picker-avatar--busy {
  background: #fef3c7;
  color: #b45309;
}
.staff-picker-avatar--inactive {
  background: #e2e8f0;
  color: #64748b;
}
.staff-picker-option--inactive {
  cursor: default;
  opacity: 0.72;
}
.staff-picker-option-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.staff-picker-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.staff-picker-status {
  color: #64748b;
  font-size: 12px;
}
.staff-picker-assignment-detail {
  overflow: hidden;
  color: #94a3b8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.staff-picker-check {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 2px solid #cbd5e1;
  border-radius: 9px;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}
.staff-picker-option--selected .staff-picker-check {
  border-color: var(--sf-primary, #0ea5e9);
  background: var(--sf-primary, #0ea5e9);
}
</style>
