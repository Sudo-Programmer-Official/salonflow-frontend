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
  heroImage: [] as string[],
  services: [{ title: '', description: '', image: [] as string[] }],
  servicesMode: 'auto',
  servicesIntro: '',
  valueProps: [''],
  hygieneNote: '',
  socialProofHeadline: '',
  socialProofBody: '',
  promoText: '',
  promoCta: '',
  promoUrl: '',
  bookingNote: '',
  faq: [{ question: '', answer: '' }],
  address: '',
  phone: '',
  hours: '',
  contactNotes: '',
  contactPolicies: '',
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
      form.value.heroImage = c.hero?.image ? [c.hero.image] : [];
      form.value.services =
        c.services?.map((s: any) => ({
          title: s?.title || s || '',
          image: s?.image ? [s.image] : [],
        })) || [{ title: '', image: [] }];
      form.value.servicesMode = c.servicesMode || c.services_mode || 'auto';
      form.value.servicesIntro = c.servicesIntro || c.services_intro || '';
      form.value.valueProps = Array.isArray(c.valueProps || c.value_props)
        ? (c.valueProps || c.value_props).map((v: any) => (typeof v === 'string' ? v : v?.title || v?.label || '')).filter(Boolean)
        : [''];
      form.value.hygieneNote = c.hygiene || c.hygieneNote || '';
      form.value.socialProofHeadline = c.socialProof?.headline || c.socialProof?.title || c.social_proof?.headline || c.social_proof?.title || '';
      form.value.socialProofBody = c.socialProof?.body || c.socialProof?.subheadline || c.social_proof?.body || c.social_proof?.subheadline || '';
      form.value.promoText = c.promo?.text || c.promo?.headline || c.promotion?.text || '';
      form.value.promoCta = c.promo?.cta || c.promo?.ctaText || c.promotion?.cta || '';
      form.value.promoUrl = c.promo?.url || c.promo?.ctaUrl || c.promotion?.url || '';
      form.value.bookingNote = c.bookingNote || c.booking_note || '';
      form.value.faq = Array.isArray(c.faq)
        ? c.faq.map((f: any) => ({
            question: f?.question || f?.q || '',
            answer: f?.answer || f?.a || '',
          }))
        : [{ question: '', answer: '' }];
      form.value.address = c.contact?.address || '';
      form.value.phone = c.contact?.phone || '';
      form.value.hours = c.contact?.hours || '';
      form.value.contactNotes = c.contact?.notes || c.contact?.parking || '';
      form.value.contactPolicies = c.contact?.policies || c.contact?.policy || '';
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

const sanitizeServices = () =>
  form.value.services
    .map((s) => ({
      title: (s.title || '').trim(),
      description: (s.description || '').trim() || null,
      image: (s.image || []).find(Boolean) || null,
    }))
    .filter((s) => s.title);
const sanitizeValueProps = () =>
  (form.value.valueProps || [])
    .map((v) => (v || '').trim())
    .filter((v) => v);
const sanitizeFaq = () =>
  (form.value.faq || [])
    .map((f) => ({
      question: (f.question || '').trim(),
      answer: (f.answer || '').trim(),
    }))
    .filter((f) => f.question && f.answer);
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
        image: form.value.heroImage[0] || null,
      },
      servicesMode: form.value.servicesMode || 'auto',
      servicesIntro: form.value.servicesIntro || '',
      valueProps: sanitizeValueProps(),
      hygiene: form.value.hygieneNote || '',
      socialProof:
        form.value.socialProofHeadline || form.value.socialProofBody
          ? {
              headline: form.value.socialProofHeadline,
              body: form.value.socialProofBody,
            }
          : null,
      promo:
        form.value.promoText || form.value.promoCta || form.value.promoUrl
          ? { text: form.value.promoText, cta: form.value.promoCta, url: form.value.promoUrl }
          : null,
      bookingNote: form.value.bookingNote || '',
      faq: sanitizeFaq(),
      services: sanitizeServices().map((svc: any) => ({
        title: svc.title,
        description: svc.description,
        image: svc.image,
      })),
      contact: {
        address: form.value.address,
        phone: form.value.phone,
        hours: form.value.hours,
        notes: form.value.contactNotes || '',
        policies: form.value.contactPolicies || '',
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

const addService = () => form.value.services.push({ title: '', description: '', image: [] });
const removeService = (idx: number) => {
  if (form.value.services.length <= 1) return;
  form.value.services.splice(idx, 1);
};
const moveService = (idx: number, dir: -1 | 1) => {
  const next = idx + dir;
  if (next < 0 || next >= form.value.services.length) return;
  const arr = form.value.services;
  if (!arr[idx] || !arr[next]) return;
  [arr[idx], arr[next]] = [arr[next], arr[idx]];
};

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
        <ElFormItem label="Hero image">
          <MediaPicker
            :model-value="form.heroImage"
            :target="{ kind: 'page', page: slug, section: 'hero', slot: 'cover' }"
            @update:modelValue="(val) => (form.heroImage = val.slice(-1))"
          />
        </ElFormItem>
        <ElFormItem label="Published">
          <ElSwitch v-model="form.published" disabled />
        </ElFormItem>

        <ElFormItem label="Services mode" class="md:col-span-2">
          <ElInput v-model="form.servicesMode" placeholder="auto | live | custom" />
          <p class="text-xs text-slate-500 mt-1">
            auto = prefer live catalog fallback to custom; live = force live catalog; custom = only use cards below.
          </p>
        </ElFormItem>

        <ElFormItem label="Services intro" class="md:col-span-2">
          <ElInput v-model="form.servicesIntro" type="textarea" :rows="2" placeholder="Short paragraph above services" />
        </ElFormItem>

        <ElFormItem label="Value props (bullets)" class="md:col-span-2">
          <div class="space-y-2">
            <div v-for="(_, idx) in form.valueProps" :key="idx" class="flex gap-2">
              <ElInput v-model="form.valueProps[idx]" placeholder="e.g. Medical-grade sanitation" />
              <ElButton size="small" @click="form.valueProps.splice(idx,1)" :disabled="form.valueProps.length <= 1">Remove</ElButton>
            </div>
            <ElButton size="small" type="primary" plain @click="form.valueProps.push('')">Add value prop</ElButton>
          </div>
        </ElFormItem>

        <ElFormItem label="Hygiene note" class="md:col-span-2">
          <ElInput v-model="form.hygieneNote" type="textarea" :rows="2" />
        </ElFormItem>

        <ElFormItem label="Social proof" class="md:col-span-2">
          <div class="grid gap-2 md:grid-cols-2">
            <ElInput v-model="form.socialProofHeadline" placeholder="Headline e.g. 4.8★ from 500+ reviews" />
            <ElInput v-model="form.socialProofBody" placeholder="Short supporting line" />
          </div>
        </ElFormItem>

        <ElFormItem label="Promo banner" class="md:col-span-2">
          <div class="grid gap-2 md:grid-cols-[1fr,180px,240px] items-center">
            <ElInput v-model="form.promoText" placeholder="Promo text" />
            <ElInput v-model="form.promoCta" placeholder="CTA text" />
            <ElInput v-model="form.promoUrl" placeholder="CTA URL" />
          </div>
        </ElFormItem>

        <ElFormItem label="Booking note" class="md:col-span-2">
          <ElInput v-model="form.bookingNote" type="textarea" :rows="2" placeholder="e.g. Prefer to talk? Call 361‑986‑1555." />
        </ElFormItem>

        <ElFormItem label="Services" class="md:col-span-2">
          <div class="space-y-3 w-full">
            <div
              v-for="(svc, idx) in form.services"
              :key="idx"
              class="grid gap-3 md:grid-cols-[1fr,220px,120px]"
            >
              <div class="space-y-2">
                <ElInput v-model="svc.title" placeholder="Service title" />
                <ElInput
                  v-model="svc.description"
                  type="textarea"
                  :rows="2"
                  placeholder="Short description (optional)"
                />
              </div>
              <MediaPicker
                :model-value="svc.image"
                :target="{ kind: 'page', page: slug, section: 'services', slot: `svc-${idx}` }"
                @update:modelValue="(val) => (svc.image = val.slice(-1))"
              />
              <div class="flex flex-col gap-2 justify-center">
                <ElButton size="small" @click="moveService(idx, -1)" :disabled="idx === 0">↑</ElButton>
                <ElButton size="small" @click="moveService(idx, 1)" :disabled="idx === form.services.length - 1">↓</ElButton>
                <ElButton size="small" type="danger" plain @click="removeService(idx)" :disabled="form.services.length <= 1">Delete</ElButton>
              </div>
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
        <ElFormItem label="Parking / access notes" class="md:col-span-2">
          <ElInput v-model="form.contactNotes" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="Policies" class="md:col-span-2">
          <ElInput v-model="form.contactPolicies" type="textarea" :rows="2" placeholder="Cancellation, late window, payments, walk-ins" />
        </ElFormItem>

        <ElFormItem label="FAQ" class="md:col-span-2">
          <div class="space-y-2">
            <div v-for="(f, idx) in form.faq" :key="idx" class="grid gap-2 md:grid-cols-2">
              <ElInput v-model="f.question" placeholder="Question" />
              <ElInput v-model="f.answer" placeholder="Answer" />
              <div class="md:col-span-2 flex gap-2">
                <ElButton size="small" @click="form.faq.splice(idx,1)" :disabled="form.faq.length <= 1">Remove</ElButton>
              </div>
            </div>
            <ElButton size="small" type="primary" plain @click="form.faq.push({ question: '', answer: '' })">Add FAQ</ElButton>
          </div>
        </ElFormItem>

        <ElFormItem label="Gallery" class="md:col-span-2">
          <MediaPicker
            v-model="form.gallery"
            :target="{ kind: 'page', page: slug, section: 'gallery' }"
          />
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>
