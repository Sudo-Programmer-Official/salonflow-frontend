<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElSwitch,
  ElMessage,
} from 'element-plus';
import { fetchWebsitePages, upsertWebsitePage, type WebsitePage } from '../../../api/website';
import MediaPicker from '../../../components/website/MediaPicker.vue';

const route = useRoute();
const router = useRouter();
const slug = computed(() => (route.params.slug as string) || 'home');
const locale = computed(() => (route.query.locale as string) || 'en');

const loading = ref(false);
const saving = ref(false);
const page = ref<WebsitePage | null>(null);

const form = ref({
  heroHeadline: '',
  heroSubheadline: '',
  ctaText: '',
  services: [''],
  address: '',
  phone: '',
  hours: '',
  gallery: [] as string[], // media ids
  published: false,
});

const load = async () => {
  loading.value = true;
  try {
    const pages = await fetchWebsitePages(locale.value as 'en' | 'es');
    const match = pages.find((p) => p.slug === slug.value);
    if (match) {
      page.value = match;
      const c = match.content || {};
      form.value.heroHeadline = c.hero?.headline || '';
      form.value.heroSubheadline = c.hero?.subheadline || '';
      form.value.ctaText = c.hero?.ctaPrimary || '';
      form.value.services = c.services?.map((s: any) => s.title || '') || [''];
      form.value.address = c.contact?.address || '';
      form.value.phone = c.contact?.phone || '';
      form.value.hours = c.contact?.hours || '';
      form.value.gallery = Array.isArray(c.gallery) ? c.gallery : [];
      form.value.published = match.published;
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load page');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const sanitizeServices = () => form.value.services.filter((s) => s.trim());
const isUuid = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    val,
  );

const sanitizeGallery = () =>
  form.value.gallery
    .map((s) => (s || '').trim())
    .filter((s) => isUuid(s));

const save = async (publish: boolean) => {
  saving.value = true;
  try {
    const content = {
      hero: {
        headline: form.value.heroHeadline,
        subheadline: form.value.heroSubheadline,
        ctaPrimary: form.value.ctaText,
      },
      services: sanitizeServices().map((title: string) => ({ title, description: null })),
      contact: {
        address: form.value.address,
        phone: form.value.phone,
        hours: form.value.hours,
      },
      gallery: sanitizeGallery(), // store media IDs
    };
    const saved = await upsertWebsitePage(slug.value, locale.value as string, {
      content,
      seo: page.value?.seo || {},
      published: publish,
    });
    page.value = saved;
    form.value.published = saved.published;
    ElMessage.success(publish ? 'Published' : 'Saved as draft');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save page');
  } finally {
    saving.value = false;
  }
};

const addService = () => form.value.services.push('');

const previewPath = computed(() => {
  const prefix = locale.value === 'es' ? '/es' : '';
  const path = slug.value === 'home' ? '' : `/${slug.value}`;
  return `${prefix}${path || '/'}`;
});

const preview = () => {
  window.open(`${previewPath.value}?websitePreview=1`, '_blank');
};

const goBack = () =>
  router.push({ name: 'admin-website-pages', query: { locale: locale.value } });
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 text-xs text-slate-500">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <RouterLink class="hover:underline" :to="{ name: 'admin-website-pages', query: { locale } }">Pages</RouterLink>
      <span>/</span>
      <span class="text-slate-700 font-semibold">{{ slug }}</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Edit Page</h1>
        <p class="text-sm text-slate-600">Slug: {{ slug }} • Locale: {{ locale.toUpperCase() }}</p>
      </div>
      <div class="flex gap-2">
        <ElButton plain @click="goBack">Back to pages</ElButton>
        <ElButton plain @click="preview">Preview</ElButton>
        <ElButton :loading="saving" @click="save(false)">Save Draft</ElButton>
        <ElButton type="primary" :loading="saving" @click="save(true)">Publish</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElForm label-position="top" class="grid gap-4 md:grid-cols-2">
        <ElFormItem label="Hero headline" class="md:col-span-2">
          <ElInput v-model="form.heroHeadline" />
        </ElFormItem>
        <ElFormItem label="Hero subheadline" class="md:col-span-2">
          <ElInput v-model="form.heroSubheadline" />
        </ElFormItem>
        <ElFormItem label="CTA text">
          <ElInput v-model="form.ctaText" />
        </ElFormItem>
        <ElFormItem label="Published">
          <ElSwitch v-model="form.published" disabled />
        </ElFormItem>

        <ElFormItem label="Services (one per line)" class="md:col-span-2">
          <div class="space-y-2 w-full">
            <div v-for="(_, idx) in form.services" :key="idx" class="flex gap-2">
              <ElInput v-model="form.services[idx]" placeholder="Service title" />
            </div>
            <ElButton size="small" type="primary" plain @click="addService">Add service</ElButton>
          </div>
        </ElFormItem>

        <ElFormItem label="Address" class="md:col-span-2">
          <ElInput v-model="form.address" />
        </ElFormItem>
        <ElFormItem label="Phone">
          <ElInput v-model="form.phone" />
        </ElFormItem>
        <ElFormItem label="Hours">
          <ElInput v-model="form.hours" />
        </ElFormItem>

        <ElFormItem label="Gallery" class="md:col-span-2">
          <MediaPicker v-model="form.gallery" />
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>
