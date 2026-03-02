<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElMessage,
  ElTooltip,
} from 'element-plus';
import dayjs from 'dayjs';
import {
  listNotificationTemplates,
  updateNotificationTemplate,
  type NotificationTemplate,
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
  listNotificationFeed,
} from '../../api/notifications';
import { generateAiSuggestions } from '../../api/smartReminders';

const loading = ref(false);
const saving = ref(false);
const templates = ref<NotificationTemplate[]>([]);
const feed = ref<
  Array<{
    id: string;
    type: string;
    message: string;
    metadata: Record<string, any> | null;
    read: boolean;
    created_at: string;
  }>
>([]);
const feedLoading = ref(false);
const settingsLoading = ref(false);
const settingsSaving = ref(false);
const settings = ref<NotificationSettings | null>(null);
const settingsForm = reactive({
  notifyViaSms: true,
  notifyViaEmail: false,
  notifyInApp: true,
  smsNumbers: '' as string,
  emailAddresses: '' as string,
});
const editDialog = ref(false);
const aiDialog = ref(false);
const aiLoading = ref(false);
const aiSuggestions = ref<string[]>([]);
const aiTone = ref<'FRIENDLY' | 'URGENT' | 'PREMIUM' | 'CASUAL'>('FRIENDLY');
const aiShort = ref(false);
type NotificationEvent = NotificationTemplate['event'];

type SelectedTemplate = {
  id?: string;
  event: NotificationEvent;
  body?: string;
  enabled?: boolean;
  channel?: 'sms';
  updated_at?: string;
};

const selected = reactive<SelectedTemplate>({
  event: 'checkin',
});

const eventLabels: Record<string, string> = {
  checkin: 'Check-in confirmation',
  service_started: 'Service started',
  checkout: 'Checkout complete',
  review_request: 'Review request',
  appointment_confirmed_sms: 'Appointment confirmed (SMS reply)',
  appointment_cancelled_sms: 'Appointment cancelled (SMS reply)',
};

const eventHelpers: Record<string, string[]> = {
  checkin: ['customer_name', 'business_name', 'queue_position', 'service'],
  service_started: ['customer_name', 'business_name', 'service', 'staff_name'],
  checkout: ['customer_name', 'business_name', 'total', 'points_earned', 'points_balance'],
  review_request: ['customer_name', 'business_name', 'review_link'],
  appointment_confirmed_sms: ['customer_name', 'business_name', 'appointment_time'],
  appointment_cancelled_sms: ['customer_name', 'business_name', 'appointment_time'],
};

const load = async () => {
  loading.value = true;
  try {
    templates.value = await listNotificationTemplates();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load notifications');
  } finally {
    loading.value = false;
  }
};

const loadFeed = async () => {
  feedLoading.value = true;
  try {
    const items = await listNotificationFeed({ limit: 20 });
    feed.value = items;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load notification feed');
  } finally {
    feedLoading.value = false;
  }
};

const loadSettingsState = async () => {
  settingsLoading.value = true;
  try {
    settings.value = await getNotificationSettings();
    settingsForm.notifyViaSms = settings.value.notify_via_sms;
    settingsForm.notifyViaEmail = settings.value.notify_via_email;
    settingsForm.notifyInApp = settings.value.notify_in_app;
    settingsForm.smsNumbers = (settings.value.sms_numbers || []).join(', ');
    settingsForm.emailAddresses = (settings.value.email_addresses || []).join(', ');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load notification settings');
  } finally {
    settingsLoading.value = false;
  }
};

onMounted(() => {
  load();
  loadSettingsState();
  loadFeed();
});

const openEdit = (tpl: NotificationTemplate) => {
  Object.assign(selected, tpl);
  editDialog.value = true;
};

const insertVar = (v: string) => {
  if (!selected.body) selected.body = '';
  const token = `{{${v}}}`;
  selected.body = selected.body.includes(token) ? selected.body : `${selected.body} ${token}`.trim();
};

const charCount = computed(() => (selected.body?.length ?? 0));
const charWarning = computed(() => charCount.value > 300);

const save = async () => {
  if (!selected.id) return;
  saving.value = true;
  try {
    const updated = await updateNotificationTemplate(selected.id, {
      body: selected.body,
      enabled: selected.enabled,
    });
    templates.value = templates.value.map((t) => (t.id === updated.id ? updated : t));
    editDialog.value = false;
    ElMessage.success('Template saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save');
  } finally {
    saving.value = false;
  }
};

const toggleEnabled = async (tpl: NotificationTemplate, enabled: boolean) => {
  try {
    const updated = await updateNotificationTemplate(tpl.id, { enabled });
    templates.value = templates.value.map((t) => (t.id === updated.id ? updated : t));
  } catch (err: any) {
    ElMessage.error(err?.message || 'Toggle failed');
  }
};

const openAi = async () => {
  aiDialog.value = true;
  aiSuggestions.value = [];
  aiLoading.value = true;
  try {
    const suggestions = await generateAiSuggestions({
      context: 'NOTIFICATION',
      trigger: selected.event?.toUpperCase() ?? 'CHECKIN',
      audience: 'EVERYONE',
      channel: 'SMS',
      discount: '',
      expiry: '',
      tone: aiTone.value,
      short: aiShort.value,
      businessName: '',
    });
    aiSuggestions.value = suggestions;
  } catch (err: any) {
    ElMessage.error(err?.message || 'AI generation failed');
  } finally {
    aiLoading.value = false;
  }
};

const useSuggestion = (s: string) => {
  selected.body = s;
  aiDialog.value = false;
};

const parseList = (val: string) =>
  val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const saveSettings = async () => {
  settingsSaving.value = true;
  try {
    const updated = await updateNotificationSettings({
      notifyViaSms: settingsForm.notifyViaSms,
      notifyViaEmail: settingsForm.notifyViaEmail,
      notifyInApp: settingsForm.notifyInApp,
      smsNumbers: parseList(settingsForm.smsNumbers),
      emailAddresses: parseList(settingsForm.emailAddresses),
    });
    settings.value = updated;
    ElMessage.success('Notification settings saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save settings');
  } finally {
    settingsSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p class="text-sm text-slate-600">
          Transactional SMS for check-in, in-service, checkout, and review requests. Consent & STOP footer enforced.
        </p>
      </div>
    </div>

    <ElCard class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-base font-semibold text-slate-900">Notification settings</div>
          <div class="text-sm text-slate-600">Configure where booking alerts are sent.</div>
        </div>
        <ElButton type="primary" :loading="settingsSaving" @click="saveSettings">Save</ElButton>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">SMS alerts</span>
            <ElSwitch v-model="settingsForm.notifyViaSms" />
          </div>
          <ElFormItem label="Phone numbers (comma separated)" class="mb-0">
            <ElInput
              v-model="settingsForm.smsNumbers"
              type="textarea"
              :rows="2"
              placeholder="+1 555 123 4567, +1 512 555 0000"
            />
          </ElFormItem>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">Email alerts</span>
            <ElSwitch v-model="settingsForm.notifyViaEmail" />
          </div>
          <ElFormItem label="Emails (comma separated)" class="mb-0">
            <ElInput
              v-model="settingsForm.emailAddresses"
              type="textarea"
              :rows="2"
              placeholder="owner@example.com, desk@example.com"
            />
          </ElFormItem>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-slate-800">In-app notifications</span>
          <ElSwitch v-model="settingsForm.notifyInApp" />
        </div>
        <div class="text-xs text-slate-500">Badge + feed in admin.</div>
      </div>
    </ElCard>

    <ElCard>
      <ElTable :data="templates" :loading="loading" style="width: 100%">
        <ElTableColumn prop="event" label="Event" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-900">{{ eventLabels[row.event as NotificationEvent] }}</span>
              <ElTag size="small" effect="plain">{{ row.channel.toUpperCase() }}</ElTag>
            </div>
            <div class="text-2xs text-slate-500">Updated {{ dayjs(row.updated_at).fromNow() }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Enabled" width="120">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.enabled"
              @change="(val: string | number | boolean) => toggleEnabled(row, Boolean(val))"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Preview" min-width="260">
          <template #default="{ row }">
            <ElTooltip :content="row.body" placement="top">
              <div class="truncate text-slate-700 text-sm">{{ row.body }}</div>
            </ElTooltip>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="140">
          <template #default="{ row }">
            <ElButton size="small" type="primary" plain @click="openEdit(row)">Edit</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElCard class="space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-base font-semibold text-slate-900">Recent notifications</div>
          <div class="text-sm text-slate-600">Latest booking alerts (in-app feed).</div>
        </div>
        <ElButton size="small" plain :loading="feedLoading" @click="loadFeed">Refresh</ElButton>
      </div>
      <div v-if="feed.length === 0 && !feedLoading" class="text-sm text-slate-500">No notifications yet.</div>
      <div v-else class="space-y-2 max-h-80 overflow-y-auto">
        <div
          v-for="item in feed"
          :key="item.id"
          class="rounded-lg border border-slate-200 px-3 py-2 flex items-start gap-2"
          :class="item.read ? 'bg-white' : 'bg-indigo-50/60'"
        >
          <div class="text-xs text-slate-500">{{ dayjs(item.created_at).fromNow() }}</div>
          <div class="flex-1">
            <div class="text-sm text-slate-900">{{ item.message }}</div>
            <div v-if="item.metadata?.appointmentId" class="text-2xs text-slate-500">
              Appointment ID: {{ item.metadata.appointmentId }}
            </div>
          </div>
          <ElTag size="small" effect="plain" type="info">
            {{ eventLabels[item.type as NotificationEvent] ?? item.type }}
          </ElTag>
        </div>
      </div>
    </ElCard>

    <ElDialog v-model="editDialog" title="Edit notification" width="640px">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-slate-900">
              {{ selected.event ? eventLabels[selected.event] : '' }}
            </div>
            <div class="text-xs text-slate-500">Channel: SMS</div>
          </div>
          <ElSwitch v-model="selected.enabled" active-text="Enabled" inactive-text="Disabled" />
        </div>

        <ElForm label-position="top">
          <ElFormItem label="Message">
            <ElInput
              v-model="selected.body"
              type="textarea"
              :rows="4"
              placeholder="Enter message..."
            />
            <div class="flex items-center justify-between text-2xs mt-1 text-slate-500">
              <div class="flex flex-wrap gap-1">
                <span class="text-slate-600">Variables:</span>
                <button
                  v-for="v in (selected.event ? eventHelpers[selected.event as NotificationEvent] : [])"
                  :key="v"
                  class="var-chip"
                  type="button"
                  @click="insertVar(v)"
                >
                  {{ v }}
                </button>
              </div>
              <span :class="charWarning ? 'text-rose-600' : ''">{{ charCount }} chars</span>
            </div>
          </ElFormItem>
        </ElForm>

        <div class="flex gap-2 justify-end">
          <ElButton size="small" :loading="aiLoading" @click="openAi">Improve with AI</ElButton>
          <ElButton @click="editDialog = false">Cancel</ElButton>
          <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
        </div>
      </div>
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

<style scoped>
.var-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  transition: all 0.15s ease;
}
.var-chip:hover {
  background: #e2e8f0;
}
</style>
