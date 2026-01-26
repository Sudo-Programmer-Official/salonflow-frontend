<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElTable, ElTableColumn, ElTag, ElButton, ElSelect, ElOption, ElMessage } from 'element-plus';
import { fetchWebsitePages, type WebsitePage } from '../../../api/website';
import { useRouter } from 'vue-router';

const pages = ref<WebsitePage[]>([]);
const loading = ref(false);
const locale = ref<'en' | 'es'>('en');
const router = useRouter();

const load = async () => {
  loading.value = true;
  try {
    pages.value = await fetchWebsitePages(locale.value);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load pages');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const pageName = (slug: string) => {
  switch (slug) {
    case 'home':
      return 'Home';
    case 'services':
      return 'Services';
    case 'about':
      return 'About';
    case 'contact':
      return 'Contact';
    default:
      return slug;
  }
};

const rows = computed(() => {
  const target = ['home', 'services', 'about', 'contact'];
  const map = new Map<string, WebsitePage>();
  pages.value.forEach((p) => map.set(`${p.slug}:${p.locale}`, p));
  return target.map((slug) => {
    const key = `${slug}:${locale.value}`;
    return map.get(key) ?? {
      id: `${slug}-${locale.value}`,
      business_id: '',
      slug,
      locale: locale.value,
      content: {},
      seo: {},
      published: false,
      created_at: '',
      updated_at: '',
    };
  });
});

const editPage = (row: WebsitePage) => {
  router.push({ name: 'admin-website-page-editor', params: { slug: row.slug }, query: { locale: locale.value } });
};
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Pages</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Website Pages</h1>
        <p class="text-sm text-slate-600">Manage your public-facing pages by language.</p>
      </div>
      <ElSelect v-model="locale" size="small" @change="load">
        <ElOption label="EN" value="en" />
        <ElOption label="ES" value="es" />
      </ElSelect>
    </div>

    <ElTable :data="rows" :loading="loading" style="width: 100%">
      <ElTableColumn prop="slug" label="Page" min-width="160">
        <template #default="{ row }">
          <div class="font-semibold text-slate-900">{{ pageName(row.slug) }}</div>
          <div class="text-xs text-slate-500 uppercase tracking-wide">{{ row.slug }}</div>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="locale" label="Locale" width="120">
        <template #default="{ row }">
          <ElTag>{{ row.locale.toUpperCase() }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="published" label="Published" width="140">
        <template #default="{ row }">
          <ElTag :type="row.published ? 'success' : 'info'">
            {{ row.published ? 'Published' : 'Draft' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Actions" width="150">
        <template #default="{ row }">
          <ElButton size="small" type="primary" plain @click="editPage(row)">Edit</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>
