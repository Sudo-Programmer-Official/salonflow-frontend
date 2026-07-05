<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElCard, ElSkeleton } from 'element-plus';
import { dayjs, nowInBusinessTz } from '../../utils/dates';
import type { SchedulerAppointment, SchedulerWorkspace } from '@/api/scheduling';

type TimelineMode = 'day' | 'week';

const props = defineProps<{
  workspace: SchedulerWorkspace | null;
  loading?: boolean;
  error?: string;
  mode?: TimelineMode;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  (event: 'appointment-click', appointmentId: string): void;
  (
    event: 'appointment-move',
    payload: { appointmentId: string; startAt: string; staffId: string | null },
  ): void;
  (
    event: 'slot-click',
    payload: { startAt: string; staffId: string | null; staffName: string | null },
  ): void;
}>();

const timeColumnWidth = 88;
const rowHeight = 28;
const headerHeight = 54;
const minLaneWidth = 180;
const displayMode = computed<TimelineMode>(() => props.mode ?? 'day');
const gridWrapRef = ref<HTMLElement | null>(null);

const days = computed(() => props.workspace?.days ?? []);
const timezone = computed(() => props.workspace?.timezone ?? 'America/Chicago');
const slotMinutes = computed(() => props.workspace?.slotMinutes ?? 15);
const primaryDay = computed(() => days.value[0] ?? null);
const slots = computed(() => primaryDay.value?.slots ?? []);
const appointments = computed(() => props.workspace?.appointments ?? []);
const appointmentsByDay = computed(() => {
  const map = new Map<string, SchedulerAppointment[]>();
  for (const appointment of appointments.value) {
    const bucket = map.get(appointment.dayKey) ?? [];
    bucket.push(appointment);
    map.set(appointment.dayKey, bucket);
  }
  return map;
});

const hasUnassignedAppointments = computed(() =>
  appointments.value.some((appointment) => !appointment.staffId),
);

const lanes = computed(() => {
  const staff = props.workspace?.staff ?? [];
  const lanes = staff.length
    ? [...staff]
    : [
        {
          id: 'salon',
          name: 'Entire salon',
          active: true,
          appointments: [],
          weeklyAvailability: [],
          overrides: [],
        },
      ];

  if (hasUnassignedAppointments.value) {
    lanes.push({
      id: 'unassigned',
      name: 'Unassigned',
      active: true,
      appointments: [],
      weeklyAvailability: [],
      overrides: [],
    });
  }

  return lanes;
});

const laneIndexById = computed(() => {
  const map = new Map<string, number>();
  lanes.value.forEach((lane, index) => {
    map.set(lane.id, index);
  });
  return map;
});

const dayStart = computed(() => {
  if (!primaryDay.value) {
    return null;
  }
  return dayjs.tz(primaryDay.value.date, timezone.value).startOf('day');
});

const totalGridRows = computed(() => Math.max(slots.value.length, 1));

const gridStyle = computed(() => ({
  gridTemplateColumns: `${timeColumnWidth}px repeat(${Math.max(lanes.value.length, 1)}, minmax(${minLaneWidth}px, 1fr))`,
  gridTemplateRows: `${headerHeight}px repeat(${totalGridRows.value}, ${rowHeight}px)`,
}));

const statusChip = (status: SchedulerAppointment['status']) => {
  const base = 'appointment-timeline__status';
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', cls: `${base} appointment-timeline__status--pending` };
    case 'CONFIRMED':
      return { label: 'Confirmed', cls: `${base} appointment-timeline__status--confirmed` };
    case 'CHECKED_IN':
      return { label: 'Checked In', cls: `${base} appointment-timeline__status--checked-in` };
    case 'BOOKED':
      return { label: 'Booked', cls: `${base} appointment-timeline__status--booked` };
    case 'COMPLETED':
      return { label: 'Completed', cls: `${base} appointment-timeline__status--completed` };
    case 'CANCELED':
      return { label: 'Cancelled', cls: `${base} appointment-timeline__status--cancelled` };
    case 'NO_SHOW':
      return { label: 'No show', cls: `${base} appointment-timeline__status--neutral` };
    default:
      return { label: status, cls: `${base} appointment-timeline__status--neutral` };
  }
};

const warningChip = (warnings: string[]) => ({
  label: warnings.length > 1 ? `${warnings.length} warnings` : warnings[0] ?? '',
  cls: 'appointment-timeline__warning',
});

const statusTone = (status: SchedulerAppointment['status']) => {
  switch (status) {
    case 'PENDING':
      return { accent: '#f97316', soft: 'rgba(249, 115, 22, 0.10)' };
    case 'CONFIRMED':
      return { accent: '#3b82f6', soft: 'rgba(59, 130, 246, 0.10)' };
    case 'CHECKED_IN':
      return { accent: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.10)' };
    case 'BOOKED':
      return { accent: '#14b8a6', soft: 'rgba(20, 184, 166, 0.10)' };
    case 'COMPLETED':
      return { accent: '#10b981', soft: 'rgba(16, 185, 129, 0.10)' };
    case 'CANCELED':
      return { accent: '#f43f5e', soft: 'rgba(244, 63, 94, 0.10)' };
    case 'NO_SHOW':
      return { accent: '#94a3b8', soft: 'rgba(148, 163, 184, 0.12)' };
    default:
      return { accent: '#64748b', soft: 'rgba(100, 116, 139, 0.10)' };
  }
};

const needsConfirmation = (status: SchedulerAppointment['status']) =>
  status === 'PENDING' || status === 'BOOKED';

const initialsForAppointment = (appointment: SchedulerAppointment) =>
  appointment.customerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'SF';

const laneIdForAppointment = (appointment: SchedulerAppointment) =>
  appointment.staffId || (hasUnassignedAppointments.value ? 'unassigned' : lanes.value[0]?.id || 'salon');

const laneIndexForAppointment = (appointment: SchedulerAppointment) => {
  const laneId = laneIdForAppointment(appointment);
  return laneIndexById.value.get(laneId) ?? 0;
};

const blockStyle = (appointment: SchedulerAppointment, dateKey = appointment.dayKey) => {
  const start = dayjs(appointment.scheduledAt).tz(timezone.value);
  const end = dayjs(appointment.endAt).tz(timezone.value);
  const baseDay = dayjs.tz(dateKey, timezone.value).startOf('day');
  const startMinutes = Math.max(0, start.diff(baseDay, 'minute', true));
  const durationMinutes = Math.max(slotMinutes.value, end.diff(start, 'minute', true));
  const startRow = Math.max(2, Math.floor(startMinutes / slotMinutes.value) + 2);
  const span = Math.max(1, Math.ceil(durationMinutes / slotMinutes.value));
  const maxSpan = Math.max(1, totalGridRows.value - (startRow - 2));

  return {
    gridColumn: laneIndexForAppointment(appointment) + 2,
    gridRow: `${startRow} / span ${Math.min(span, maxSpan)}`,
    '--block-accent': statusTone(appointment.status).accent,
    '--block-soft': statusTone(appointment.status).soft,
  };
};

const nowMarkerStyle = computed(() => {
  if (!primaryDay.value || !dayStart.value) {
    return null;
  }

  const now = nowInBusinessTz(timezone.value);
  if (!now.isSame(primaryDay.value.date, 'day')) {
    return null;
  }

  const minutes = now.diff(dayStart.value, 'minute', true);
  const totalMinutes = totalGridRows.value * slotMinutes.value;
  if (minutes < 0 || minutes > totalMinutes) {
    return null;
  }

  const top = headerHeight + (minutes / slotMinutes.value) * rowHeight;
  return {
    top: `${top}px`,
  };
});

const syncWorkspaceScroll = async () => {
  await nextTick();

  const gridWrap = gridWrapRef.value;
  if (!gridWrap) {
    return;
  }

  if (displayMode.value !== 'day' || !nowMarkerStyle.value) {
    gridWrap.scrollTop = 0;
    return;
  }

  const markerTop = Number.parseFloat(nowMarkerStyle.value.top || '0');
  if (!Number.isFinite(markerTop)) {
    return;
  }

  const targetScroll = Math.max(0, markerTop - gridWrap.clientHeight * 0.22);
  gridWrap.scrollTop = Math.min(targetScroll, Math.max(0, gridWrap.scrollHeight - gridWrap.clientHeight));
};

onMounted(() => {
  void syncWorkspaceScroll();
});

watch(
  () => [displayMode.value, primaryDay.value?.date, slots.value.length, appointments.value.length],
  () => {
    void syncWorkspaceScroll();
  },
);

const appointmentBlocks = computed(() =>
  appointments.value.map((appointment) => ({
    appointment,
    style: blockStyle(appointment),
  })),
);

const dayAppointments = (date: string) => appointmentsByDay.value.get(date) ?? [];
const dayGridStyle = (slotCount: number) => ({
  gridTemplateColumns: `${timeColumnWidth}px repeat(${Math.max(lanes.value.length, 1)}, minmax(${minLaneWidth}px, 1fr))`,
  gridTemplateRows: `${headerHeight}px repeat(${Math.max(slotCount, 1)}, ${rowHeight}px)`,
});

const handleSlotClick = (slotStartAt: string, laneId: string, laneName: string) => {
  emit('slot-click', {
    startAt: slotStartAt,
    staffId: laneId === 'salon' || laneId === 'unassigned' ? null : laneId,
    staffName: laneName === 'Entire salon' || laneName === 'Unassigned' ? null : laneName,
  });
};

const handleBlockDragStart = (appointmentId: string, event: DragEvent) => {
  if (!props.canManage) {
    event.preventDefault();
    return;
  }

  event.dataTransfer?.setData('text/plain', appointmentId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleSlotDrop = (event: DragEvent, slotStartAt: string, laneId: string) => {
  if (!props.canManage) {
    return;
  }

  const appointmentId = event.dataTransfer?.getData('text/plain');
  if (!appointmentId) {
    return;
  }

  emit('appointment-move', {
    appointmentId,
    startAt: slotStartAt,
    staffId: laneId === 'salon' || laneId === 'unassigned' ? null : laneId,
  });
};
</script>

<template>
  <ElCard class="appointment-timeline-card">
    <div class="appointment-timeline-card__header">
      <div>
        <p class="appointment-timeline-card__eyebrow">Appointment workspace</p>
        <h3 class="appointment-timeline-card__title">
          {{ displayMode === 'week' ? 'Week timeline' : primaryDay ? primaryDay.label : 'Day timeline' }}
        </h3>
        <p class="appointment-timeline-card__copy">
          {{ appointments.length }} appointments · {{ lanes.length }} lanes · 15-minute grid
        </p>
      </div>
      <div class="appointment-timeline-card__legend">
        <span class="appointment-timeline-card__legend-item">Now</span>
        <span class="appointment-timeline-card__legend-item">Tap appointment to open</span>
      </div>
    </div>

    <ElSkeleton v-if="loading" animated :rows="5" />

    <div v-else-if="error" class="appointment-timeline-card__empty">
      <div class="appointment-timeline-card__empty-title">Timeline unavailable</div>
      <p class="appointment-timeline-card__empty-copy">{{ error }}</p>
    </div>

    <div v-else-if="displayMode === 'day' && (!primaryDay || !slots.length)" class="appointment-timeline-card__empty">
      <div class="appointment-timeline-card__empty-title">No timeline data</div>
      <p class="appointment-timeline-card__empty-copy">
        Select a date with business hours to view the schedule engine output.
      </p>
    </div>

    <div v-else-if="displayMode === 'day'" ref="gridWrapRef" class="appointment-timeline-card__grid-wrap">
        <div class="appointment-timeline-card__grid" :style="gridStyle">
        <div class="appointment-timeline-card__corner">Time</div>
        <div
          v-for="lane in lanes"
          :key="lane.id"
          class="appointment-timeline-card__lane-header"
        >
          <div class="appointment-timeline-card__lane-name">{{ lane.name }}</div>
          <div class="appointment-timeline-card__lane-meta">
            {{ lane.active ? 'Active' : 'Inactive' }}
          </div>
        </div>

        <template v-for="(slot, slotIndex) in slots" :key="slot.startAt">
          <div class="appointment-timeline-card__time">
            <span>{{ slotIndex % 4 === 0 ? slot.label : '' }}</span>
          </div>
          <div
            v-for="lane in lanes"
            :key="`${lane.id}-${slot.startAt}`"
            class="appointment-timeline-card__cell"
          />
          <button
            v-for="lane in lanes"
            :key="`${lane.id}-${slot.startAt}-slot`"
            type="button"
            class="appointment-timeline-card__slot"
            :style="{
              gridColumn: laneIndexById.get(lane.id)! + 2,
              gridRow: `${slotIndex + 2}`,
            }"
            @click="handleSlotClick(slot.startAt, lane.id, lane.name)"
            @dragover.prevent
            @drop.prevent="handleSlotDrop($event, slot.startAt, lane.id)"
          />
        </template>

        <div
          v-if="nowMarkerStyle"
          class="appointment-timeline-card__now"
          :style="nowMarkerStyle"
        >
          <span>Now</span>
        </div>

        <button
          v-for="block in appointmentBlocks"
          :key="block.appointment.id"
          type="button"
          class="appointment-timeline-card__block"
          :style="block.style"
          :draggable="Boolean(props.canManage)"
          @dragstart="handleBlockDragStart(block.appointment.id, $event)"
          @click="emit('appointment-click', block.appointment.id)"
        >
          <div class="appointment-timeline-card__block-top">
            <div class="appointment-timeline-card__block-identity">
              <div class="appointment-timeline-card__block-avatar">
                {{ initialsForAppointment(block.appointment) }}
              </div>
              <div class="appointment-timeline-card__block-text">
                <strong>{{ block.appointment.customerName }}</strong>
                <div class="appointment-timeline-card__block-copy">
                  {{ block.appointment.serviceName }}
                </div>
              </div>
            </div>
            <span class="appointment-timeline-card__block-badges">
              <span :class="statusChip(block.appointment.status).cls">
                {{ statusChip(block.appointment.status).label }}
              </span>
              <span
                v-if="block.appointment.warningReasons.length"
                :class="warningChip(block.appointment.warningReasons).cls"
              >
                {{ warningChip(block.appointment.warningReasons).label }}
              </span>
            </span>
          </div>
          <div class="appointment-timeline-card__block-meta">
            <span>
              {{ dayjs(block.appointment.scheduledAt).tz(timezone).format('h:mm A') }}
              -
              {{ dayjs(block.appointment.endAt).tz(timezone).format('h:mm A') }}
            </span>
            <span>{{ block.appointment.staffName || 'Unassigned' }}</span>
          </div>
          <div v-if="needsConfirmation(block.appointment.status)" class="appointment-timeline-card__block-note">
            Needs confirmation
          </div>
        </button>
      </div>
    </div>

    <div v-else ref="gridWrapRef" class="appointment-timeline-card__week">
      <section
        v-for="day in days"
        :key="day.date"
        class="appointment-timeline-card__week-day"
      >
        <div class="appointment-timeline-card__week-head">
          <div>
            <p class="appointment-timeline-card__week-eyebrow">Week day</p>
            <h4 class="appointment-timeline-card__week-title">{{ day.label }}</h4>
          </div>
          <div class="appointment-timeline-card__week-copy">
            {{ dayAppointments(day.date).length }} appointments
          </div>
        </div>

        <div class="appointment-timeline-card__grid-wrap">
          <div class="appointment-timeline-card__grid" :style="dayGridStyle(day.slots.length)">
            <div class="appointment-timeline-card__corner">Time</div>
            <div
              v-for="lane in lanes"
              :key="`${day.date}-${lane.id}`"
              class="appointment-timeline-card__lane-header"
            >
              <div class="appointment-timeline-card__lane-name">{{ lane.name }}</div>
              <div class="appointment-timeline-card__lane-meta">
                {{ lane.active ? 'Active' : 'Inactive' }}
              </div>
            </div>

            <template v-for="(slot, slotIndex) in day.slots" :key="`${day.date}-${slot.startAt}`">
              <div class="appointment-timeline-card__time">
                <span>{{ slotIndex % 4 === 0 ? slot.label : '' }}</span>
              </div>
              <div
                v-for="lane in lanes"
                :key="`${day.date}-${lane.id}-${slot.startAt}`"
                class="appointment-timeline-card__cell"
              />
              <button
                v-for="lane in lanes"
                :key="`${day.date}-${lane.id}-${slot.startAt}-slot`"
                type="button"
                class="appointment-timeline-card__slot"
                :style="{
                  gridColumn: laneIndexById.get(lane.id)! + 2,
                  gridRow: `${slotIndex + 2}`,
                }"
                @click="handleSlotClick(slot.startAt, lane.id, lane.name)"
                @dragover.prevent
                @drop.prevent="handleSlotDrop($event, slot.startAt, lane.id)"
              />
            </template>

            <button
              v-for="appointment in dayAppointments(day.date)"
              :key="appointment.id"
              type="button"
              class="appointment-timeline-card__block"
              :style="blockStyle(appointment, day.date)"
              :draggable="Boolean(props.canManage)"
              @dragstart="handleBlockDragStart(appointment.id, $event)"
              @click="emit('appointment-click', appointment.id)"
            >
              <div class="appointment-timeline-card__block-top">
                <div class="appointment-timeline-card__block-identity">
                  <div class="appointment-timeline-card__block-avatar">
                    {{ initialsForAppointment(appointment) }}
                  </div>
                  <div class="appointment-timeline-card__block-text">
                    <strong>{{ appointment.customerName }}</strong>
                    <div class="appointment-timeline-card__block-copy">
                      {{ appointment.serviceName }}
                    </div>
                  </div>
                </div>
                <span class="appointment-timeline-card__block-badges">
                  <span :class="statusChip(appointment.status).cls">
                    {{ statusChip(appointment.status).label }}
                  </span>
                  <span
                    v-if="appointment.warningReasons.length"
                    :class="warningChip(appointment.warningReasons).cls"
                  >
                    {{ warningChip(appointment.warningReasons).label }}
                  </span>
                </span>
              </div>
              <div class="appointment-timeline-card__block-meta">
                <span>
                  {{ dayjs(appointment.scheduledAt).tz(timezone).format('h:mm A') }}
                  -
                  {{ dayjs(appointment.endAt).tz(timezone).format('h:mm A') }}
                </span>
                <span>{{ appointment.staffName || 'Unassigned' }}</span>
              </div>
              <div v-if="needsConfirmation(appointment.status)" class="appointment-timeline-card__block-note">
                Needs confirmation
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  </ElCard>
</template>

<style scoped>
.appointment-timeline-card {
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.99)),
    #fff;
}

.appointment-timeline-card :deep(.el-card__body) {
  display: grid;
  gap: 1rem;
}

.appointment-timeline-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  align-items: flex-start;
}

.appointment-timeline-card__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-timeline-card__title {
  margin: 0.15rem 0 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-timeline-card__copy {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.appointment-timeline-card__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.appointment-timeline-card__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: #fff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
}

.appointment-timeline-card__empty {
  display: grid;
  gap: 0.35rem;
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  padding: 1rem;
  color: #64748b;
}

.appointment-timeline-card__empty-title {
  font-weight: 700;
  color: #0f172a;
}

.appointment-timeline-card__empty-copy {
  margin: 0;
}

.appointment-timeline-card__grid-wrap {
  overflow: auto;
  height: clamp(620px, calc(100vh - 360px), 920px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: #fff;
  scrollbar-gutter: stable both-edges;
}

.appointment-timeline-card__week {
  display: grid;
  gap: 1rem;
  max-height: clamp(620px, calc(100vh - 360px), 920px);
  overflow: auto;
  padding-right: 0.25rem;
  scrollbar-gutter: stable both-edges;
}

.appointment-timeline-card__week-day {
  display: grid;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.appointment-timeline-card__week-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
}

.appointment-timeline-card__week-eyebrow {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-timeline-card__week-title {
  margin: 0.15rem 0 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-timeline-card__week-copy {
  font-size: 0.84rem;
  color: #64748b;
}

.appointment-timeline-card__grid {
  position: relative;
  display: grid;
  min-width: 760px;
  width: 100%;
}

.appointment-timeline-card__corner,
.appointment-timeline-card__lane-header {
  position: sticky;
  top: 0;
  z-index: 4;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
}

.appointment-timeline-card__corner {
  display: flex;
  align-items: center;
  padding: 0 0.9rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-timeline-card__lane-header {
  display: grid;
  gap: 0.08rem;
  padding: 0.55rem 0.8rem;
}

.appointment-timeline-card__lane-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-timeline-card__lane-meta {
  font-size: 0.72rem;
  color: #64748b;
}

.appointment-timeline-card__time,
.appointment-timeline-card__cell {
  border-bottom: 1px solid rgba(241, 245, 249, 0.96);
}

.appointment-timeline-card__time {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0.35rem 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 600;
}

.appointment-timeline-card__cell {
  border-left: 1px solid rgba(241, 245, 249, 0.96);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.appointment-timeline-card__slot {
  position: relative;
  z-index: 1;
  margin: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.appointment-timeline-card__slot:hover {
  background: rgba(59, 130, 246, 0.08);
}

.appointment-timeline-card__now {
  position: absolute;
  left: 88px;
  right: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 3;
}

.appointment-timeline-card__now::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.95));
}

.appointment-timeline-card__now span {
  position: sticky;
  left: 0.5rem;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.appointment-timeline-card__block {
  position: relative;
  z-index: 2;
  margin: 0.2rem 0.35rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-left: 5px solid var(--block-accent, #3b82f6);
  border-radius: 18px;
  background:
    linear-gradient(90deg, var(--block-soft, rgba(59, 130, 246, 0.1)), rgba(255, 255, 255, 0.98) 28%),
    #fff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
  padding: 0.7rem 0.8rem;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.appointment-timeline-card__block:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.1);
  border-color: rgba(59, 130, 246, 0.28);
}

.appointment-timeline-card__block-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.appointment-timeline-card__block-identity {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  min-width: 0;
}

.appointment-timeline-card__block-avatar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
}

.appointment-timeline-card__block-text {
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.appointment-timeline-card__block-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

.appointment-timeline-card__block-top strong {
  font-size: 0.94rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-timeline-card__block-copy {
  margin-top: 0;
  font-size: 0.84rem;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-timeline-card__block-note {
  margin-top: 0.25rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: #c2410c;
}

.appointment-timeline-card__block-meta {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  font-size: 0.76rem;
  color: #64748b;
}

.appointment-timeline__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.appointment-timeline__status--pending {
  background: rgba(251, 146, 60, 0.12);
  color: #c2410c;
}

.appointment-timeline__status--confirmed {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.appointment-timeline__status--checked-in {
  background: rgba(168, 85, 247, 0.12);
  color: #7e22ce;
}

.appointment-timeline__status--booked {
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
}

.appointment-timeline__status--completed {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.appointment-timeline__status--cancelled {
  background: rgba(244, 63, 94, 0.12);
  color: #be123c;
}

.appointment-timeline__status--neutral {
  background: rgba(148, 163, 184, 0.14);
  color: #475569;
}

.appointment-timeline__warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.45rem;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.18);
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
