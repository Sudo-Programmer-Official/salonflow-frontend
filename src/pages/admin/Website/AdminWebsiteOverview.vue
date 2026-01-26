<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElTag, ElMessage, ElSelect, ElOption } from 'element-plus';
import { fetchWebsiteSite, type WebsiteSite, type WebsiteDomain } from '../../../api/website';

const loading = ref(false);
const site = ref<WebsiteSite | null>(null);
const domains = ref<WebsiteDomain[]>([]);
const locale = ref<'en' | 'es'>('en');

const primaryDomain = computed(() => {
  if (!site.value) return '';
  const primary =
    domains.value.find((d) => d.is_primary) ||
    domains.value.find((d) => d.verified) ||
    null;
  return primary?.domain || site.value.primary_domain || site.value.default_domain;
});

const badgeType = (d: WebsiteDomain) => (d.verified ? 'success' : 'info');
const badgeText = (d: WebsiteDomain) => (d.verified ? 'Verified' : 'Pending');

const load = async () => {
  loading.value = true;
  try {
    const res = await fetchWebsiteSite(locale.value);
    site.value = res.site;
    domains.value = res.domains;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load website');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const go = (name: string) => {
  window.location.href = `/admin/${name}`;
};

const previewUrl = computed(() =>
  primaryDomain.value ? `https://${primaryDomain.value}` : 'https://salonflow.studio',
);

const openPreview = () => window.open(previewUrl.value, '_blank');
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Website</h1>
        <p class="text-sm text-slate-600">Manage your public website content, domains, and publishing.</p>
      </div>
      <div class="flex items-center gap-2">
        <ElSelect v-model="locale" size="small" @change="load">
          <ElOption label="EN" value="en" />
          <ElOption label="ES" value="es" />
        </ElSelect>
        <ElButton type="primary" plain @click="openPreview">Preview Website</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="space-y-1">
          <div class="text-sm font-semibold text-slate-800">Primary domain</div>
          <div class="text-base text-slate-900 break-words">{{ primaryDomain }}</div>
          <div class="flex flex-wrap gap-2">
            <ElTag
              v-for="d in domains"
              :key="d.id"
              :type="badgeType(d)"
              effect="plain"
              class="mr-1"
            >
              {{ d.domain }} — {{ badgeText(d) }}
            </ElTag>
          </div>
        </div>

        <div class="space-y-1">
          <div class="text-sm font-semibold text-slate-800">Publish status</div>
          <ElTag :type="site?.published ? 'success' : 'info'">
            {{ site?.published ? 'Published' : 'Draft' }}
          </ElTag>
        </div>

        <div class="space-y-2">
          <div class="text-sm font-semibold text-slate-800">Actions</div>
          <div class="flex flex-wrap gap-2">
            <ElButton size="small" type="primary" plain @click="go('website/pages')">Edit Pages</ElButton>
            <ElButton size="small" type="info" plain @click="go('website/domains')">Manage Domains</ElButton>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>
