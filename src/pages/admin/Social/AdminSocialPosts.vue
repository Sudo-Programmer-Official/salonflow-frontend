<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElDatePicker, ElButton, ElTable, ElTableColumn, ElTag, ElMessage, ElAlert } from 'element-plus';
import { listSocialPosts, createSocialDraft, publishSocialPost } from '../../../api/social';
import MediaPicker from '../../../components/website/MediaPicker.vue';
import { fetchGrowthPlan } from '../../../api/growth';
import { computed } from 'vue';

const loading = ref(false);
const posts = ref<any[]>([]);
const growthLoading = ref(false);
const socialQuota = ref<number | null>(null);
const socialUsed = ref(0);
const bannerDismissed = ref(false);

const form = ref({
  provider: 'facebook',
  content: '',
  mediaIds: [] as string[],
  scheduledAt: null as string | null,
});

const load = async () => {
  loading.value = true;
  try {
    posts.value = await listSocialPosts();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load posts');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
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

const create = async () => {
  try {
    await createSocialDraft({
      provider: form.value.provider,
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

const publish = async (row: any) => {
  try {
    await publishSocialPost(row.id, row.provider);
    ElMessage.success('Publish queued');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to publish');
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
      <ElButton size="small" @click="load">Refresh</ElButton>
    </div>

    <ElCard shadow="never" class="border border-slate-200">
      <ElForm label-position="top" class="grid gap-4 md:grid-cols-2">
        <ElFormItem label="Provider">
          <ElSelect v-model="form.provider">
            <ElOption label="Facebook Page" value="facebook" />
            <ElOption label="Google Business" value="google_business" />
          </ElSelect>
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
        </ElFormItem>
        <ElFormItem label="Media" class="md:col-span-2">
          <MediaPicker v-model="form.mediaIds" />
        </ElFormItem>
        <div class="md:col-span-2 flex justify-end">
          <ElButton type="primary" @click="create">Save draft</ElButton>
        </div>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="posts" style="width: 100%">
        <ElTableColumn prop="created_at" label="Created" width="160" />
        <ElTableColumn prop="provider" label="Provider" width="140" />
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <ElTag :type="badgeType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="content" label="Content" min-width="240" />
        <ElTableColumn label="Actions" width="160">
          <template #default="{ row }">
            <ElButton size="small" type="primary" plain @click="publish(row)" :disabled="row.status === 'published'">Publish now</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
