<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton, ElInput, ElForm, ElFormItem, ElMessage, ElTable, ElTableColumn, ElTag, ElSwitch, ElInputNumber, ElDivider, ElSelect, ElOption } from 'element-plus';
import {
  connectGoogleBusiness,
  pullGoogleBusiness,
  syncGoogleBusiness,
  fetchGoogleReviews,
  aiDraftGoogleReviewReply,
  sendGoogleReviewReply,
  updateGoogleBusinessSettings,
  googleBusinessStatus,
  type GoogleReplyPolicies,
} from '../../../api/integrations';

type GoogleBusinessStatus = Awaited<ReturnType<typeof googleBusinessStatus>>;
type ReplyTone = NonNullable<GoogleReplyPolicies['fiveStarTone']>;
type GoogleSettings = {
  autoPullReviews: boolean;
  autoReplyEnabled: boolean;
  autoReplyMinRating: number;
  replyPolicies: {
    fiveStarTone: ReplyTone;
    fourStarTone: ReplyTone;
    lowStarTone: ReplyTone;
  };
};

const form = ref({
  accessToken: '',
  refreshToken: '',
  profileName: '',
  profileId: '',
});

const connecting = ref(false);
const syncing = ref(false);
const reviews = ref<any[]>([]);
const reviewsLoading = ref(false);
const sendingMap = ref<Record<string, boolean>>({});
const draftingMap = ref<Record<string, boolean>>({});
const settingsLoading = ref(false);
const settings = ref<GoogleSettings>({
  autoPullReviews: true,
  autoReplyEnabled: false,
  autoReplyMinRating: 4,
  replyPolicies: {
    fiveStarTone: 'FRIENDLY',
    fourStarTone: 'FRIENDLY',
    lowStarTone: 'APOLOGETIC',
  },
});
const status = ref<GoogleBusinessStatus | null>(null);

const connect = async () => {
  if (!form.value.accessToken) {
    ElMessage.warning('Provide access token');
    return;
  }
  connecting.value = true;
  try {
    await connectGoogleBusiness({
      access_token: form.value.accessToken,
      refresh_token: form.value.refreshToken || undefined,
      profile_name: form.value.profileName || undefined,
      profile_id: form.value.profileId || undefined,
    });
    ElMessage.success('Connected (tokens stored)');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Connect failed');
  } finally {
    connecting.value = false;
  }
};

const pull = async () => {
  syncing.value = true;
  try {
    await pullGoogleBusiness();
    ElMessage.success('Pull enqueued');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Pull failed');
  } finally {
    syncing.value = false;
  }
};

const sync = async () => {
  syncing.value = true;
  try {
    await syncGoogleBusiness();
    ElMessage.success('Sync enqueued');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Sync failed');
  } finally {
    syncing.value = false;
  }
};

const loadStatus = async () => {
  try {
    const res = await googleBusinessStatus();
    status.value = res;
    const meta = res?.account?.meta || {};
    settings.value.autoPullReviews = meta.autoPullReviews !== false;
    settings.value.autoReplyEnabled = !!meta.autoReplyEnabled;
    settings.value.autoReplyMinRating = typeof meta.autoReplyMinRating === 'number' ? meta.autoReplyMinRating : 4;
    const fallbackTone = (val: any, d: ReplyTone): ReplyTone =>
      val === 'FRIENDLY' || val === 'PROFESSIONAL' || val === 'APOLOGETIC' ? val : d;
    settings.value.replyPolicies = {
      fiveStarTone: fallbackTone(meta.replyPolicies?.fiveStarTone, 'FRIENDLY'),
      fourStarTone: fallbackTone(meta.replyPolicies?.fourStarTone, 'FRIENDLY'),
      lowStarTone: fallbackTone(meta.replyPolicies?.lowStarTone, 'APOLOGETIC'),
    };
  } catch {
    status.value = null;
  }
};

const loadReviews = async () => {
  reviewsLoading.value = true;
  try {
    reviews.value = await fetchGoogleReviews();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load reviews');
  } finally {
    reviewsLoading.value = false;
  }
};

const draftReply = async (id: string) => {
  draftingMap.value[id] = true;
  try {
    const draft = await aiDraftGoogleReviewReply(id);
    const r = reviews.value.find((x) => x.id === id);
    if (r) {
      r.reply_text = draft;
      r.reply_status = 'draft';
    }
    ElMessage.success('Draft generated');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to draft reply');
  } finally {
    draftingMap.value[id] = false;
  }
};

const sendReply = async (id: string) => {
  const r = reviews.value.find((x) => x.id === id);
  if (!r?.reply_text) {
    ElMessage.warning('No reply text');
    return;
  }
  sendingMap.value[id] = true;
  try {
    await sendGoogleReviewReply(id, r.reply_text);
    ElMessage.success('Reply enqueued');
    await loadReviews();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to send reply');
  } finally {
    sendingMap.value[id] = false;
  }
};

const saveSettings = async () => {
  settingsLoading.value = true;
  try {
    await updateGoogleBusinessSettings({
      autoPullReviews: settings.value.autoPullReviews,
      autoReplyEnabled: settings.value.autoReplyEnabled,
      autoReplyMinRating: settings.value.autoReplyMinRating,
      replyPolicies: settings.value.replyPolicies,
    });
    ElMessage.success('Settings saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save settings');
  } finally {
    settingsLoading.value = false;
  }
};

onMounted(loadReviews);
onMounted(loadStatus);
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Google Business</span>
    </div>
    <h1 class="text-2xl font-semibold text-slate-900">Google Business Profile</h1>
    <ElCard shadow="never" class="border border-slate-200">
      <ElForm label-position="top" class="space-y-3">
        <ElFormItem label="Access token">
          <ElInput v-model="form.accessToken" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="Refresh token (optional)">
          <ElInput v-model="form.refreshToken" />
        </ElFormItem>
        <ElFormItem label="Profile name (display)">
          <ElInput v-model="form.profileName" />
        </ElFormItem>
        <ElFormItem label="Profile ID">
          <ElInput v-model="form.profileId" />
        </ElFormItem>
        <div class="flex gap-2">
          <ElButton type="primary" :loading="connecting" @click="connect">Save connection</ElButton>
          <ElButton :loading="syncing" @click="pull">Pull now</ElButton>
          <ElButton :loading="syncing" @click="sync">Sync now</ElButton>
        </div>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-800">Auto settings</div>
          <div class="text-xs text-slate-500">
            Auto-pull keeps reviews fresh; auto-reply is limited to positive ratings (default ≥4★).
          </div>
          <div v-if="status?.account?.last_error" class="text-xs text-red-600 mt-1">
            Last error: {{ status.account.last_error }}
          </div>
          <div v-if="status?.account?.display_name" class="text-xs text-slate-500">
            Connected as: {{ status.account.display_name }}
          </div>
        </div>
        <ElTag :type="status?.connected ? 'success' : 'info'" size="small">
          {{ status?.connected ? 'Connected' : 'Not connected' }}
        </ElTag>
      </div>
      <ElDivider />
      <div class="grid gap-3 md:grid-cols-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Auto-pull reviews</span>
          <ElSwitch v-model="settings.autoPullReviews" />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Auto-reply enabled</span>
          <ElSwitch v-model="settings.autoReplyEnabled" />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Auto-reply min rating</span>
          <ElInputNumber v-model="settings.autoReplyMinRating" :min="1" :max="5" />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">5★ tone</span>
          <ElSelect v-model="settings.replyPolicies.fiveStarTone" style="width: 140px">
            <ElOption label="Friendly" value="FRIENDLY" />
            <ElOption label="Professional" value="PROFESSIONAL" />
            <ElOption label="Apologetic" value="APOLOGETIC" />
          </ElSelect>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">4★ tone</span>
          <ElSelect v-model="settings.replyPolicies.fourStarTone" style="width: 140px">
            <ElOption label="Friendly" value="FRIENDLY" />
            <ElOption label="Professional" value="PROFESSIONAL" />
            <ElOption label="Apologetic" value="APOLOGETIC" />
          </ElSelect>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">1–3★ tone</span>
          <ElSelect v-model="settings.replyPolicies.lowStarTone" style="width: 140px">
            <ElOption label="Friendly" value="FRIENDLY" />
            <ElOption label="Professional" value="PROFESSIONAL" />
            <ElOption label="Apologetic" value="APOLOGETIC" />
          </ElSelect>
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <ElButton type="primary" :loading="settingsLoading" @click="saveSettings">Save settings</ElButton>
      </div>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200" :loading="reviewsLoading">
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="text-sm font-semibold text-slate-800">Reviews</div>
          <div class="text-xs text-slate-500">Draft or send replies. Auto-replies will show as sent.</div>
        </div>
        <ElButton size="small" @click="loadReviews">Refresh</ElButton>
      </div>
      <ElTable :data="reviews" size="small">
        <ElTableColumn prop="rating" label="Rating" width="80">
          <template #default="{ row }">
            <ElTag :type="row.rating >= 4 ? 'success' : 'warning'">{{ row.rating || '-' }}★</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="author_name" label="Author" width="140" />
        <ElTableColumn prop="comment" label="Comment" min-width="220" />
        <ElTableColumn label="Reply" min-width="220">
          <template #default="{ row }">
            <ElInput
              v-model="row.reply_text"
              type="textarea"
              :rows="2"
              placeholder="Draft reply"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="update_time" label="Updated" width="160" />
        <ElTableColumn prop="reply_status" label="Reply status" width="140">
          <template #default="{ row }">
            <ElTag :type="row.reply_status === 'sent' ? 'success' : row.reply_status === 'failed' ? 'danger' : row.reply_status === 'sending' ? 'warning' : 'info'">
              {{ row.reply_status || 'none' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="200">
          <template #default="{ row }">
            <ElButton size="small" plain :loading="draftingMap[row.id]" @click="draftReply(row.id)">Draft with AI</ElButton>
            <ElButton size="small" type="primary" plain :loading="sendingMap[row.id]" @click="sendReply(row.id)">Send</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
