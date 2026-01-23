<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElTag,
  ElMessage,
  ElRadioGroup,
  ElRadioButton,
  ElTooltip,
} from 'element-plus';
import {
  fetchPromotions,
  createPromotion,
  testPromotion,
  sendPromotion,
  type Promotion,
  fetchPromotionStats,
  disablePromotion,
  testPromotionMessage,
} from '../../api/promotions';
import { isWithinTcpaWindow, getBusinessTimezone } from '../../utils/dates';

const activeTab = ref<'active' | 'expired'>('active');
const dialogOpen = ref(false);
const saving = ref(false);
const loading = ref(false);
const sending = ref<string | null>(null);
const testing = ref<string | null>(null);
const testingCreate = ref(false);

const promotions = ref<Promotion[]>([]);
const statsMap = ref<Record<string, any>>({});
const pollers = ref<Record<string, number>>({});
const disableConfirm = ref<{ open: boolean; id: string | null }>({ open: false, id: null });
const viewDrawer = ref<{ open: boolean; promo: Promotion | null }>({ open: false, promo: null });

const filteredPromotions = computed(() =>
  promotions.value.filter((p) => (activeTab.value === 'active' ? p.status === 'ACTIVE' : p.status === 'EXPIRED')),
);

const audienceOptions = [
  { label: 'All', value: 'all' },
  { label: 'VIP', value: 'vip' },
  { label: 'Regular', value: 'regular' },
  { label: 'New', value: 'new' },
  { label: 'At-risk', value: 'atrisk' },
  { label: 'Booking users', value: 'booking' },
];

const form = reactive({
  name: '',
  offerType: 'percent' as 'percent' | 'amount',
  offerValue: 10,
  audiences: ['all'] as string[],
  startDate: '',
  endDate: '',
  oneTimeUse: false,
  businessName: '',
  message: '',
  appendStop: true,
  appendExpiry: true,
  sendWhen: 'now' as 'now' | 'schedule',
  scheduleAt: '',
  testPhone: '',
});

const charCount = computed(() => form.message.length);
const businessTz = computed(() => getBusinessTimezone());
const tcpaWarning = ref('');

const evaluateTcpa = () => {
  const inWindow = isWithinTcpaWindow(undefined, businessTz.value);
  if (!inWindow && form.sendWhen === 'now') {
    tcpaWarning.value = 'SMS sending is allowed 8am–8pm local time. Please schedule instead.';
    form.sendWhen = 'schedule';
  } else {
    tcpaWarning.value = inWindow ? '' : 'Outside TCPA window (8am–8pm). Only scheduling is allowed.';
  }
};

evaluateTcpa();

const resetForm = () => {
  form.name = '';
  form.offerType = 'percent';
  form.offerValue = 10;
  form.audiences = ['all'];
  form.startDate = '';
  form.endDate = '';
  form.oneTimeUse = false;
  form.businessName = '';
  form.message = '';
  form.appendStop = true;
  form.appendExpiry = true;
  form.sendWhen = 'now';
  form.scheduleAt = '';
  form.testPhone = '';
  evaluateTcpa();
};

const openCreate = () => {
  resetForm();
  dialogOpen.value = true;
  evaluateTcpa();
};

const loadPromotions = async () => {
  loading.value = true;
  try {
    const status = activeTab.value === 'active' ? 'active' : 'expired';
    promotions.value = await fetchPromotions(status as any);
    promotions.value.forEach((p) => {
      const stat = statsMap.value[p.id];
      if (p.status === 'SENDING' || (stat && stat.pending > 0)) {
        ensurePolling(p.id);
      } else {
        stopPolling(p.id);
      }
    });
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load promotions');
  } finally {
    loading.value = false;
  }
};

const setTab = (tab: 'active' | 'expired') => {
  activeTab.value = tab;
  loadPromotions();
};

const addOptimistic = (promo: Promotion) => {
  promotions.value = [promo, ...promotions.value];
};

const stopPolling = (id: string) => {
  const timer = pollers.value[id];
  if (timer) {
    clearInterval(timer);
    delete pollers.value[id];
  }
};

const refreshStats = async (id: string) => {
  try {
    const stats = await fetchPromotionStats(id);
    statsMap.value[id] = stats;
    if ((stats.pending ?? 0) === 0) {
      stopPolling(id);
    }
    return stats;
  } catch {
    // ignore transient errors
    return null;
  }
};

const ensurePolling = (id: string) => {
  if (pollers.value[id]) return;
  refreshStats(id);
  pollers.value[id] = window.setInterval(() => refreshStats(id), 4000);
};

const submit = async () => {
  if (form.sendWhen === 'now') {
    const inWindow = isWithinTcpaWindow(undefined, businessTz.value);
    if (!inWindow) {
      tcpaWarning.value = 'SMS sending is allowed 8am–8pm local time. Switch to schedule.';
      form.sendWhen = 'schedule';
      ElMessage.warning('Outside TCPA window. Please schedule this promotion.');
      return;
    }
  }
  if (!form.name.trim()) {
    ElMessage.warning('Promotion name is required');
    return;
  }
  if (!form.message.trim()) {
    ElMessage.warning('Message is required');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      offerType: form.offerType,
      offerValue: form.offerValue,
      audience: form.audiences,
      message: form.message.trim(),
      startAt: form.startDate,
      endAt: form.endDate,
      oneTimeUse: form.oneTimeUse,
    };
    const created = await createPromotion(payload);
    addOptimistic(created);
    dialogOpen.value = false;
    ElMessage.success('Promotion saved');
  } finally {
    saving.value = false;
  }
};

const handleSend = async (id: string) => {
  sending.value = id;
  try {
    await sendPromotion(id);
    ElMessage.success('Promotion send started');
    ensurePolling(id);
    await loadPromotions();
  } catch (err: any) {
    if (err?.code === 'WEEKLY_LIMIT_EXCEEDED') {
      ElMessage.error('Only one promotion per week is allowed.');
    } else if (err?.code === 'TCPA_BLOCKED') {
      ElMessage.error('Messages can only be sent between 8am–8pm local time.');
    } else {
      ElMessage.error(err?.message || 'Failed to send promotion');
    }
  } finally {
    sending.value = null;
  }
};

const handleDisable = async () => {
  if (!disableConfirm.value.id) return;
  try {
    await disablePromotion(disableConfirm.value.id);
    ElMessage.success('Promotion disabled');
    stopPolling(disableConfirm.value.id);
    await loadPromotions();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to disable');
  } finally {
    disableConfirm.value = { open: false, id: null };
  }
};

const closeView = () => {
  viewDrawer.value = { open: false, promo: null };
};

const openDisable = (id: string) => {
  disableConfirm.value = { open: true, id };
};

const openView = (promo: Promotion) => {
  viewDrawer.value = { open: true, promo };
  ensurePolling(promo.id);
};

const handleTest = async (id: string, phone: string) => {
  if (!phone?.trim()) {
    ElMessage.warning('Enter a test phone number');
    return;
  }
  testing.value = id;
  try {
    await testPromotion(id, phone.trim());
    ElMessage.success('Test sent');
  } catch (err: any) {
    if (err?.code === 'TCPA_BLOCKED') {
      ElMessage.error('Messages can only be sent between 8am–8pm local time.');
    } else {
      ElMessage.error(err?.message || 'Failed to send test');
    }
  } finally {
    testing.value = null;
  }
};

const handleCreateTest = async () => {
  if (!form.testPhone?.trim()) {
    ElMessage.warning('Enter a test phone number');
    return;
  }
  if (!form.message?.trim()) {
    ElMessage.warning('Enter a message to test');
    return;
  }
  testingCreate.value = true;
  try {
    await testPromotionMessage(form.testPhone.trim(), form.message.trim());
    ElMessage.success('Test sent');
  } catch (err: any) {
    if (err?.code === 'TCPA_BLOCKED') {
      ElMessage.error('Messages can only be sent between 8am–8pm local time.');
    } else if (err?.code === 'CAP_EXCEEDED') {
      ElMessage.error('SMS cap exceeded for this tenant.');
    } else {
      ElMessage.error(err?.message || 'Failed to send test');
    }
  } finally {
    testingCreate.value = false;
  }
};

loadPromotions();
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Promotions</h1>
        <p class="text-sm text-slate-600">Targeted offers with SMS-first delivery.</p>
      </div>
      <ElButton type="primary" class="sf-btn" @click="openCreate">New Promotion</ElButton>
    </div>

    <div class="flex items-center gap-3">
      <ElButton
        size="small"
        class="sf-btn"
        :type="activeTab === 'active' ? 'primary' : 'default'"
        @click="setTab('active')"
      >
        Active
      </ElButton>
      <ElButton
        size="small"
        class="sf-btn"
        :type="activeTab === 'expired' ? 'primary' : 'default'"
        @click="setTab('expired')"
      >
        Expired
      </ElButton>
    </div>

    <ElCard class="bg-white">
      <div class="overflow-x-auto" :class="{ 'opacity-60': loading }">
        <table class="promo-table w-full text-left">
          <thead>
            <tr>
              <th>Promotion</th>
              <th>Audience</th>
              <th>Offer</th>
              <th>Condition</th>
              <th>Sent</th>
              <th>Redeemed</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="promo in filteredPromotions" :key="promo.id">
              <td class="font-semibold text-slate-900">{{ promo.name }}</td>
              <td class="text-sm text-slate-700">{{ promo.audience.join(', ') }}</td>
              <td class="text-sm text-slate-700">
                {{ promo.offerType === 'percent' ? `${promo.offerValue}% off` : `$${promo.offerValue} off` }}
              </td>
              <td class="text-sm text-slate-600">—</td>
              <td class="text-sm text-slate-700">{{ promo.sentCount }}</td>
              <td class="text-sm text-slate-700">{{ promo.redeemedCount }}</td>
              <td>
                <ElTag
                  :type="promo.status === 'ACTIVE' ? 'success' : promo.status === 'SCHEDULED' ? 'warning' : 'info'"
                  effect="light"
                >
                  {{
                    promo.status === 'ACTIVE'
                      ? 'Active'
                      : promo.status === 'SCHEDULED'
                      ? 'Scheduled'
                      : promo.status === 'DISABLED'
                      ? 'Disabled'
                      : 'Expired'
                  }}
                </ElTag>
              </td>
              <td class="text-right">
                <div class="flex flex-col gap-2">
                  <div v-if="statsMap[promo.id] && statsMap[promo.id].total" class="progress-row">
                    <div class="text-xs text-slate-600 flex justify-between">
                      <span>Pending {{ statsMap[promo.id].pending ?? 0 }}</span>
                      <span>
                        Sent {{ statsMap[promo.id].sent ?? 0 }}
                        | Blocked {{ statsMap[promo.id].blocked_cap ?? 0 }}
                        | Failed {{ statsMap[promo.id].failed ?? 0 }}
                      </span>
                    </div>
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((statsMap[promo.id].sent ?? 0) +
                                (statsMap[promo.id].failed ?? 0) +
                                (statsMap[promo.id].simulated ?? 0) +
                                (statsMap[promo.id].blocked_cap ?? 0)) /
                                (statsMap[promo.id].total || 1) *
                                100,
                            ),
                          )}%`,
                        }"
                      />
                    </div>
                  </div>
                  <div class="flex flex-wrap justify-end gap-2">
                    <ElButton
                      size="small"
                      class="sf-btn sf-btn--table sf-btn--ghost"
                      @click="openView(promo)"
                    >
                      View
                    </ElButton>
                    <ElButton
                      size="small"
                      class="sf-btn sf-btn--table sf-btn--ghost"
                      :disabled="promo.status === 'DISABLED'"
                      @click="openDisable(promo.id)"
                    >
                      Disable
                    </ElButton>
                    <ElTooltip content="Send test to your number">
                      <span>
                        <ElButton
                          size="small"
                          class="sf-btn sf-btn--table sf-btn--ghost"
                          :loading="testing === promo.id"
                          @click="handleTest(promo.id, form.testPhone)"
                        >
                          Test
                        </ElButton>
                      </span>
                    </ElTooltip>
                    <ElButton
                      size="small"
                      type="primary"
                      class="sf-btn sf-btn--table sf-btn--icon"
                      :disabled="(statsMap[promo.id]?.pending ?? 0) > 0 || promo.status === 'SENDING'"
                      :loading="sending === promo.id"
                      @click="handleSend(promo.id)"
                    >
                      Send
                    </ElButton>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPromotions.length === 0">
              <td colspan="8" class="py-6 text-center text-sm text-slate-500">No promotions yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ElCard>

    <ElDialog v-model="disableConfirm.open" title="Disable promotion" width="420px">
      <div class="text-sm text-slate-700">
        Disabling stops any further sends for this promotion. Existing sent messages remain delivered.
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="disableConfirm = { open: false, id: null }">Cancel</ElButton>
          <ElButton type="danger" @click="handleDisable">Disable</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="viewDrawer.open" title="Promotion details" width="640px">
      <div v-if="viewDrawer.promo" class="space-y-3 text-sm text-slate-800">
        <div class="text-base font-semibold">{{ viewDrawer.promo.name }}</div>
        <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold text-slate-600 mb-1">Audience snapshot</div>
          <pre class="whitespace-pre-wrap text-xs text-slate-700">{{ (viewDrawer.promo as any).audienceSnapshotJson || '—' }}</pre>
          <div class="text-xs text-slate-600 mt-1">Recipient total: {{ (viewDrawer.promo as any).recipientTotal ?? '—' }}</div>
        </div>
        <div v-if="statsMap[viewDrawer.promo.id]" class="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
          <div class="text-xs font-semibold text-slate-600">Live stats</div>
          <div class="text-xs text-slate-700">Total: {{ statsMap[viewDrawer.promo.id].total }}</div>
          <div class="text-xs text-slate-700">Pending: {{ statsMap[viewDrawer.promo.id].pending }}</div>
          <div class="text-xs text-slate-700">Sent: {{ statsMap[viewDrawer.promo.id].sent }}</div>
          <div class="text-xs text-slate-700">Failed: {{ statsMap[viewDrawer.promo.id].failed }}</div>
          <div class="text-xs text-slate-700">Blocked (cap): {{ statsMap[viewDrawer.promo.id].blocked_cap ?? 0 }}</div>
          <div class="text-xs text-slate-700">Excluded (no consent): {{ statsMap[viewDrawer.promo.id].excluded_no_consent ?? 0 }}</div>
          <div class="text-xs text-slate-700">Excluded (no phone): {{ statsMap[viewDrawer.promo.id].excluded_no_phone ?? 0 }}</div>
          <div class="text-xs text-slate-700">Simulated: {{ statsMap[viewDrawer.promo.id].simulated }}</div>
          <div class="text-xs text-slate-700">Status: {{ statsMap[viewDrawer.promo.id].status }}</div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <ElButton @click="closeView">Close</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="dialogOpen" title="Create Promotion" width="960px" class="promo-modal">
      <div class="promo-grid gap-4">
        <div class="promo-col space-y-4">
          <ElCard class="bg-white">
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-slate-800">Promotion name</label>
                <ElInput v-model="form.name" placeholder="10% Off Valentine Special" />
              </div>
              <div>
                <label class="text-sm font-medium text-slate-800">Discount</label>
                <div class="flex gap-3">
                  <ElRadioGroup v-model="form.offerType" size="small">
                    <ElRadioButton label="percent">Percent</ElRadioButton>
                    <ElRadioButton label="amount">Amount</ElRadioButton>
                  </ElRadioGroup>
                  <ElInputNumber
                    v-model="form.offerValue"
                    :min="1"
                    :max="form.offerType === 'percent' ? 100 : undefined"
                    :step="form.offerType === 'percent' ? 1 : 1"
                    class="w-full"
                  />
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-800">Who to offer</label>
                <ElCheckboxGroup v-model="form.audiences" class="audience-grid">
                  <ElCheckbox v-for="opt in audienceOptions" :key="opt.value" :label="opt.value">
                    {{ opt.label }}
                  </ElCheckbox>
                </ElCheckboxGroup>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="text-sm font-medium text-slate-800">Start date</label>
                  <ElDatePicker v-model="form.startDate" type="date" placeholder="Start" class="w-full" />
                </div>
                <div>
                  <label class="text-sm font-medium text-slate-800">End date</label>
                  <ElDatePicker v-model="form.endDate" type="date" placeholder="End" class="w-full" />
                </div>
              </div>
              <ElCheckbox v-model="form.oneTimeUse">One-time use per customer</ElCheckbox>
            </div>
          </ElCard>
        </div>

        <div class="promo-col space-y-4">
          <ElCard class="bg-white">
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-slate-800">Business name</label>
                <ElInput v-model="form.businessName" placeholder="SalonFlow Demo" />
              </div>
              <div>
                <label class="text-sm font-medium text-slate-800">Message (SMS)</label>
                <ElInput
                  v-model="form.message"
                  type="textarea"
                  :rows="4"
                  placeholder="Hi {{first_name}}, enjoy 10% off your next visit..."
                />
                <div class="flex items-center justify-between text-xs text-slate-500">
                  <span>Include offer and expiration details.</span>
                  <span>{{ charCount }} chars</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <ElCheckbox v-model="form.appendStop">Auto-append “Reply STOP to opt out”</ElCheckbox>
                <ElCheckbox v-model="form.appendExpiry">Include expiry text</ElCheckbox>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-800">Send timing</label>
                <ElRadioGroup v-model="form.sendWhen" size="small">
                  <ElRadioButton label="now">Send now</ElRadioButton>
                  <ElRadioButton label="schedule">Schedule</ElRadioButton>
                </ElRadioGroup>
                <div v-if="tcpaWarning" class="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {{ tcpaWarning }}
                </div>
                <ElDatePicker
                  v-if="form.sendWhen === 'schedule'"
                  v-model="form.scheduleAt"
                  type="datetime"
                  placeholder="Select date & time"
                  class="mt-2 w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium text-slate-800">Test phone (optional)</label>
                <ElInput v-model="form.testPhone" placeholder="+1 555 123 4567" />
                <ElButton
                  class="sf-btn sf-btn--ghost mt-2"
                  size="small"
                  native-type="button"
                  :loading="testingCreate"
                  :disabled="!form.testPhone || !form.message || testingCreate"
                  @click="handleCreateTest"
                >
                  Send test
                </ElButton>
              </div>
            </div>
          </ElCard>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="dialogOpen = false">Cancel</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">Save</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.promo-table th,
.promo-table td {
  padding: 10px 8px;
}
.promo-table th {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.promo-table td {
  border-top: 1px solid #e2e8f0;
}
.promo-modal :deep(.el-dialog) {
  max-width: 960px;
  width: 92%;
}
.promo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 900px) {
  .promo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.promo-col :deep(.el-card__body) {
  padding: 16px;
}
.audience-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px 12px;
}
.progress-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #6366f1);
  transition: width 0.3s ease;
}
</style>
