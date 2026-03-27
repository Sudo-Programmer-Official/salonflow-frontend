<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { PropType } from 'vue';

import type { Appointment } from '../../api/appointments';
import { formatInBusinessTz } from '../../utils/dates';

const props = defineProps({
  appointment: {
    type: Object as PropType<Appointment | null>,
    required: true,
  },
  pendingCount: {
    type: Number,
    required: true,
  },
  resolving: {
    type: Boolean,
    required: true,
  },
  error: {
    type: String,
    default: null,
  },
  audioEnabled: {
    type: Boolean,
    required: true,
  },
  audioBlocked: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits<{
  confirm: [];
  view: [];
  enableAudio: [];
}>();

const enableAudioButton = ref<HTMLButtonElement | null>(null);
const viewButton = ref<HTMLButtonElement | null>(null);

watch(
  () => [props.appointment?.id ?? null, props.audioEnabled] as const,
  async ([appointmentId, audioEnabled]) => {
    if (!appointmentId) {
      return;
    }

    await nextTick();
    if (!audioEnabled) {
      enableAudioButton.value?.focus();
      return;
    }

    viewButton.value?.focus();
  },
  { immediate: true },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="appointment" class="appointment-alert-shell">
      <div class="appointment-alert-shell__backdrop" />
      <section
        class="appointment-alert"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-alert-title"
      >
        <div class="appointment-alert__pulse" />
        <p class="appointment-alert__eyebrow">New Appointment Alert</p>
        <h2 id="appointment-alert-title" class="appointment-alert__title">
          Immediate acknowledgement required
        </h2>
        <p class="appointment-alert__copy">
          SalonFlow detected a new appointment. This alert will keep repeating until you confirm it or open the appointment.
        </p>

        <dl class="appointment-alert__details">
          <div class="appointment-alert__detail">
            <dt>Customer</dt>
            <dd>{{ appointment.customerName }}</dd>
          </div>
          <div class="appointment-alert__detail">
            <dt>Time</dt>
            <dd>{{ formatInBusinessTz(appointment.scheduledAt, 'MMM D, YYYY h:mm A') }}</dd>
          </div>
          <div class="appointment-alert__detail">
            <dt>Service</dt>
            <dd>{{ appointment.serviceName }}</dd>
          </div>
        </dl>

        <p v-if="pendingCount > 1" class="appointment-alert__queue">
          {{ pendingCount - 1 }} more appointment alert{{ pendingCount - 1 === 1 ? '' : 's' }} waiting in queue.
        </p>
        <div v-if="!audioEnabled" class="appointment-alert__audio-gate">
          <p class="appointment-alert__audio-gate-title">Click to enable sound alerts.</p>
          <p class="appointment-alert__audio-gate-copy">
            Browser autoplay rules can mute alarm sounds until you explicitly enable them for this session.
          </p>
          <button
            ref="enableAudioButton"
            type="button"
            class="sf-btn appointment-alert__button appointment-alert__button--gate"
            @click="emit('enableAudio')"
          >
            Enable Sound Alerts
          </button>
        </div>
        <p v-if="audioBlocked" class="appointment-alert__hint">
          Browser audio is still blocked. Click to enable sound alerts again.
        </p>
        <p v-if="error" class="appointment-alert__error">{{ error }}</p>

        <div class="appointment-alert__actions">
          <button
            ref="viewButton"
            type="button"
            class="sf-btn appointment-alert__button appointment-alert__button--primary"
            :disabled="resolving"
            @click="emit('view')"
          >
            {{ resolving ? 'Opening…' : 'View Appointment' }}
          </button>
          <button
            type="button"
            class="sf-btn appointment-alert__button appointment-alert__button--secondary"
            :disabled="resolving"
            @click="emit('confirm')"
          >
            Confirm
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.appointment-alert-shell {
  position: fixed;
  inset: 0;
  z-index: 100001;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.appointment-alert-shell__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(251, 191, 36, 0.16), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9));
  backdrop-filter: blur(10px);
}

.appointment-alert {
  position: relative;
  width: min(100%, 54rem);
  padding: clamp(1.75rem, 4vw, 3rem);
  border-radius: 28px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 250, 250, 0.98)),
    linear-gradient(135deg, rgba(254, 242, 242, 0.9), rgba(255, 255, 255, 0.98));
  box-shadow: 0 36px 80px rgba(15, 23, 42, 0.3);
  display: grid;
  gap: 1.25rem;
  overflow: hidden;
}

.appointment-alert__pulse {
  position: absolute;
  right: -5rem;
  top: -5rem;
  width: 14rem;
  height: 14rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.25), transparent 68%);
  animation: appointment-alert-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}

.appointment-alert__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #dc2626;
}

.appointment-alert__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 0.95;
  color: #0f172a;
}

.appointment-alert__copy,
.appointment-alert__queue,
.appointment-alert__audio-gate-title,
.appointment-alert__audio-gate-copy,
.appointment-alert__hint,
.appointment-alert__error,
.appointment-alert__details dt,
.appointment-alert__details dd {
  margin: 0;
}

.appointment-alert__copy {
  max-width: 42rem;
  color: #475569;
  font-size: 1rem;
}

.appointment-alert__details {
  display: grid;
  gap: 0.9rem;
}

.appointment-alert__detail {
  padding: 1rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(248, 250, 252, 0.95);
}

.appointment-alert__detail dt {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-alert__detail dd {
  margin-top: 0.4rem;
  font-size: clamp(1.15rem, 2.3vw, 1.55rem);
  font-weight: 700;
  color: #0f172a;
}

.appointment-alert__queue {
  font-size: 0.95rem;
  font-weight: 600;
  color: #b45309;
}

.appointment-alert__audio-gate {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(255, 247, 237, 0.98);
}

.appointment-alert__audio-gate-title {
  font-size: 1rem;
  font-weight: 700;
  color: #9a3412;
}

.appointment-alert__audio-gate-copy {
  color: #9a3412;
  font-size: 0.94rem;
}

.appointment-alert__hint {
  font-size: 0.92rem;
  color: #92400e;
}

.appointment-alert__error {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  background: rgba(254, 226, 226, 0.85);
  color: #b91c1c;
}

.appointment-alert__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.appointment-alert__button {
  min-width: 13rem;
  justify-content: center;
}

.appointment-alert__button--primary {
  background: linear-gradient(135deg, #dc2626, #f97316);
  border-color: transparent;
  color: white;
  box-shadow: 0 18px 32px rgba(220, 38, 38, 0.22);
}

.appointment-alert__button--secondary {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.45);
  color: #0f172a;
}

.appointment-alert__button--gate {
  background: linear-gradient(135deg, #f97316, #f59e0b);
  border-color: transparent;
  color: white;
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.18);
}

.appointment-alert__button--secondary:hover {
  background: #f8fafc;
}

@keyframes appointment-alert-pulse {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .appointment-alert-shell {
    padding: 1rem;
  }

  .appointment-alert {
    width: 100%;
    border-radius: 22px;
  }

  .appointment-alert__actions,
  .appointment-alert__button {
    width: 100%;
  }
}
</style>
