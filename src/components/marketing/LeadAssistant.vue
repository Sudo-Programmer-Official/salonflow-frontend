<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiUrl, buildHeaders } from '@/api/client';

type StepId =
  | 'name'
  | 'businessName'
  | 'primaryGoal'
  | 'teamSize'
  | 'biggestPain'
  | 'timeline'
  | 'contact';

type ChoiceOption = {
  label: string;
  value: string;
  detail: string;
};

type TranscriptEntry = {
  role: 'assistant' | 'lead';
  message: string;
};

const props = withDefaults(
  defineProps<{
    source?: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
  }>(),
  {
    source: 'marketing-lead-assistant',
    title: 'AI Growth Assistant',
    subtitle: 'Answer a few quick questions and we will tailor the best SalonFlow setup for your salon.',
    ctaLabel: 'Get My Demo Plan',
  },
);

const route = useRoute();

const steps: Array<{ id: StepId; prompt: string }> = [
  { id: 'name', prompt: 'First, what should I call you?' },
  { id: 'businessName', prompt: 'What is the name of your salon or studio?' },
  { id: 'primaryGoal', prompt: 'What would make SalonFlow most valuable for you right now?' },
  { id: 'teamSize', prompt: 'How big is your team today?' },
  { id: 'biggestPain', prompt: 'What is the biggest bottleneck slowing the business down?' },
  { id: 'timeline', prompt: 'How soon are you looking to improve this?' },
  { id: 'contact', prompt: 'Where should we send your plan and how should we follow up?' },
];

const goalOptions: ChoiceOption[] = [
  {
    label: 'More bookings',
    value: 'More bookings',
    detail: 'Website, booking flow, promotions, and faster follow-up.',
  },
  {
    label: 'Fewer no-shows',
    value: 'Fewer no-shows',
    detail: 'Reminders, confirmations, and a cleaner front-desk workflow.',
  },
  {
    label: 'Better repeat visits',
    value: 'Better repeat visits',
    detail: 'Reviews, loyalty, offers, and outreach that bring guests back.',
  },
  {
    label: 'Run everything in one place',
    value: 'Run everything in one place',
    detail: 'Website, booking, CRM, SMS, and POS rollout under one system.',
  },
];

const teamSizeOptions: ChoiceOption[] = [
  { label: 'Just me', value: 'Just me', detail: 'Owner-operated or solo chair setup.' },
  { label: '2 to 5', value: '2-5 team members', detail: 'Small team that needs consistency and follow-up.' },
  { label: '6 to 10', value: '6-10 team members', detail: 'Growing team needing stronger operations.' },
  { label: '10+', value: '10+ team members', detail: 'Multi-staff salon needing structure and visibility.' },
];

const timelineOptions: ChoiceOption[] = [
  { label: 'This week', value: 'This week', detail: 'Ready to move fast.' },
  { label: 'This month', value: 'This month', detail: 'Actively evaluating options.' },
  { label: 'Next quarter', value: 'Next quarter', detail: 'Planning ahead but serious.' },
];

const contactOptions: ChoiceOption[] = [
  { label: 'Email me', value: 'Email', detail: 'Best for a tailored plan and written follow-up.' },
  { label: 'Call me', value: 'Call', detail: 'Best if you want a walkthrough with questions answered live.' },
  { label: 'Text me', value: 'Text', detail: 'Best for quick follow-up and scheduling.' },
];

const answers = reactive({
  name: '',
  businessName: '',
  primaryGoal: '',
  teamSize: '',
  biggestPain: '',
  timeline: '',
  preferredContact: 'Email',
  email: '',
  phone: '',
});

const stepIndex = ref(0);
const busy = ref(false);
const success = ref(false);
const error = ref('');

const activeStep = computed(() => steps[stepIndex.value] ?? null);
const progress = computed(() => Math.round((stepIndex.value / steps.length) * 100));

const initialAssistantMessage =
  'I help salon owners figure out the fastest path to more bookings, smoother operations, and more repeat visits. This takes about 60 seconds.';

const answerForStep = (stepId: StepId): string => {
  switch (stepId) {
    case 'name':
      return answers.name.trim();
    case 'businessName':
      return answers.businessName.trim();
    case 'primaryGoal':
      return answers.primaryGoal.trim();
    case 'teamSize':
      return answers.teamSize.trim();
    case 'biggestPain':
      return answers.biggestPain.trim();
    case 'timeline':
      return answers.timeline.trim();
    case 'contact': {
      const parts = [
        answers.email.trim(),
        answers.phone.trim() ? `${answers.preferredContact} at ${answers.phone.trim()}` : answers.preferredContact,
      ].filter(Boolean);
      return parts.join(' · ');
    }
  }
};

const completedConversation = computed<TranscriptEntry[]>(() => {
  const transcript: TranscriptEntry[] = [{ role: 'assistant', message: initialAssistantMessage }];

  steps.forEach((step, index) => {
    if (index > stepIndex.value) return;
    if (index === stepIndex.value && step.id !== 'contact' && !answerForStep(step.id)) {
      transcript.push({ role: 'assistant', message: step.prompt });
      return;
    }
    if (index === stepIndex.value && step.id === 'contact' && !success.value) {
      transcript.push({ role: 'assistant', message: step.prompt });
      return;
    }

    const answer = answerForStep(step.id);
    if (!answer) return;
    transcript.push({ role: 'assistant', message: step.prompt });
    transcript.push({ role: 'lead', message: answer });
  });

  if (success.value) {
    transcript.push({
      role: 'assistant',
      message: `Perfect. We have your info and will send a tailored demo plan for ${answers.businessName.trim() || 'your salon'} shortly.`,
    });
  }

  return transcript;
});

const summaryPoints = computed<string[]>(() =>
  [
    answers.businessName.trim() ? `Salon: ${answers.businessName.trim()}` : null,
    answers.primaryGoal.trim() ? `Goal: ${answers.primaryGoal.trim()}` : null,
    answers.teamSize.trim() ? `Team: ${answers.teamSize.trim()}` : null,
    answers.timeline.trim() ? `Timeline: ${answers.timeline.trim()}` : null,
  ].filter((value): value is string => Boolean(value)),
);

const emailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

const phoneDigits = computed(() => answers.phone.replace(/\D/g, ''));

const validateStep = (): boolean => {
  error.value = '';
  const id = activeStep.value?.id;
  if (!id) return false;

  if (id === 'name' && !answers.name.trim()) {
    error.value = 'Enter your name so we know who to follow up with.';
    return false;
  }

  if (id === 'businessName' && !answers.businessName.trim()) {
    error.value = 'Enter your salon name.';
    return false;
  }

  if (id === 'biggestPain' && !answers.biggestPain.trim()) {
    error.value = 'Tell us the biggest issue you want solved.';
    return false;
  }

  if (id === 'contact') {
    if (!answers.email.trim()) {
      error.value = 'Email is required.';
      return false;
    }
    if (!emailValid(answers.email.trim())) {
      error.value = 'Enter a valid email address.';
      return false;
    }
    if (phoneDigits.value && phoneDigits.value.length !== 10) {
      error.value = 'Enter a valid 10-digit phone number or leave it blank.';
      return false;
    }
  }

  return true;
};

const goNext = async () => {
  if (!validateStep()) return;
  if (activeStep.value?.id === 'contact') {
    await submitLead();
    return;
  }
  stepIndex.value += 1;
};

const goBack = () => {
  error.value = '';
  if (stepIndex.value > 0) stepIndex.value -= 1;
};

const setChoice = (field: 'primaryGoal' | 'teamSize' | 'timeline' | 'preferredContact', value: string) => {
  answers[field] = value;
  error.value = '';

  if (field !== 'preferredContact' && activeStep.value?.id === field) {
    stepIndex.value += 1;
  }
};

const buildLeadSummary = () =>
  [
    `Salon: ${answers.businessName.trim()}`,
    `Primary goal: ${answers.primaryGoal.trim()}`,
    `Team size: ${answers.teamSize.trim()}`,
    `Biggest pain: ${answers.biggestPain.trim()}`,
    `Timeline: ${answers.timeline.trim()}`,
    `Preferred contact: ${answers.preferredContact}${answers.phone.trim() ? ` (${answers.phone.trim()})` : ''}`,
  ].join('\n');

const buildTranscript = (): TranscriptEntry[] => {
  const transcript: TranscriptEntry[] = [];
  steps.forEach((step) => {
    const answer = answerForStep(step.id);
    if (!answer) return;
    transcript.push({ role: 'assistant', message: step.prompt });
    transcript.push({ role: 'lead', message: answer });
  });
  return transcript;
};

const submitLead = async () => {
  busy.value = true;
  error.value = '';

  try {
    const res = await fetch(apiUrl('/demo-requests'), {
      method: 'POST',
      headers: buildHeaders({ json: true }),
      body: JSON.stringify({
        name: answers.name.trim(),
        email: answers.email.trim(),
        phone: phoneDigits.value || undefined,
        message: buildLeadSummary(),
        source: props.source,
        details: {
          businessName: answers.businessName.trim(),
          primaryGoal: answers.primaryGoal.trim(),
          teamSize: answers.teamSize.trim(),
          biggestPain: answers.biggestPain.trim(),
          timeline: answers.timeline.trim(),
          preferredContact: answers.preferredContact,
          sourcePath: route.fullPath,
          summary: `${answers.businessName.trim()} wants ${answers.primaryGoal.trim().toLowerCase()} with a ${answers.teamSize.trim().toLowerCase()} team.`,
          transcript: buildTranscript(),
        },
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to submit your request.');
    }

    success.value = true;
    stepIndex.value = steps.length;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to submit your request.';
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <section class="assistant-shell relative overflow-hidden rounded-[30px] border border-white/65 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl md:p-7">
    <div class="assistant-glow assistant-glow--warm" />
    <div class="assistant-glow assistant-glow--cool" />

    <div class="relative z-10 flex items-start justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          AI Lead Assistant
        </div>
        <h3 class="mt-4 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950">
          {{ title }}
        </h3>
        <p class="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {{ subtitle }}
        </p>
      </div>
      <div class="hidden min-w-[108px] rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-right md:block">
        <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Progress
        </div>
        <div class="mt-1 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950">
          {{ success ? 100 : progress }}%
        </div>
      </div>
    </div>

    <div class="relative z-10 mt-6 grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
      <div class="rounded-[26px] border border-slate-200/80 bg-slate-950 p-4 text-white sm:p-5">
        <div class="space-y-3">
          <div
            v-for="(message, index) in completedConversation"
            :key="`${message.role}-${index}`"
            class="flex"
            :class="message.role === 'assistant' ? 'justify-start' : 'justify-end'"
          >
            <div
              class="max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm"
              :class="
                message.role === 'assistant'
                  ? 'bg-white/10 text-slate-100 ring-1 ring-white/8'
                  : 'bg-emerald-400 text-slate-950'
              "
            >
              {{ message.message }}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-[26px] border border-slate-200/80 bg-slate-50/90 p-4 sm:p-5">
        <template v-if="!success">
          <div class="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Step {{ Math.min(stepIndex + 1, steps.length) }} of {{ steps.length }}
          </div>

          <div v-if="activeStep?.id === 'name'" class="space-y-4">
            <label class="block">
              <span class="text-sm font-medium text-slate-800">Your name</span>
              <input
                v-model="answers.name"
                type="text"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="Jordan"
              />
            </label>
          </div>

          <div v-else-if="activeStep?.id === 'businessName'" class="space-y-4">
            <label class="block">
              <span class="text-sm font-medium text-slate-800">Salon name</span>
              <input
                v-model="answers.businessName"
                type="text"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="Glow House Salon"
              />
            </label>
          </div>

          <div v-else-if="activeStep?.id === 'primaryGoal'" class="grid gap-3">
            <button
              v-for="option in goalOptions"
              :key="option.value"
              type="button"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              @click="setChoice('primaryGoal', option.value)"
            >
              <div class="font-semibold text-slate-900">{{ option.label }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ option.detail }}</div>
            </button>
          </div>

          <div v-else-if="activeStep?.id === 'teamSize'" class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="option in teamSizeOptions"
              :key="option.value"
              type="button"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              @click="setChoice('teamSize', option.value)"
            >
              <div class="font-semibold text-slate-900">{{ option.label }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ option.detail }}</div>
            </button>
          </div>

          <div v-else-if="activeStep?.id === 'biggestPain'" class="space-y-4">
            <label class="block">
              <span class="text-sm font-medium text-slate-800">Biggest pain point</span>
              <textarea
                v-model="answers.biggestPain"
                rows="5"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="We lose time answering DMs, following up with no-shows, and keeping our website current."
              />
            </label>
          </div>

          <div v-else-if="activeStep?.id === 'timeline'" class="grid gap-3">
            <button
              v-for="option in timelineOptions"
              :key="option.value"
              type="button"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              @click="setChoice('timeline', option.value)"
            >
              <div class="font-semibold text-slate-900">{{ option.label }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ option.detail }}</div>
            </button>
          </div>

          <div v-else-if="activeStep?.id === 'contact'" class="space-y-4">
            <label class="block">
              <span class="text-sm font-medium text-slate-800">Email</span>
              <input
                v-model="answers.email"
                type="email"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="owner@glowhouse.com"
              />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-slate-800">Phone</span>
              <input
                v-model="answers.phone"
                type="tel"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="361 555 0184"
              />
            </label>
            <div>
              <div class="text-sm font-medium text-slate-800">Preferred follow-up</div>
              <div class="mt-2 grid gap-3 sm:grid-cols-3">
                <button
                  v-for="option in contactOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="
                    answers.preferredContact === option.value
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  "
                  @click="setChoice('preferredContact', option.value)"
                >
                  <div class="font-semibold">{{ option.label }}</div>
                  <div class="mt-1 text-xs leading-5 text-slate-500">{{ option.detail }}</div>
                </button>
              </div>
            </div>
          </div>

          <div v-if="error" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ error }}
          </div>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="stepIndex === 0 || busy"
              @click="goBack"
            >
              Back
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy"
              @click="goNext"
            >
              {{ busy ? 'Sending...' : activeStep?.id === 'contact' ? ctaLabel : 'Continue' }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm leading-6 text-emerald-900">
            <div class="font-['Space_Grotesk'] text-xl font-semibold text-emerald-950">
              You are in.
            </div>
            <p class="mt-2">
              We stored your request and sent it to the SalonFlow team. Expect a follow-up with a tailored demo plan and next-step recommendation.
            </p>
            <div class="mt-4 rounded-2xl bg-white px-4 py-3 text-slate-700">
              <div class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">What we captured</div>
              <div class="mt-2 space-y-1.5">
                <div v-for="point in summaryPoints" :key="point">{{ point }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="relative z-10 mt-5 flex flex-wrap gap-2">
      <div
        v-for="point in summaryPoints"
        :key="point"
        class="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
      >
        {{ point }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.assistant-glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(48px);
  opacity: 0.65;
  pointer-events: none;
}

.assistant-glow--warm {
  top: -80px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: rgba(251, 191, 36, 0.32);
}

.assistant-glow--cool {
  bottom: -70px;
  left: -30px;
  width: 220px;
  height: 220px;
  background: rgba(45, 212, 191, 0.22);
}
</style>
