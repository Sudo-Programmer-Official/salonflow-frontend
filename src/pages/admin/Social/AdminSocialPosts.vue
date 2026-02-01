<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElCard, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElDatePicker, ElButton, ElTable, ElTableColumn, ElTag, ElMessage, ElAlert, ElDialog, ElRadioGroup, ElRadio, ElSpace } from 'element-plus';
import { listSocialPosts, createSocialDraft, publishSocialPost } from '../../../api/social';
import MediaPicker from '../../../components/website/MediaPicker.vue';
import { fetchGrowthPlan } from '../../../api/growth';
import {
  facebookCallback,
  facebookConnect,
  facebookSelectPage,
  facebookStatus,
  facebookDisconnect,
} from '../../../api/integrations';
import { googleBusinessStatus } from '../../../api/integrations';

const loading = ref(false);
const posts = ref<any[]>([]);
const growthLoading = ref(false);
const socialQuota = ref<number | null>(null);
const socialUsed = ref(0);
const bannerDismissed = ref(false);
const route = useRoute();
const router = useRouter();

const fbStatusLoading = ref(false);
const fbConnected = ref(false);
const fbAccount = ref<any | null>(null);
const fbPages = ref<Array<{ page_id: string; page_name: string; has_instagram: boolean }>>([]);
const fbSession = ref<string | null>(null);
const fbState = ref<string | null>(null);
const fbSelectVisible = ref(false);
const fbSelectedPage = ref<string>('');
const fbSelecting = ref(false);
const fbCallbackProcessing = ref(false);
const fbError = ref<string | null>(null);
const fbDisconnecting = ref(false);
const hasInstagram = computed(() => !!fbAccount.value?.meta?.instagramBusinessId);
const googleStatus = ref<any | null>(null);
const googleStatusLoading = ref(false);

const form = ref({
  provider: 'facebook',
  destination: 'feed' as 'feed' | 'story' | 'reel',
  content: '',
  mediaIds: [] as string[],
  scheduledAt: null as string | null,
});

const destinationsState = ref({
  facebookFeed: true,
  instagramFeed: false,
  instagramStory: false,
  instagramReel: false,
});

const selectedDestinations = computed(() => {
  const dests: Array<{ platform: string; surface: 'feed' | 'story' | 'reel' }> = [];
  if (destinationsState.value.facebookFeed) dests.push({ platform: 'facebook', surface: 'feed' });
  if (destinationsState.value.instagramFeed) dests.push({ platform: 'instagram', surface: 'feed' });
  if (destinationsState.value.instagramStory) dests.push({ platform: 'instagram', surface: 'story' });
  if (destinationsState.value.instagramReel) dests.push({ platform: 'instagram', surface: 'reel' });
  return dests;
});

const brandName = computed(() => fbAccount.value?.display_name || 'your salon');

const suggestionText = (body: string) => body.replace(/\{brand\}/g, brandName.value);

const suggestions = computed(() => {
  const today = new Date();
  const day = today.toLocaleDateString('en-US', { weekday: 'long' });
  const hasReel = selectedDestinations.value.some((d) => d.surface === 'reel');
  const hasStory = selectedDestinations.value.some((d) => d.surface === 'story');
  const base: Array<{ label: string; text: string }> = [
    {
      label: 'Availability',
      text: `{brand}: {day} openings just dropped. Comment “book” or tap the link to grab a slot.`,
    },
    {
      label: 'Service highlight',
      text: `Fresh set alert at {brand}! We’re doing gel + nail art with zero drilling. Tap to book.`,
    },
    {
      label: 'Offer',
      text: `This week only: 10% off hydration manicures. Show this post at {brand}.`,
    },
  ];
  if (hasReel) {
    base.push({
      label: 'Reel hook',
      text: `Watch the glow-up! From bare nails to glossy finish at {brand}. Save for your inspo board.`,
    });
  }
  if (hasStory) {
    base.push({
      label: 'Story CTA',
      text: `Tap “Book” in our profile — same-day spots at {brand} while they last.`,
    });
  }
  return base.map((s) => ({ ...s, text: suggestionText(s.text.replace('{day}', day)) }));
});

const applySuggestion = (text: string) => {
  form.value.content = text;
};

const load = async () => {
  loading.value = true;
  try {
    const resp = await listSocialPosts({ page: page.value, pageSize: pageSize.value });
    posts.value = resp.posts || [];
    pagination.value = resp.pagination || {
      total: resp.posts?.length || 0,
      page: page.value,
      pageSize: pageSize.value,
      pages: 1,
    };
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load posts');
  } finally {
    loading.value = false;
  }
};
const pagination = ref<{ total: number; page: number; pageSize: number; pages: number }>({
  total: 0,
  page: 1,
  pageSize: 25,
  pages: 1,
});
const page = ref(1);
const pageSize = ref(25);

const handlePageChange = async (newPage: number) => {
  page.value = newPage;
  await load();
};

const handleSizeChange = async (newSize: number) => {
  pageSize.value = newSize;
  page.value = 1;
  await load();
};

const loadStatus = async () => {
  fbStatusLoading.value = true;
  try {
    const resp = await facebookStatus();
    fbConnected.value = resp.connected;
    fbAccount.value = resp.account || null;
  } catch (err: any) {
    fbError.value = err?.message || 'Failed to load Facebook status';
  } finally {
    fbStatusLoading.value = false;
  }
};

const loadGoogleStatus = async () => {
  googleStatusLoading.value = true;
  try {
    googleStatus.value = await googleBusinessStatus();
  } catch (err: any) {
    googleStatus.value = null;
  } finally {
    googleStatusLoading.value = false;
  }
};

const refreshChannels = async () => {
  await Promise.all([loadStatus(), loadGoogleStatus()]);
};

const handleOauthCallback = async () => {
  const code = route.query.code as string | undefined;
  const state = route.query.state as string | undefined;
  if (!code || !state) return;
  fbCallbackProcessing.value = true;
  try {
    const resp = await facebookCallback(code, state);
    fbPages.value = resp.pages || [];
    fbSession.value = resp.session;
    fbState.value = resp.state;
    fbSelectVisible.value = true;
    // Remove code/state from URL to prevent repeat processing
    const newQuery = { ...route.query };
    delete newQuery.code;
    delete newQuery.state;
    router.replace({ query: newQuery });
  } catch (err: any) {
    ElMessage.error(err?.message || 'Facebook connect failed');
  } finally {
    fbCallbackProcessing.value = false;
  }
};

const connectFacebook = async () => {
  try {
    const resp = await facebookConnect();
    window.location.href = resp.url;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to start Facebook connect');
  }
};

const selectFacebookPage = async () => {
  if (!fbSelectedPage.value || !fbSession.value || !fbState.value) {
    ElMessage.warning('Select a page');
    return;
  }
  fbSelecting.value = true;
  try {
    await facebookSelectPage({
      page_id: fbSelectedPage.value,
      session: fbSession.value,
      state: fbState.value,
    });
    fbSelectVisible.value = false;
    fbSelectedPage.value = '';
    await loadStatus();
    ElMessage.success('Facebook connected');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save selection');
  } finally {
    fbSelecting.value = false;
  }
};

onMounted(load);
onMounted(loadStatus);
onMounted(loadGoogleStatus);
onMounted(handleOauthCallback);
onMounted(async () => {
  growthLoading.value = true;
  try {
    const data = await fetchGrowthPlan();
    const f = (data.features || []).find((f: any) => f.feature_key === 'social_posting');
    socialQuota.value = f?.quota ?? null;
    socialUsed.value = (data.usage || []).find((u: any) => u.metric_key === 'social_posts')?.count || 0;
  } catch {
    socialQuota.value = null;
  } finally {
    growthLoading.value = false;
  }
});

const formValidation = computed(() =>
  validateMediaForDestinations(selectedDestinations.value, form.value.mediaIds),
);

const mediaRules = computed(() => {
  const rules: string[] = [];
  const surfaces = selectedDestinations.value.map((d) => d.surface);
  if (surfaces.includes('feed')) {
    rules.push('Feed supports up to 10 images or one video.');
  }
  if (surfaces.includes('reel')) {
    rules.push('Reels require exactly 1 video.');
  }
  if (surfaces.includes('story')) {
    rules.push('Stories require exactly 1 image or video.');
  }
  return rules;
});

const maxSelectable = computed(() => (selectedDestinations.value.some((d) => d.surface === 'feed') ? 10 : null));

const create = async () => {
  if (!selectedDestinations.value.length) {
    ElMessage.error('Select at least one destination');
    return;
  }
  if (!formValidation.value.valid) {
    ElMessage.error(formValidation.value.message);
    return;
  }
  try {
    await createSocialDraft({
      provider: form.value.provider,
      destination: selectedDestinations.value[0]?.surface || 'feed',
      destinations: selectedDestinations.value,
      content: form.value.content,
      mediaIds: form.value.mediaIds,
      scheduledAt: form.value.scheduledAt,
    });
    ElMessage.success('Draft saved');
    form.value.content = '';
    form.value.mediaIds = [];
    form.value.scheduledAt = null;
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save');
  }
};

const validationForRow = (row: any) => {
  const dests = (row.destinations && row.destinations.length
    ? row.destinations.map((d: any) => ({ platform: d.platform, surface: d.surface }))
    : [{ platform: row.provider, surface: row.destination || 'feed' }]) as Array<{ platform: string; surface: 'feed' | 'story' | 'reel' }>;
  return validateMediaForDestinations(dests, row.media_ids || row.mediaIds || []);
};

const publish = async (row: any) => {
  const dests = (row.destinations && row.destinations.length
    ? row.destinations.map((d: any) => ({ platform: d.platform, surface: d.surface }))
    : [{ platform: row.provider, surface: row.destination || 'feed' }]) as Array<{ platform: string; surface: 'feed' | 'story' | 'reel' }>;
  const validation = validateMediaForDestinations(dests, row.media_ids || row.mediaIds || []);
  if (!validation.valid) {
    ElMessage.error(validation.message);
    return;
  }
  try {
    await publishSocialPost(row.id, row.provider);
    ElMessage.success('Publish queued');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to publish');
  }
};

const publishDisabled = (row: any) => {
  if (row.provider === 'facebook' && !fbConnected.value) return true;
  if (row.status === 'published') return true;
  const validation = validationForRow(row);
  return !validation.valid;
};

const validateMediaForDestinations = (
  destinations: Array<{ platform: string; surface: 'feed' | 'story' | 'reel' }>,
  mediaIds: string[],
) => {
  const count = mediaIds?.length ?? 0;
  for (const dest of destinations) {
    if (dest.surface === 'feed') {
      if (count === 0) continue; // allow text-only
      if (count > 10) return { valid: false, message: 'Feed supports up to 10 images or one video.' };
    } else if (dest.surface === 'reel') {
      if (count !== 1) return { valid: false, message: 'Reel requires exactly one video.' };
    } else if (dest.surface === 'story') {
      if (count !== 1) return { valid: false, message: 'Story requires exactly one image or video.' };
    }
  }
  return { valid: true, message: '' };
};

const disconnectFacebook = async () => {
  fbDisconnecting.value = true;
  try {
    await facebookDisconnect();
    fbConnected.value = false;
    fbAccount.value = null;
    fbPages.value = [];
    fbSession.value = null;
    fbState.value = null;
    ElMessage.success('Facebook disconnected');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to disconnect');
  } finally {
    fbDisconnecting.value = false;
  }
};

const badgeType = (status: string) => {
  switch (status) {
    case 'published':
      return 'success';
    case 'failed':
      return 'danger';
    case 'queued':
    case 'scheduled':
      return 'warning';
    default:
      return 'info';
  }
};

const quotaState = computed(() => {
  if (!socialQuota.value || socialQuota.value <= 0) return 'none';
  const used = socialUsed.value || 0;
  const percent = (used / socialQuota.value) * 100;
  if (used >= socialQuota.value) return 'exceeded';
  if (percent >= 70) return 'warning';
  return 'ok';
});

const destinationLabels = (row: any) => {
  const dests = row.destinations && row.destinations.length
    ? row.destinations
    : [{ platform: row.provider, surface: row.destination || 'feed' }];
  return dests.map((d: any) => `${d.platform}:${d.surface}`);
};
</script>

<template>
  <div class="space-y-4">
    <ElAlert
      v-if="!bannerDismissed && quotaState !== 'none'"
      :type="quotaState === 'exceeded' ? 'error' : 'warning'"
      show-icon
      closable
      @close="bannerDismissed = true"
      :title="quotaState === 'exceeded'
        ? 'You have reached your monthly social post limit.'
        : `You have used ${socialUsed} of ${socialQuota} social posts this month.`"
      class="mb-2"
    >
      <template #default>
        <div v-if="quotaState === 'exceeded'">
          Posting will resume next month, or you can upgrade for more capacity.
        </div>
        <div v-else>
          Consider upgrading to add more posts this month.
        </div>
      </template>
      <template #action>
        <ElButton size="small" type="primary" @click="$router.push({ name: 'admin-growth' })">
          Upgrade
        </ElButton>
      </template>
    </ElAlert>
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Social</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Social Posting</h1>
        <p class="text-sm text-slate-600">Compose drafts and queue publishes via the job runner.</p>
      </div>
      <div class="flex gap-2">
        <ElButton size="small" @click="refreshChannels" :loading="fbStatusLoading || googleStatusLoading">Refresh status</ElButton>
        <ElButton size="small" @click="load">Refresh posts</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-sm font-semibold text-slate-800">Connected channels</div>
          <div class="text-xs text-slate-500">Facebook / Instagram and Google Business Profile</div>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 mt-3">
        <div class="flex items-start gap-2">
          <ElTag :type="fbConnected ? 'success' : 'info'" size="small">
            {{ fbConnected ? 'Connected' : 'Not connected' }}
          </ElTag>
          <div class="text-sm text-slate-700">
            <div>Facebook / Instagram</div>
            <div class="text-xs text-slate-500">
              {{ fbAccount?.display_name || 'Not linked' }}
              <span v-if="fbAccount?.last_error" class="text-rose-600"> • {{ fbAccount.last_error }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <ElTag :type="googleStatus?.connected ? 'success' : 'info'" size="small">
            {{ googleStatus?.connected ? 'Connected' : 'Not connected' }}
          </ElTag>
          <div class="text-sm text-slate-700">
            <div>Google Business Profile</div>
            <div class="text-xs text-slate-500">
              {{ googleStatus?.account?.display_name || 'Not linked' }}
              <span v-if="googleStatus?.account?.last_error" class="text-rose-600"> • {{ googleStatus.account.last_error }}</span>
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-800 flex items-center gap-2">
            Facebook / Instagram connection
            <ElTag :type="fbConnected ? 'success' : 'info'" size="small">
              {{ fbConnected ? 'Connected' : 'Not connected' }}
            </ElTag>
          </div>
          <div class="text-xs text-slate-600">
            One Page per business; IG is derived automatically when linked.
            <span v-if="fbAccount?.meta?.instagramBusinessId">IG linked ✔️</span>
          </div>
          <div v-if="fbAccount?.display_name" class="text-xs text-slate-500">
            Page: {{ fbAccount.display_name }}
          </div>
          <div v-if="fbAccount?.last_error" class="text-xs text-red-600">
            Last error: {{ fbAccount.last_error }}
          </div>
        </div>
        <div class="flex gap-2">
          <ElButton :loading="fbStatusLoading || fbCallbackProcessing" @click="connectFacebook" type="primary">
            {{ fbConnected ? 'Reconnect' : 'Connect Facebook' }}
          </ElButton>
          <ElButton
            v-if="fbConnected"
            type="danger"
            plain
            :loading="fbDisconnecting"
            @click="disconnectFacebook"
          >
            Disconnect
          </ElButton>
          <ElButton :loading="fbStatusLoading" plain @click="loadStatus">Refresh status</ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200">
      <ElForm label-position="top" class="grid gap-4 md:grid-cols-2">
        <ElFormItem label="Provider">
          <ElSelect v-model="form.provider">
            <ElOption label="Facebook Page" value="facebook" />
            <ElOption label="Google Business" value="google_business" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Destinations">
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="destinationsState.facebookFeed" />
              <span>Facebook Feed</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="destinationsState.instagramFeed" :disabled="!hasInstagram" />
              <span class="flex items-center gap-1">
                Instagram Feed
                <ElTag v-if="!hasInstagram" size="small">IG not linked</ElTag>
              </span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="destinationsState.instagramStory" :disabled="!hasInstagram" />
              <span>Instagram Story</span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="destinationsState.instagramReel" :disabled="!hasInstagram" />
              <span>Instagram Reel</span>
            </label>
            <div class="text-xs text-slate-500">
              Rules: Story = 1 image/video. Reel = 1 video only. Feed supports text or images (up to 10) or single video.
            </div>
          </div>
        </ElFormItem>
        <ElFormItem label="Publish time">
          <ElDatePicker
            v-model="form.scheduledAt"
            type="datetime"
            placeholder="Schedule (optional)"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="Content" class="md:col-span-2">
          <ElInput type="textarea" v-model="form.content" :rows="3" placeholder="What's new?" />
          <div class="mt-2 flex flex-wrap gap-2">
            <ElButton
              v-for="s in suggestions"
              :key="s.label"
              size="small"
              plain
              @click="applySuggestion(s.text)"
            >
              {{ s.label }}
            </ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="Media" class="md:col-span-2">
          <MediaPicker
            v-model="form.mediaIds"
            :target="{ kind: 'social' }"
            :rules="mediaRules"
            :max-count="maxSelectable"
            count-label="images selected"
          />
          <div v-if="!formValidation.valid" class="text-xs text-red-600 mt-1">
            {{ formValidation.message }}
          </div>
        </ElFormItem>
        <div class="md:col-span-2 flex justify-end">
          <ElButton type="primary" @click="create" :disabled="!formValidation.valid || !selectedDestinations.length">
            Save draft
          </ElButton>
        </div>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="posts" style="width: 100%">
        <ElTableColumn prop="created_at" label="Created" width="160" />
        <ElTableColumn prop="provider" label="Provider" width="140" />
        <ElTableColumn label="Destinations" min-width="180">
          <template #default="{ row }">
            <ElTag v-for="d in destinationLabels(row)" :key="d" size="small" class="mr-1 mb-1">
              {{ d }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <ElTag :type="badgeType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="content" label="Content" min-width="240" />
        <ElTableColumn prop="error" label="Error" min-width="200">
          <template #default="{ row }">
            <span class="text-xs text-red-600" v-if="row.error">{{ row.error }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="160">
          <template #default="{ row }">
          <div class="flex flex-col gap-1">
            <ElButton
              size="small"
              type="primary"
              plain
              @click="publish(row)"
              :disabled="publishDisabled(row)"
            >
              Publish now
            </ElButton>
            <span v-if="!validationForRow(row).valid" class="text-2xs text-red-500">
              {{ validationForRow(row).message }}
            </span>
          </div>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="flex justify-end mt-3">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </ElCard>

    <ElDialog v-model="fbSelectVisible" title="Select Facebook Page" width="480px">
      <div class="space-y-3" v-if="fbPages.length">
        <ElRadioGroup v-model="fbSelectedPage">
          <ElSpace direction="vertical" alignment="start">
            <ElRadio
              v-for="p in fbPages"
              :key="p.page_id"
              :label="p.page_id"
            >
              <div class="flex flex-col">
                <span class="font-semibold">{{ p.page_name }}</span>
                <span class="text-xs text-slate-500">
                  {{ p.page_id }} • IG {{ p.has_instagram ? 'linked' : 'not linked' }}
                </span>
              </div>
            </ElRadio>
          </ElSpace>
        </ElRadioGroup>
      </div>
      <div v-else class="text-sm text-slate-600">
        No manageable Pages returned from Meta. Ensure you granted Pages permissions.
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="fbSelectVisible = false">Cancel</ElButton>
          <ElButton type="primary" :loading="fbSelecting" @click="selectFacebookPage">Connect page</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
