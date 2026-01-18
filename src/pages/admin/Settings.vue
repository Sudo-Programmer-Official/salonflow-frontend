<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ElAlert,
  ElCard,
  ElDivider,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElSwitch,
} from 'element-plus';
import {
  fetchSettings,
  updateSettings,
  type BusinessSettings,
  type DefaultBookingRules,
  type SettingsPatch,
} from '../../api/settings';

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const settings = ref<BusinessSettings | null>(null);
const pendingPatch = ref<SettingsPatch>({});
const saveTimer = ref<number | null>(null);

const defaultRules: DefaultBookingRules = {
  buffer_before: 0,
  buffer_after: 0,
  min_notice_minutes: 0,
  allow_same_day: true,
  allow_walkins_outside_availability: true,
};

const currencyOptions = ['USD', 'CAD', 'EUR', 'GBP', 'AUD'];

const hasPending = computed(() => Object.keys(pendingPatch.value).length > 0);

const mergeRules = (
  base: Partial<DefaultBookingRules> | undefined,
  patch?: Partial<DefaultBookingRules>,
): DefaultBookingRules => ({
  ...defaultRules,
  ...(base ?? {}),
  ...(patch ?? {}),
});

const mergeSettings = (current: BusinessSettings, patch: SettingsPatch): BusinessSettings => ({
  ...current,
  ...patch,
  defaultBookingRules: patch.defaultBookingRules
    ? mergeRules(current.defaultBookingRules, patch.defaultBookingRules)
    : current.defaultBookingRules,
});

const mergePending = (current: SettingsPatch, patch: SettingsPatch): SettingsPatch => {
  const next: SettingsPatch = { ...current, ...patch };
  if (patch.defaultBookingRules) {
    next.defaultBookingRules = mergeRules(
      current.defaultBookingRules || (settings.value?.defaultBookingRules ?? defaultRules),
      patch.defaultBookingRules,
    );
  }
  return next;
};

const flushSave = async () => {
  if (!hasPending.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const updated = await updateSettings(pendingPatch.value);
    settings.value = updated;
    pendingPatch.value = {};
    ElMessage.success('Settings saved');
  } catch (err: any) {
    const message = err?.message || 'Failed to save settings';
    error.value = message;
    if (err?.status === 401 || err?.status === 403) {
      error.value = 'Only owners can change settings.';
    }
    ElMessage.error(error.value);
  } finally {
    saving.value = false;
  }
};

const scheduleSave = (patch: SettingsPatch) => {
  if (!settings.value) return;
  settings.value = mergeSettings(settings.value, patch);
  pendingPatch.value = mergePending(pendingPatch.value, patch);
  if (saveTimer.value) {
    window.clearTimeout(saveTimer.value);
  }
  saveTimer.value = window.setTimeout(() => {
    flushSave();
  }, 450);
};

const handleToggle = (key: keyof SettingsPatch, value: boolean | string | number) => {
  scheduleSave({ [key]: Boolean(value) } as SettingsPatch);
};

const handleKioskResetChange = (value: number | null) => {
  if (value === null || value === undefined) {
    scheduleSave({ kioskAutoResetSeconds: null });
    return;
  }
  const clamped = Math.min(Math.max(Math.round(value), 5), 120);
  scheduleSave({ kioskAutoResetSeconds: clamped });
};

const handleBookingRuleChange = (
  key: keyof DefaultBookingRules,
  value: number | boolean | null | undefined,
) => {
  if (typeof value === 'number') {
    const bounded =
      key === 'min_notice_minutes'
        ? Math.min(Math.max(Math.round(value), 0), 10080)
        : Math.min(Math.max(Math.round(value), 0), 240);
    scheduleSave({ defaultBookingRules: { [key]: bounded } });
    return;
  }
  scheduleSave({ defaultBookingRules: { [key]: value } });
};

const loadSettings = async () => {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchSettings();
    settings.value = mergeSettings(
      {
        ...data,
        defaultBookingRules: mergeRules(defaultRules, data.defaultBookingRules),
      },
      {},
    );
  } catch (err: any) {
    error.value = err?.message || 'Failed to load settings';
    if (err?.status === 401 || err?.status === 403) {
      error.value = 'Only owners can change settings.';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(loadSettings);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Business Settings</h1>
      <p class="text-sm text-slate-600">
        Control kiosk and public check-in behavior, booking defaults, and operations flags.
      </p>
    </div>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      class="w-full"
      :title="error"
    />

    <ElSkeleton v-if="loading && !settings" animated :rows="4" />

    <div v-if="settings" class="space-y-6">
      <ElCard class="bg-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-slate-900">Kiosk / Public Check-In</div>
            <div class="text-sm text-slate-600">
              Gate the public and kiosk entry points and required fields.
            </div>
          </div>
          <div class="text-xs text-slate-500" v-if="saving">Saving…</div>
        </div>

        <ElDivider />

        <div class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div>
            <div class="text-sm font-semibold text-slate-900">Enable public check-in</div>
            <div class="text-xs text-slate-600">Allow customers to check in from the public page.</div>
          </div>
          <ElSwitch
            :model-value="settings.publicCheckInEnabled"
            @change="(val) => handleToggle('publicCheckInEnabled', val)"
          />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
              <div class="text-sm font-semibold text-slate-900">Enable kiosk mode</div>
              <div class="text-xs text-slate-600">Lock the tablet-friendly stepper for in-store use.</div>
          </div>
          <ElSwitch
            :model-value="settings.kioskEnabled"
            @change="(val) => handleToggle('kioskEnabled', val)"
          />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
              <div class="text-sm font-semibold text-slate-900">Require phone number</div>
              <div class="text-xs text-slate-600">Turn off to allow quick walk-ins without a phone.</div>
          </div>
          <ElSwitch
            :model-value="settings.requirePhone"
            @change="(val) => handleToggle('requirePhone', val)"
          />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
              <div class="text-sm font-semibold text-slate-900">Require service selection</div>
              <div class="text-xs text-slate-600">
                When on, public check-in must pick a service before submitting.
              </div>
          </div>
          <ElSwitch
            :model-value="settings.requireService"
            @change="(val) => handleToggle('requireService', val)"
          />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
              <div class="text-sm font-semibold text-slate-900">Allow multiple services per check-in</div>
              <div class="text-xs text-slate-600">
                Enable multi-select in kiosk/public flows. When off, only one service can be chosen.
              </div>
            </div>
            <ElSwitch
              :model-value="settings.allowMultiService"
              @change="(val) => handleToggle('allowMultiService', val)"
            />
          </div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Show loyalty points</div>
              <div class="text-xs text-slate-600">Display customer points during public check-in lookup.</div>
            </div>
            <ElSwitch
              :model-value="settings.showPointsOnKiosk"
              @change="(val) => handleToggle('showPointsOnKiosk', val)"
            />
          </div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Kiosk auto-reset</div>
              <div class="text-xs text-slate-600">
                Return to the welcome screen after completion. Clear to disable.
              </div>
            </div>
            <ElInputNumber
              :model-value="settings.kioskAutoResetSeconds"
              :min="5"
              :max="120"
              :step="5"
              :controls="false"
              :value-on-clear="null"
              placeholder="10"
              @change="(val: number | undefined, _prev: number | undefined) => handleKioskResetChange(val ?? null)"
            />
          </div>
        </div>
      </ElCard>

      <ElCard class="bg-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-slate-900">Booking Defaults</div>
            <div class="text-sm text-slate-600">
              Used as defaults when creating services. Services can override later.
            </div>
          </div>
          <div class="text-xs text-slate-500" v-if="hasPending">Unsaved changes</div>
        </div>

        <ElDivider />

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1">
            <div class="text-sm font-semibold text-slate-900">Buffer before (minutes)</div>
            <ElInputNumber
              :model-value="settings.defaultBookingRules.buffer_before"
              :min="0"
              :max="240"
              :step="5"
              :controls="false"
              @change="(val: number | undefined, _prev: number | undefined) => handleBookingRuleChange('buffer_before', val ?? 0)"
            />
          </div>

          <div class="space-y-1">
            <div class="text-sm font-semibold text-slate-900">Buffer after (minutes)</div>
            <ElInputNumber
              :model-value="settings.defaultBookingRules.buffer_after"
              :min="0"
              :max="240"
              :step="5"
              :controls="false"
              @change="(val: number | undefined, _prev: number | undefined) => handleBookingRuleChange('buffer_after', val ?? 0)"
            />
          </div>

          <div class="space-y-1">
            <div class="text-sm font-semibold text-slate-900">Minimum notice (minutes)</div>
            <ElInputNumber
              :model-value="settings.defaultBookingRules.min_notice_minutes"
              :min="0"
              :max="10080"
              :step="15"
              :controls="false"
              @change="(val: number | undefined, _prev: number | undefined) => handleBookingRuleChange('min_notice_minutes', val ?? 0)"
            />
          </div>

          <div class="space-y-1">
            <div class="text-sm font-semibold text-slate-900">Allow same-day bookings</div>
            <ElSwitch
              :model-value="settings.defaultBookingRules.allow_same_day"
              @change="(val) => handleBookingRuleChange('allow_same_day', val as boolean)"
            />
          </div>

          <div class="space-y-1">
            <div class="text-sm font-semibold text-slate-900">Allow walk-ins outside availability</div>
            <ElSwitch
              :model-value="settings.defaultBookingRules.allow_walkins_outside_availability"
              @change="(val) => handleBookingRuleChange('allow_walkins_outside_availability', val as boolean)"
            />
          </div>
        </div>
      </ElCard>

      <ElCard class="bg-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-slate-900">Operations</div>
            <div class="text-sm text-slate-600">Staff availability and currency defaults.</div>
          </div>
        </div>

        <ElDivider />

        <div class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Enforce staff availability</div>
            <div class="text-xs text-slate-600">
              Prep flag for availability enforcement (OFF keeps current walk-in flow).
            </div>
          </div>
          <ElSwitch
            :model-value="settings.enforceStaffAvailability"
            @change="(val) => handleToggle('enforceStaffAvailability', val)"
          />
        </div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Currency</div>
              <div class="text-xs text-slate-600">Used for pricing and receipts. USD by default.</div>
            </div>
            <ElSelect
              class="w-40"
              :model-value="settings.currency"
              filterable
              @change="(val: string) => scheduleSave({ currency: val })"
            >
              <ElOption v-for="c in currencyOptions" :key="c" :label="c" :value="c" />
            </ElSelect>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>
