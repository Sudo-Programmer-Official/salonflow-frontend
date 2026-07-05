import { computed, ref } from 'vue';
import { fetchSchedulerWorkspace, type SchedulerWorkspace } from '@/api/scheduling';
import {
  buildSchedulerGrid,
  groupSchedulerAppointmentsByStaff,
  mapAppointmentToTimelineBlock,
} from '@/utils/scheduler';

export type SchedulerRange = {
  from: string;
  to: string;
};

export function useScheduler(initialRange?: SchedulerRange) {
  const workspace = ref<SchedulerWorkspace | null>(null);
  const loading = ref(false);
  const error = ref('');
  const range = ref<SchedulerRange | null>(initialRange ?? null);

  const refresh = async (nextRange?: SchedulerRange) => {
    if (nextRange) {
      range.value = nextRange;
    }
    if (!range.value) {
      throw new Error('Scheduler range is required');
    }

    loading.value = true;
    error.value = '';

    try {
      workspace.value = await fetchSchedulerWorkspace(range.value);
    } catch (err) {
      workspace.value = null;
      error.value = err instanceof Error ? err.message : 'Failed to load schedule';
    } finally {
      loading.value = false;
    }
  };

  const dayGrids = computed(() => workspace.value?.days.map((day) => buildSchedulerGrid(day)) ?? []);
  const appointmentGroups = computed(() =>
    groupSchedulerAppointmentsByStaff(workspace.value?.appointments ?? []),
  );
  const timelineBlocks = computed(() =>
    (workspace.value?.appointments ?? []).map((appointment) =>
      mapAppointmentToTimelineBlock(appointment, workspace.value?.timezone ?? 'UTC'),
    ),
  );

  return {
    workspace,
    loading,
    error,
    range,
    dayGrids,
    appointmentGroups,
    timelineBlocks,
    refresh,
  };
}
