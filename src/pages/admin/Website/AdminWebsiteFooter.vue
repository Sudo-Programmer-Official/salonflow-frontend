<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElSwitch,
  ElButton,
  ElMessage,
  ElDivider,
  ElCheckbox,
} from 'element-plus';
import { fetchWebsiteLayout, saveWebsiteFooter, type WebsiteFooterConfig } from '../../../api/website';
import { clearWebsiteCache } from '../../../composables/useWebsite';

type HoursRow = { day: string; open: string; close: string };

const defaultHours = (): HoursRow[] => [
  { day: 'Mon', open: '', close: '' },
  { day: 'Tue', open: '', close: '' },
  { day: 'Wed', open: '', close: '' },
  { day: 'Thu', open: '', close: '' },
  { day: 'Fri', open: '', close: '' },
  { day: 'Sat', open: '', close: '' },
  { day: 'Sun', open: '', close: '' },
];

const loading = ref(false);
const saving = ref(false);
const form = reactive({
  enabled: true,
  location: {
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
  },
  contact: {
    phone: '',
    email: '',
  },
  hoursSource: 'manual' as 'manual' | 'kiosk',
  hours: defaultHours(),
  social: {
    instagram: '',
    facebook: '',
    google: '',
  },
  legal: {
    showPrivacy: true,
    showTerms: true,
    showDataDeletion: true,
    copyrightText: '',
  },
});

const mapFromConfig = (cfg: WebsiteFooterConfig) => {
  form.enabled = cfg.enabled !== false;
  form.location = {
    addressLine1: cfg.location?.addressLine1 || '',
    city: cfg.location?.city || '',
    state: cfg.location?.state || '',
    zip: cfg.location?.zip || '',
  };
  form.contact = {
    phone: cfg.contact?.phone || '',
    email: cfg.contact?.email || '',
  };
  form.hoursSource = cfg.hours?.source === 'kiosk' ? 'kiosk' : 'manual';
  form.hours = cfg.hours?.manual?.length ? cfg.hours.manual : defaultHours();
  form.social = {
    instagram: cfg.social?.instagram || '',
    facebook: cfg.social?.facebook || '',
    google: cfg.social?.google || '',
  };
  form.legal = {
    showPrivacy: cfg.legal?.showPrivacy !== false,
    showTerms: cfg.legal?.showTerms !== false,
    showDataDeletion: cfg.legal?.showDataDeletion !== false,
    copyrightText: cfg.legal?.copyrightText || '',
  };
};

const load = async () => {
  loading.value = true;
  try {
    const layout = await fetchWebsiteLayout();
    if (layout?.footer) {
      mapFromConfig(layout.footer);
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load footer');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const validatePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  throw new Error('Phone must be 10 digits');
};

const validateEmail = (email: string) => {
  if (!email) return '';
  const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!regex.test(email)) throw new Error('Enter a valid email');
  return email;
};

const buildPayload = (): WebsiteFooterConfig => ({
  enabled: form.enabled,
  location: form.location.addressLine1
    ? {
        addressLine1: form.location.addressLine1.trim(),
        city: form.location.city.trim(),
        state: form.location.state.trim(),
        zip: form.location.zip.trim(),
      }
    : null,
  contact: {
    phone: form.contact.phone.trim() || null,
    email: form.contact.email.trim() || null,
  },
  hours: {
    source: form.hoursSource,
    manual: form.hoursSource === 'manual' ? form.hours.filter((h) => h.day && h.open && h.close) : [],
  },
  social: {
    instagram: form.social.instagram.trim() || null,
    facebook: form.social.facebook.trim() || null,
    google: form.social.google.trim() || null,
  },
  legal: {
    showPrivacy: form.legal.showPrivacy,
    showTerms: form.legal.showTerms,
    showDataDeletion: form.legal.showDataDeletion,
    copyrightText: form.legal.copyrightText.trim() || undefined,
  },
});

const save = async () => {
  try {
    const payload = buildPayload();
    if (payload.contact?.phone) payload.contact.phone = validatePhone(payload.contact.phone);
    if (payload.contact?.email) payload.contact.email = validateEmail(payload.contact.email);
    saving.value = true;
    await saveWebsiteFooter(payload);
    clearWebsiteCache();
    ElMessage.success('Footer saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save footer');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Footer</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Footer</h1>
        <p class="text-sm text-slate-600">Control contact, hours, social, and legal links on your public site.</p>
      </div>
      <ElSwitch v-model="form.enabled" active-text="Enabled" inactive-text="Hidden" />
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElForm label-position="top" class="grid gap-4 md:grid-cols-2">
        <ElFormItem label="Address line">
          <ElInput v-model="form.location.addressLine1" placeholder="123 Main St" />
        </ElFormItem>
        <ElFormItem label="City">
          <ElInput v-model="form.location.city" placeholder="City" />
        </ElFormItem>
        <ElFormItem label="State">
          <ElInput v-model="form.location.state" placeholder="State" />
        </ElFormItem>
        <ElFormItem label="ZIP">
          <ElInput v-model="form.location.zip" placeholder="ZIP" />
        </ElFormItem>

        <ElDivider class="md:col-span-2">Contact</ElDivider>
        <ElFormItem label="Phone">
          <ElInput v-model="form.contact.phone" placeholder="(555) 123-4567" />
        </ElFormItem>
        <ElFormItem label="Email">
          <ElInput v-model="form.contact.email" placeholder="you@example.com" />
        </ElFormItem>

        <ElDivider class="md:col-span-2">Hours</ElDivider>
        <div class="md:col-span-2 flex items-center gap-3">
          <ElSwitch v-model="form.hoursSource" active-value="kiosk" inactive-value="manual" />
          <div class="text-sm text-slate-700">
            Use kiosk business hours
            <span class="text-slate-500">(manual hours hidden when kiosk is on)</span>
          </div>
        </div>
        <div v-if="form.hoursSource === 'manual'" class="md:col-span-2 grid gap-2 sm:grid-cols-2">
          <div v-for="(row, idx) in form.hours" :key="row.day + idx" class="flex items-center gap-2">
            <ElInput v-model="row.day" class="w-20" placeholder="Mon" />
            <ElInput v-model="row.open" placeholder="9:00 AM" />
            <span class="text-slate-500">–</span>
            <ElInput v-model="row.close" placeholder="5:00 PM" />
          </div>
        </div>

        <ElDivider class="md:col-span-2">Social</ElDivider>
        <ElFormItem label="Instagram">
          <ElInput v-model="form.social.instagram" placeholder="https://instagram.com/yourhandle" />
        </ElFormItem>
        <ElFormItem label="Facebook">
          <ElInput v-model="form.social.facebook" placeholder="https://facebook.com/yourpage" />
        </ElFormItem>
        <ElFormItem label="Google">
          <ElInput v-model="form.social.google" placeholder="Google Business URL" />
        </ElFormItem>

        <ElDivider class="md:col-span-2">Legal</ElDivider>
        <ElFormItem label="Show privacy link">
          <ElCheckbox v-model="form.legal.showPrivacy">Show</ElCheckbox>
        </ElFormItem>
        <ElFormItem label="Show terms link">
          <ElCheckbox v-model="form.legal.showTerms">Show</ElCheckbox>
        </ElFormItem>
        <ElFormItem label="Show data deletion link">
          <ElCheckbox v-model="form.legal.showDataDeletion">Show</ElCheckbox>
        </ElFormItem>
        <ElFormItem label="Copyright text" class="md:col-span-2">
          <ElInput v-model="form.legal.copyrightText" placeholder="© 2026 Your Salon" />
        </ElFormItem>
      </ElForm>

      <div class="mt-4 flex justify-end">
        <ElButton type="primary" :loading="saving" @click="save">Save footer</ElButton>
      </div>
    </ElCard>
  </div>
</template>
