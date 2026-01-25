<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElButton, ElCard, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElSelect, ElOption, ElSwitch, ElTable, ElTableColumn, ElTag, ElMessage } from 'element-plus';
import {
  listReminders,
  saveReminder,
  toggleReminder,
  fetchReminderLogs,
  runRemindersNow,
  generateAiSuggestions,
  type SmartReminder,
  type SmartReminderLog,
} from '../../api/smartReminders';

const reminders = ref<SmartReminder[]>([]);
const loading = ref(false);
const saving = ref(false);
const logs = ref<SmartReminderLog[]>([]);
const logsDialog = ref(false);
const currentReminder = ref<SmartReminder | null>(null);
const formDialog = ref(false);
const form = reactive<Partial<SmartReminder>>({
  id: undefined,
  name: '',
  active: true,
  audience: ['everyone'],
  trigger_days: 90,
  cooldown_days: 30,
  channel: ['sms'],
  message_sms: 'We miss you at {{business_name}}! It has been {{days_since_last_visit}} days.',
  discount_type: '',
  discount_value: null,
  expiry_days: null,
  ai_generated: false,
  ai_prompt_version: null,
});
const statsMap = ref<Record<string, { sent_7d: number; skipped_7d: number; last_sent_at: string | null }>>({});

const load = async () => {
  loading.value = true;
  try {
    const res = await listReminders();
    reminders.value = res.reminders;
    statsMap.value = res.stats || {};
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load reminders');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const smsPlaceholder =
  'Hi {{first_name}}, we miss you! It\'s been {{days_since_last_visit}} days since your last visit at {{business_name}}. Enjoy {{discount}} off your next visit 🎉';
const aiLoading = ref(false);
const aiSuggestions = ref<string[]>([]);
const aiDialog = ref(false);
const aiTone = ref<'FRIENDLY' | 'URGENT' | 'PREMIUM' | 'CASUAL'>('FRIENDLY');
const aiShort = ref(false);

const openNew = () => {
  Object.assign(form, {
    id: undefined,
    name: '',
    active: true,
    audience: ['everyone'],
    trigger_days: 90,
    cooldown_days: 30,
    channel: ['sms'],
    message_sms: 'We miss you at {{business_name}}! It has been {{days_since_last_visit}} days.',
    discount_type: '',
    discount_value: null,
    expiry_days: null,
  });
  formDialog.value = true;
};

const edit = (row: SmartReminder) => {
  Object.assign(form, row);
  formDialog.value = true;
};

const save = async () => {
  if (!form.name || !form.trigger_days) {
    ElMessage.warning('Name and trigger days are required');
    return;
  }
  saving.value = true;
  try {
    await saveReminder(form);
    formDialog.value = false;
    await load();
    ElMessage.success('Saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save');
  } finally {
    saving.value = false;
  }
};

const toggle = async (row: SmartReminder) => {
  try {
    await toggleReminder(row.id, !row.active);
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Toggle failed');
  }
};

const viewLogs = async (row: SmartReminder) => {
  currentReminder.value = row;
  try {
    logs.value = await fetchReminderLogs(row.id, 100);
    logsDialog.value = true;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load logs');
  }
};

const openAi = async () => {
  aiDialog.value = true;
  aiSuggestions.value = [];
  aiLoading.value = true;
  try {
    const suggestions = await generateAiSuggestions({
      context: 'SMART_REMINDER',
      trigger: `NO_VISIT_${form.trigger_days || 30}_DAYS`,
      audience: (form.audience?.[0] || 'everyone').toString().toUpperCase(),
      channel: 'SMS',
      discount: form.discount_type ? `${form.discount_value || ''}${form.discount_type === 'percent' ? '%' : ''}` : '',
      expiry: form.expiry_days ? `${form.expiry_days} days` : '',
      tone: aiTone.value,
      short: aiShort.value,
      businessName: '', // optional; could be pulled from settings later
    });
    aiSuggestions.value = suggestions;
  } catch (err: any) {
    ElMessage.error(err?.message || 'AI generation failed');
  } finally {
    aiLoading.value = false;
  }
};

const useSuggestion = (s: string) => {
  form.message_sms = s;
  form.ai_generated = true;
  form.ai_prompt_version = 'v1.2';
  aiDialog.value = false;
};

const runNow = async () => {
  try {
    const res = await runRemindersNow();
    ElMessage.success(`Processed ${res.processed}, sent ${res.sent}, skipped ${res.skipped}`);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to run reminders');
  }
};

const logSummary = computed(() => {
  const sent = logs.value.filter((l) => l.status === 'sent').length;
  const skipped = logs.value.length - sent;
  const noConsent = logs.value.filter((l) => (l.reason || '').toLowerCase().includes('consent')).length;
  return {
    sent,
    skipped,
    noConsent,
  };
});

const logCountFor = (row: SmartReminder) =>
  (statsMap.value[row.id]?.sent_7d ?? 0) + (statsMap.value[row.id]?.skipped_7d ?? 0);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Smart Reminders</h1>
        <p class="text-sm text-slate-600">Lifecycle reminders to bring customers back.</p>
      </div>
      <div class="flex gap-2">
        <ElButton @click="runNow">Run now</ElButton>
        <ElButton type="primary" @click="openNew">New reminder</ElButton>
      </div>
    </div>

    <ElCard>
      <ElTable :data="reminders" :loading="loading" style="width: 100%">
        <ElTableColumn prop="name" label="Name" min-width="200" />
        <ElTableColumn label="Trigger" width="160">
          <template #default="{ row }">No visit in {{ row.trigger_days }} days</template>
        </ElTableColumn>
        <ElTableColumn label="Sent (7d)" width="120">
          <template #default="{ row }">
            {{ statsMap[row.id]?.sent_7d ?? 0 }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Skipped (7d)" width="140">
          <template #default="{ row }">
            {{ statsMap[row.id]?.skipped_7d ?? 0 }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Last run" width="180">
          <template #default="{ row }">
            {{ row.last_run_at || statsMap[row.id]?.last_sent_at || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Discount" width="140">
          <template #default="{ row }">
            <span v-if="row.discount_type">
              {{ row.discount_type === 'percent' ? row.discount_value + '%' : '$' + row.discount_value }}
            </span>
            <span v-else>—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Active" width="120">
          <template #default="{ row }">
            <ElSwitch :model-value="row.active" @change="() => toggle(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Status" width="180">
          <template #default="{ row }">
            <div class="flex flex-col">
              <ElTag
                v-if="row.auto_disabled_reason && !row.active"
                type="warning"
                effect="light"
              >
                Auto-disabled
              </ElTag>
              <span class="text-2xs text-slate-500" v-if="row.auto_disabled_reason">{{ row.auto_disabled_reason }}</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="200">
          <template #default="{ row }">
            <ElButton size="small" @click="edit(row)">Edit</ElButton>
            <ElButton size="small" type="primary" plain @click="viewLogs(row)">
              📊 Logs
              <span v-if="logCountFor(row) > 0" class="ml-1 text-2xs text-slate-600">
                ({{ logCountFor(row) }})
              </span>
              <span
                v-if="row.auto_disabled_reason"
                class="ml-1 inline-flex h-2 w-2 rounded-full bg-rose-500"
              />
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="formDialog" title="Smart Reminder" width="620px">
      <ElForm label-position="top">
        <ElFormItem label="Name" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="Trigger days (no visit in …)" required>
          <ElInputNumber v-model="form.trigger_days" :min="1" />
        </ElFormItem>
        <ElFormItem label="Audience">
          <ElSelect v-model="form.audience" multiple placeholder="Select audience">
            <ElOption label="Everyone" value="everyone" />
            <ElOption label="VIP" value="vip" />
            <ElOption label="Regular" value="regular" />
            <ElOption label="New" value="new" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Cooldown days">
          <ElInputNumber v-model="form.cooldown_days" :min="1" />
          <p class="text-2xs text-slate-500">Cooldown prevents resending to the same customer within this window.</p>
        </ElFormItem>
        <ElFormItem label="Channel">
          <ElSelect v-model="form.channel" multiple disabled>
            <ElOption label="SMS" value="sms" />
          </ElSelect>
          <p class="text-2xs text-slate-500">Phase 1: SMS only. Consent + daily caps still apply.</p>
        </ElFormItem>
        <ElFormItem label="Message (SMS)">
          <ElInput
            v-model="form.message_sms"
            type="textarea"
            :rows="3"
            :placeholder="smsPlaceholder"
          />
          <div class="flex items-center justify-between text-2xs text-slate-500">
            <span>Vars: first_name, business_name, days_since_last_visit, discount, offer_expiry_date.</span>
            <ElButton size="small" type="info" plain @click="openAi">Generate with AI</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="Discount">
          <div class="flex gap-2 items-center">
            <ElSelect v-model="form.discount_type" placeholder="Type" style="width: 140px">
              <ElOption label="None" value="" />
              <ElOption label="Percent" value="percent" />
              <ElOption label="Amount" value="amount" />
            </ElSelect>
            <ElInputNumber v-model="form.discount_value" :disabled="!form.discount_type" />
          </div>
        </ElFormItem>
        <ElFormItem label="Offer expiry (days)">
          <ElInputNumber v-model="form.expiry_days" :min="1" />
        </ElFormItem>
        <ElFormItem label="Active">
          <ElSwitch v-model="form.active" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDialog = false">Cancel</ElButton>
          <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="logsDialog" title="Reminder Logs" width="780px">
      <div class="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 sm:grid-cols-3">
        <div><strong>Sent (7d):</strong> {{ statsMap[currentReminder?.id || '']?.sent_7d ?? 0 }}</div>
        <div><strong>Skipped (7d):</strong> {{ statsMap[currentReminder?.id || '']?.skipped_7d ?? 0 }}</div>
        <div v-if="currentReminder?.auto_disabled_reason">
          <strong>Auto-disabled:</strong> {{ currentReminder.auto_disabled_reason }}
        </div>
        <div v-else>
          <strong>Latest run:</strong> {{ currentReminder?.last_run_at || '—' }}
        </div>
        <div><strong>Session:</strong> sent {{ logSummary.sent }} / skipped {{ logSummary.skipped }}</div>
        <div><strong>Consent blocks:</strong> {{ logSummary.noConsent }}</div>
      </div>

      <ElTable :data="logs" height="360">
        <ElTableColumn prop="sent_at" label="Sent at" width="180" />
        <ElTableColumn prop="channel" label="Channel" width="100" />
        <ElTableColumn prop="status" label="Status" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'sent' ? 'success' : 'info'">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="reason" label="Reason" />
        <ElTableColumn label="AI" width="80">
          <template #default="{ row }">
            <ElTag v-if="row.ai_generated" type="warning" effect="light">AI</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDialog>

    <ElDialog v-model="aiDialog" title="AI Suggestions" width="520px">
      <div class="flex gap-3 items-center mb-3">
        <ElSelect v-model="aiTone" size="small" style="width: 160px" placeholder="Tone">
          <ElOption label="Friendly" value="FRIENDLY" />
          <ElOption label="Urgent" value="URGENT" />
          <ElOption label="Premium" value="PREMIUM" />
          <ElOption label="Casual" value="CASUAL" />
        </ElSelect>
        <ElSwitch v-model="aiShort" active-text="Short & punchy" />
        <ElButton size="small" :loading="aiLoading" @click="openAi">Refresh</ElButton>
      </div>
      <div v-if="aiLoading" class="text-sm text-slate-500">Generating…</div>
      <div v-else class="space-y-2">
        <ElCard v-for="s in aiSuggestions" :key="s" class="cursor-pointer" @click="useSuggestion(s)">
          <div class="text-sm text-slate-800">{{ s }}</div>
          <div class="mt-1 text-2xs text-slate-500">Click to use</div>
        </ElCard>
        <div v-if="!aiSuggestions.length" class="text-sm text-slate-500">No suggestions yet.</div>
      </div>
    </ElDialog>
  </div>
</template>
