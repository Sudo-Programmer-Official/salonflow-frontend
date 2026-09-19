<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchDemoTemplateCatalog,
  preparePublicDemo,
  savePublicDemoLead,
  type PublicDemoAccess,
  type PublicDemoTemplateOption,
} from '@/api/publicDemoRequests';
import {
  demoDeliveryMessage,
  validateDemoFunnelStep,
  validateDemoFunnelSubmission,
} from '@/utils/demoFunnelValidation';

const steps = [
  { number: 1, label: 'About you' },
  { number: 2, label: 'Contact details' },
  { number: 3, label: 'Business type' },
];

const interestOptions = [
  { value: 'check-in-queue', label: 'Customer check-in & queue', icon: '👥' },
  { value: 'staff-management', label: 'Staff management & scheduling', icon: '🧑‍💼' },
  { value: 'checkout-pos', label: 'Checkout / POS', icon: '▣' },
  { value: 'loyalty-rewards', label: 'Loyalty & rewards', icon: '♡' },
  { value: 'bookings', label: 'Bookings & appointments', icon: '▦' },
  { value: 'everything', label: 'Show me everything', icon: '✦' },
];

const step = ref(1);
const name = ref('');
const businessName = ref('');
const businessType = ref('');
const templateKey = ref('');
const email = ref('');
const phone = ref('');
const interests = ref<string[]>([]);
const draftToken = ref<string | null>(null);
const errorMessage = ref('');
const submitted = ref(false);
const submitting = ref(false);
const access = ref<PublicDemoAccess | null>(null);
const businessTypeOptions = ref<PublicDemoTemplateOption[]>([]);
const templateCatalogLoading = ref(true);
const templateCatalogError = ref('');
let draftTimer: ReturnType<typeof setTimeout> | null = null;

const answers = computed(() => ({
  name: name.value,
  businessName: businessName.value,
  businessType: businessType.value,
  email: email.value,
  phone: phone.value,
}));

const selectedTemplate = computed(() =>
  businessTypeOptions.value.find(
    (option) => option.templateKey === templateKey.value || option.businessTypes.includes(businessType.value),
  ) ?? null,
);

const deliveryMessage = computed(() =>
  demoDeliveryMessage(access.value?.emailStatus, access.value?.smsStatus),
);

const progressWidth = computed(() => `${((step.value - 1) / 2) * 67}%`);

const saveDraft = async () => {
  if (submitted.value || !name.value.trim() || submitting.value) return;
  try {
    const result = await savePublicDemoLead({
      draftToken: draftToken.value,
      mode: 'draft',
      name: name.value,
      businessName: businessName.value,
      businessType: businessType.value,
      templateKey: templateKey.value || undefined,
      email: email.value || undefined,
      phone: phone.value || undefined,
      interests: interests.value,
      progressStep: step.value,
    });
    if (result.draftToken) draftToken.value = result.draftToken;
  } catch {
    // Draft persistence is best effort; it must never turn into a submitted request.
  }
};

const queueDraftSave = () => {
  if (!name.value.trim() || submitted.value) return;
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => void saveDraft(), 500);
};

const toggleInterest = (value: string) => {
  if (value === 'everything') {
    interests.value = interests.value.includes(value) ? [] : ['everything'];
    return;
  }
  interests.value = interests.value.filter((item) => item !== 'everything');
  interests.value = interests.value.includes(value)
    ? interests.value.filter((item) => item !== value)
    : [...interests.value, value];
};

const selectTemplate = (option: PublicDemoTemplateOption) => {
  templateKey.value = option.templateKey;
  businessType.value = option.businessTypes[0] ?? '';
  errorMessage.value = '';
};

const goToStep = (nextStep: number) => {
  errorMessage.value = '';
  step.value = nextStep;
  queueDraftSave();
};

const next = () => {
  if (step.value === 2 && (templateCatalogLoading.value || templateCatalogError.value)) {
    errorMessage.value = templateCatalogError.value || 'Loading demo options…';
    return;
  }
  const validationError = validateDemoFunnelStep(step.value, answers.value);
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }
  goToStep(Math.min(3, step.value + 1));
};

const back = () => {
  errorMessage.value = '';
  goToStep(Math.max(1, step.value - 1));
};

const submit = async () => {
  errorMessage.value = validateDemoFunnelSubmission(answers.value) || '';
  if (errorMessage.value || submitting.value) return;

  if (templateCatalogLoading.value) {
    errorMessage.value = 'Loading demo options…';
    return;
  }
  if (templateCatalogError.value) {
    errorMessage.value = templateCatalogError.value;
    return;
  }
  if (!selectedTemplate.value) {
    errorMessage.value = 'Choose an available business type.';
    return;
  }

  if (draftTimer) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  submitting.value = true;
  try {
    const lead = await savePublicDemoLead({
      draftToken: draftToken.value,
      mode: 'final',
      name: name.value,
      businessName: businessName.value,
      businessType: businessType.value,
      templateKey: selectedTemplate.value.templateKey,
      email: email.value,
      phone: phone.value,
      interests: interests.value,
      progressStep: 3,
    });
    if (!lead.leadId) throw new Error('We could not create your demo request. Please try again.');

    if (!lead.deliveryToken) throw new Error('We could not create a secure demo handoff. Please try again.');
    const demoAccess = await preparePublicDemo(lead.deliveryToken);
    access.value = demoAccess;
    submitted.value = true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'We could not prepare your demo. Please try again.';
  } finally {
    submitting.value = false;
  }
};

const copyText = async (value: string) => {
  if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
    ElMessage.error('Unable to copy link');
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    ElMessage.error('Unable to copy link');
    return false;
  }
};

const copyLink = async () => {
  if (!access.value) return;
  if (await copyText(access.value.accessUrl)) {
    ElMessage.success('Link copied');
  }
};

onBeforeUnmount(() => {
  if (draftTimer) clearTimeout(draftTimer);
});

onMounted(async () => {
  try {
    businessTypeOptions.value = await fetchDemoTemplateCatalog();
    if (businessTypeOptions.value.length === 0) {
      throw new Error('No demo experiences are currently enabled.');
    }
  } catch (error) {
    templateCatalogError.value = error instanceof Error ? error.message : 'Demo options are temporarily unavailable.';
  } finally {
    templateCatalogLoading.value = false;
  }
});

watch([step, name, businessName, businessType, templateKey, email, phone, interests], queueDraftSave, { deep: true });
</script>

<template>
  <div class="demo-funnel min-h-full bg-white text-slate-950">
    <section class="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20">
      <div v-if="!submitted" class="mx-auto max-w-5xl">
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm font-medium text-slate-500">A simple way to see SalonFlow in action.</div>
          <div class="hidden text-xs font-medium text-slate-400 sm:block">Takes less than a minute</div>
        </div>

        <div class="relative mx-auto mt-10 max-w-3xl px-2 sm:mt-14">
          <div class="absolute left-[16.5%] right-[16.5%] top-5 h-px bg-slate-200" />
          <div
            class="absolute left-[16.5%] top-5 h-px bg-blue-600 transition-all duration-300"
            :style="{ width: progressWidth }"
          />
          <div class="relative grid grid-cols-3 gap-2">
            <button
              v-for="item in steps"
              :key="item.number"
              type="button"
              class="group flex flex-col items-center gap-2 text-center"
              :aria-current="step === item.number ? 'step' : undefined"
              @click="item.number < step ? goToStep(item.number) : undefined"
            >
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition"
                :class="item.number <= step ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-500'"
              >
                <span v-if="item.number < step">✓</span>
                <span v-else>{{ item.number }}</span>
              </span>
              <span class="text-xs font-medium" :class="item.number === step ? 'text-slate-950' : 'text-slate-500'">
                {{ item.label }}
              </span>
            </button>
          </div>
        </div>

        <div class="mx-auto mt-12 max-w-4xl sm:mt-16">
          <div v-if="step === 1" class="grid gap-8 lg:grid-cols-[1fr,0.78fr] lg:items-center">
            <div>
              <h1 class="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Let’s get started</h1>
              <p class="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Tell us a little about you and your salon so we can prepare the right demo experience.
              </p>
            </div>
            <div class="hidden overflow-hidden rounded-3xl bg-slate-100 lg:block">
              <img src="/images/landing/marketing-feature-operations.jpg" alt="SalonFlow salon operations" class="h-64 w-full object-cover" />
            </div>
          </div>

          <div v-else-if="step === 2">
            <h1 class="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Where should we send your demo?</h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              We’ll send your private demo link to your email and phone.
            </p>
          </div>

          <div v-else>
            <h1 class="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">What kind of business do you run?</h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              We’ll tailor your demo so it feels familiar to your business.
            </p>
          </div>

          <form class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8" @submit.prevent="step === 3 ? submit() : next()">
            <div v-if="step === 1" class="space-y-5">
              <label class="block">
                <span class="text-sm font-semibold text-slate-900">Your name <span class="text-pink-500">*</span></span>
                <input v-model="name" autocomplete="name" type="text" placeholder="e.g. Natalie" class="demo-input mt-2" />
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-900">Salon or business name <span class="text-pink-500">*</span></span>
                <input v-model="businessName" autocomplete="organization" type="text" placeholder="e.g. Glow House Salon" class="demo-input mt-2" />
              </label>
            </div>

            <div v-else-if="step === 2" class="space-y-5">
              <label class="block">
                <span class="text-sm font-semibold text-slate-900">Mobile phone <span class="text-pink-500">*</span></span>
                <input v-model="phone" autocomplete="tel" type="tel" placeholder="e.g. (361) 555-0184" class="demo-input mt-2" />
                <span class="mt-2 block text-xs text-slate-500">We’ll send your demo details by SMS.</span>
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-900">Email address <span class="text-pink-500">*</span></span>
                <input v-model="email" autocomplete="email" type="email" placeholder="e.g. natalie@glowhouse.com" class="demo-input mt-2" />
                <span class="mt-2 block text-xs text-slate-500">We’ll send your demo details by email.</span>
              </label>
            </div>

            <div v-else>
              <div class="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                v-for="option in businessTypeOptions"
                :key="option.templateKey"
                type="button"
                class="flex min-h-24 items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition"
                :class="selectedTemplate?.templateKey === option.templateKey ? 'border-blue-500 bg-blue-50 text-slate-950 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
                :aria-pressed="selectedTemplate?.templateKey === option.templateKey"
                @click="selectTemplate(option)"
              >
                <span>
                  <span class="block text-base font-semibold">{{ option.label }}</span>
                  <span class="mt-1 block text-sm text-slate-500">{{ option.detail }}</span>
                </span>
                <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" :class="selectedTemplate?.templateKey === option.templateKey ? 'border-blue-600 bg-blue-600 text-xs text-white' : 'border-slate-300'">{{ selectedTemplate?.templateKey === option.templateKey ? '✓' : '' }}</span>
              </button>
              <div v-if="!templateCatalogLoading && businessTypeOptions.length <= 1" class="flex min-h-24 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                More business types coming soon.
              </div>
              </div>

              <div class="mt-10">
                <h2 class="text-lg font-semibold text-slate-950">Anything you especially want to explore?</h2>
                <p class="mt-1 text-sm text-slate-500">Optional—we’ll show you the full SalonFlow experience either way.</p>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                v-for="option in interestOptions"
                :key="option.value"
                type="button"
                class="flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition"
                :class="interests.includes(option.value) ? 'border-blue-500 bg-blue-50 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
                @click="toggleInterest(option.value)"
              >
                <span class="flex items-center gap-3 text-sm font-semibold"><span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">{{ option.icon }}</span>{{ option.label }}</span>
                <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border" :class="interests.includes(option.value) ? 'border-blue-600 bg-blue-600 text-xs text-white' : 'border-slate-300'">{{ interests.includes(option.value) ? '✓' : '' }}</span>
              </button>
              </div>
              <p v-if="templateCatalogLoading" class="mt-4 text-sm text-slate-500">Loading available business types…</p>
              <p v-if="templateCatalogError" class="mt-4 text-sm text-rose-600">{{ templateCatalogError }}</p>
            </div>

            <p v-if="errorMessage" class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {{ errorMessage }}
            </p>

            <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button v-if="step > 1" type="button" class="demo-secondary-button" @click="back">← Back</button>
              <span v-else />
              <button type="submit" class="demo-primary-button" :disabled="submitting">
                <span v-if="submitting">Preparing your demo…</span>
                <span v-else>{{ step === 3 ? 'Get My Demo →' : 'Continue →' }}</span>
              </button>
            </div>
          </form>
          <p class="mt-5 text-center text-xs text-slate-500">No credit card required. Your information is safe with us.</p>
        </div>
      </div>

      <div v-else-if="access" class="mx-auto max-w-3xl py-10 text-center sm:py-16">
        <div class="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
        <h1 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Your SalonFlow demo is ready 🎉</h1>
        <p class="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
          {{ deliveryMessage }}
        </p>

        <div class="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div class="divide-y divide-slate-100">
            <div class="flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
              <div><div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your private demo link</div><a :href="access.accessUrl" target="_blank" rel="noreferrer" class="mt-1 block break-all text-sm font-semibold text-blue-600">{{ access.accessUrl }}</a></div>
              <button type="button" class="copy-button" @click="copyLink">Copy Link</button>
            </div>
            <div class="flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
              <div><div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Access expires</div><div class="mt-1 text-sm font-semibold text-slate-900">{{ new Date(access.expiresAt).toLocaleString() }}</div></div>
            </div>
          </div>
        </div>

        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" class="demo-primary-button" @click="copyLink">Copy Link</button>
          <a :href="access.accessUrl" target="_blank" rel="noreferrer" class="demo-secondary-button">Open My Demo →</a>
        </div>
        <p class="mt-6 text-sm text-slate-500">Explore check-in, staff management, checkout, loyalty, and more. We’ll follow up soon to see how it’s going.</p>
        <RouterLink to="/" class="mt-8 inline-block text-sm font-semibold text-slate-600 hover:text-slate-950">Back to SalonFlow</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.demo-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.875rem;
  background: #fff;
  padding: 0.85rem 1rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.demo-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
}
.demo-primary-button,
.demo-secondary-button,
.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition: transform 0.2s, background-color 0.2s, border-color 0.2s;
}
.demo-primary-button {
  min-height: 3rem;
  background: #1769ff;
  padding: 0.75rem 1.35rem;
  color: #fff;
}
.demo-primary-button:hover:not(:disabled) { transform: translateY(-1px); background: #1258d8; }
.demo-primary-button:disabled { cursor: wait; opacity: 0.65; }
.demo-secondary-button {
  min-height: 3rem;
  border: 1px solid #dbe2ec;
  padding: 0.75rem 1.35rem;
  color: #334155;
}
.demo-secondary-button:hover { border-color: #94a3b8; background: #f8fafc; }
.copy-button {
  flex-shrink: 0;
  border: 1px solid #dbe2ec;
  padding: 0.5rem 0.7rem;
  color: #475569;
}
.copy-button:hover { border-color: #93c5fd; color: #1d4ed8; }
</style>
