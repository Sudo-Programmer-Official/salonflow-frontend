<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
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

type AssistantAnswers = {
  name: string;
  businessName: string;
  country: string;
  website: string;
  googleBusinessUrl: string;
  instagramHandle: string;
  timezone: string;
  primaryGoal: string;
  teamSize: string;
  biggestPain: string;
  timeline: string;
  preferredContact: string;
  email: string;
  phone: string;
};

type SaveMode = 'draft' | 'final';
type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

type StoredDraftSnapshot = {
  draftId: string | null;
  stepIndex: number;
  answers: AssistantAnswers;
  quickLeadText?: string;
};

const props = withDefaults(
  defineProps<{
    source?: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    defaultFullscreen?: boolean;
  }>(),
  {
    source: 'marketing-lead-assistant',
    title: 'Get your SalonFlow game plan in one guided conversation',
    subtitle: 'Answer a few quick questions. Your progress saves automatically, and we will tailor the right setup for your salon.',
    ctaLabel: 'Get My Demo Plan',
    defaultFullscreen: false,
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

const TOTAL_STEPS = steps.length;

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
    detail: 'Website, booking, CRM, social posting, SMS, and POS rollout under one system.',
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

const answers = reactive<AssistantAnswers>({
  name: '',
  businessName: '',
  country: '',
  website: '',
  googleBusinessUrl: '',
  instagramHandle: '',
  timezone: '',
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
const isFullscreen = ref(props.defaultFullscreen);
const draftId = ref<string | null>(null);
const draftSaveState = ref<DraftSaveState>('idle');
const quickLeadText = ref('');
const quickLeadNotice = ref('');

const storageKey = computed(() => `lead-assistant:${props.source}`);
const activeStep = computed(() => steps[stepIndex.value] ?? null);
const progress = computed(() => (success.value ? 100 : Math.round((stepIndex.value / TOTAL_STEPS) * 100)));
const phoneDigits = computed(() => answers.phone.replace(/\D/g, ''));
const canPersistRemotely = computed(() => answers.name.trim().length > 0);
const hasAnyProgress = computed(
  () =>
    Boolean(
      answers.name.trim() ||
        answers.businessName.trim() ||
        answers.country.trim() ||
        answers.website.trim() ||
        answers.googleBusinessUrl.trim() ||
        answers.instagramHandle.trim() ||
        answers.timezone.trim() ||
        answers.primaryGoal.trim() ||
        answers.teamSize.trim() ||
        answers.biggestPain.trim() ||
        answers.timeline.trim() ||
        answers.email.trim() ||
        quickLeadText.value.trim() ||
        phoneDigits.value,
    ),
);

const initialAssistantMessage =
  'I can capture your demo request from one message, or guide you step by step if you prefer.';

const summaryPoints = computed<string[]>(() =>
  [
    answers.businessName.trim() ? `Salon: ${answers.businessName.trim()}` : null,
    answers.country.trim() ? `Country: ${answers.country.trim()}` : null,
    answers.timezone.trim() ? `Time zone: ${answers.timezone.trim()}` : null,
    answers.primaryGoal.trim() ? `Goal: ${answers.primaryGoal.trim()}` : null,
    answers.teamSize.trim() ? `Team: ${answers.teamSize.trim()}` : null,
    answers.timeline.trim() ? `Timeline: ${answers.timeline.trim()}` : null,
  ].filter((value): value is string => Boolean(value)),
);

const saveStateLabel = computed(() => {
  if (success.value) return 'Saved and sent';
  if (!hasAnyProgress.value) return 'Start when ready';
  if (draftSaveState.value === 'saving') return 'Saving progress...';
  if (draftSaveState.value === 'saved') return 'Progress saved';
  if (draftSaveState.value === 'error') return 'Trying again...';
  return 'Progress saves automatically';
});

const saveStateTone = computed(() => {
  if (draftSaveState.value === 'error') return 'assistant-pill assistant-pill--warn';
  if (draftSaveState.value === 'saved' || success.value) return 'assistant-pill assistant-pill--ok';
  return 'assistant-pill';
});

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
        answers.country.trim() ? answers.country.trim() : null,
        answers.timezone.trim() ? answers.timezone.trim() : null,
        answers.website.trim() ? answers.website.trim() : null,
        answers.googleBusinessUrl.trim() ? answers.googleBusinessUrl.trim() : null,
        answers.instagramHandle.trim() ? answers.instagramHandle.trim() : null,
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

const emailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

const clampStepIndex = (value: number) => Math.max(0, Math.min(TOTAL_STEPS - 1, Math.trunc(value)));

const normalizeSnapshot = (): StoredDraftSnapshot => ({
  draftId: draftId.value,
  stepIndex: clampStepIndex(stepIndex.value),
  answers: { ...answers },
  quickLeadText: quickLeadText.value,
});

const restoreLocalDraft = () => {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(storageKey.value);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraftSnapshot>;
    if (parsed.answers && typeof parsed.answers === 'object') {
      Object.assign(answers, parsed.answers);
    }
    if (typeof parsed.stepIndex === 'number') {
      stepIndex.value = clampStepIndex(parsed.stepIndex);
    }
    if (typeof parsed.quickLeadText === 'string') {
      quickLeadText.value = parsed.quickLeadText;
    }
    draftId.value = typeof parsed.draftId === 'string' ? parsed.draftId : null;
  } catch {
    window.localStorage.removeItem(storageKey.value);
  }
};

const persistLocalDraft = () => {
  if (typeof window === 'undefined') return;
  if (!hasAnyProgress.value || success.value) {
    window.localStorage.removeItem(storageKey.value);
    return;
  }
  window.localStorage.setItem(storageKey.value, JSON.stringify(normalizeSnapshot()));
};

const clearLocalDraft = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(storageKey.value);
  }
};

const buildLeadSummary = () =>
  [
    answers.businessName.trim() ? `Salon: ${answers.businessName.trim()}` : null,
    answers.country.trim() ? `Country: ${answers.country.trim()}` : null,
    answers.website.trim() ? `Website: ${answers.website.trim()}` : null,
    answers.googleBusinessUrl.trim() ? `Google Business URL: ${answers.googleBusinessUrl.trim()}` : null,
    answers.instagramHandle.trim() ? `Instagram: ${answers.instagramHandle.trim()}` : null,
    answers.timezone.trim() ? `Time zone: ${answers.timezone.trim()}` : null,
    answers.primaryGoal.trim() ? `Primary goal: ${answers.primaryGoal.trim()}` : null,
    answers.teamSize.trim() ? `Team size: ${answers.teamSize.trim()}` : null,
    answers.biggestPain.trim() ? `Biggest pain: ${answers.biggestPain.trim()}` : null,
    answers.timeline.trim() ? `Timeline: ${answers.timeline.trim()}` : null,
    quickLeadText.value.trim() ? `Quick note: ${quickLeadText.value.trim()}` : null,
    answers.preferredContact.trim()
      ? `Preferred contact: ${answers.preferredContact}${answers.phone.trim() ? ` (${answers.phone.trim()})` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

const buildTranscript = (): TranscriptEntry[] => {
  const transcript: TranscriptEntry[] = [];
  if (quickLeadText.value.trim()) {
    transcript.push({
      role: 'assistant',
      message: 'Tell me your salon details and the best way to reach you. I will turn it into a demo request.',
    });
    transcript.push({ role: 'lead', message: quickLeadText.value.trim() });
  }
  steps.forEach((step) => {
    const answer = answerForStep(step.id);
    if (!answer) return;
    transcript.push({ role: 'assistant', message: step.prompt });
    transcript.push({ role: 'lead', message: answer });
  });
  return transcript;
};

const buildDetails = (mode: SaveMode) => ({
  businessName: answers.businessName.trim(),
  country: answers.country.trim(),
  website: answers.website.trim(),
  googleBusinessUrl: answers.googleBusinessUrl.trim(),
  instagramHandle: answers.instagramHandle.trim(),
  timezone: answers.timezone.trim(),
  primaryGoal: answers.primaryGoal.trim(),
  teamSize: answers.teamSize.trim(),
  biggestPain: answers.biggestPain.trim(),
  quickCaptureNote: quickLeadText.value.trim(),
  timeline: answers.timeline.trim(),
  preferredContact: answers.preferredContact,
  sourcePath: route.fullPath,
  progressStep: mode === 'final' ? TOTAL_STEPS : stepIndex.value + 1,
  summary:
    `${answers.businessName.trim() || 'This salon'} wants ${answers.primaryGoal.trim().toLowerCase() || 'a better growth system'}.`.trim(),
  transcript: buildTranscript(),
});

const buildPayload = (mode: SaveMode) => ({
  draftId: draftId.value ?? undefined,
  mode,
  name: answers.name.trim(),
  email: answers.email.trim() || undefined,
  phone: phoneDigits.value || undefined,
  message: buildLeadSummary() || undefined,
  source: props.source,
  progressStep: mode === 'final' ? TOTAL_STEPS : stepIndex.value + 1,
  details: buildDetails(mode),
});

let draftSaveTimer: number | null = null;
let lastDraftFingerprint = '';
let draftNoticeResetTimer: number | null = null;
let bodyOverflowSnapshot = '';
let hydrating = true;

const clearDraftSaveTimer = () => {
  if (draftSaveTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
};

const clearDraftNoticeResetTimer = () => {
  if (draftNoticeResetTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(draftNoticeResetTimer);
    draftNoticeResetTimer = null;
  }
};

const markDraftSaved = () => {
  draftSaveState.value = 'saved';
  clearDraftNoticeResetTimer();
  if (typeof window !== 'undefined') {
    draftNoticeResetTimer = window.setTimeout(() => {
      if (!success.value && draftSaveState.value === 'saved') {
        draftSaveState.value = 'idle';
      }
    }, 1800);
  }
};

const persistLead = async (
  mode: SaveMode,
  options: { keepalive?: boolean; force?: boolean } = {},
) => {
  if (mode === 'draft' && (busy.value || success.value || !canPersistRemotely.value)) {
    return null;
  }

  const payload = buildPayload(mode);
  const fingerprint = JSON.stringify(payload);
  if (mode === 'draft' && !options.force && fingerprint === lastDraftFingerprint) {
    return null;
  }

  if (mode === 'draft') {
    draftSaveState.value = 'saving';
  }

  const res = await fetch(apiUrl('/demo-requests'), {
    method: 'POST',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(payload),
    keepalive: options.keepalive === true,
  });

  const response = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(response.error || 'Failed to save your progress.');
  }

  if (response.leadId) {
    draftId.value = String(response.leadId);
  }

  if (mode === 'draft') {
    lastDraftFingerprint = fingerprint;
    markDraftSaved();
  }

  return response;
};

const queueDraftSave = (delay = 700) => {
  if (typeof window === 'undefined' || success.value || !canPersistRemotely.value) return;
  clearDraftSaveTimer();
  draftSaveTimer = window.setTimeout(() => {
    persistLead('draft').catch(() => {
      draftSaveState.value = 'error';
    });
  }, delay);
};

const flushDraftSave = () => {
  clearDraftSaveTimer();
  if (!hasAnyProgress.value || success.value || !canPersistRemotely.value) return;
  void persistLead('draft', { keepalive: true, force: true }).catch(() => {
    draftSaveState.value = 'error';
  });
};

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

const extractFirstMatch = (value: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;:]+$/, '');
  }
  return '';
};

const inferGoal = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('no-show') || lower.includes('no show') || lower.includes('reminder')) return 'Fewer no-shows';
  if (lower.includes('repeat') || lower.includes('retention') || lower.includes('review') || lower.includes('loyalty')) {
    return 'Better repeat visits';
  }
  if (lower.includes('pos') || lower.includes('all in one') || lower.includes('one place')) {
    return 'Run everything in one place';
  }
  if (lower.includes('booking') || lower.includes('customer') || lower.includes('lead') || lower.includes('website')) {
    return 'More bookings';
  }
  return '';
};

const applyQuickLeadText = () => {
  const raw = quickLeadText.value.trim();
  if (!raw) {
    quickLeadNotice.value = 'Tell me your name, salon, goal, and email in one message.';
    return;
  }

  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = raw.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] ?? '';
  const name = extractFirstMatch(raw, [
    /(?:my name is|i am|i'm)\s+([a-z][a-z\s.'-]{1,60})(?=,|\.|;|\band\b|\bfrom\b|\bat\b|\bwith\b|$)/i,
    /^([a-z][a-z\s.'-]{1,60})(?=,|\.|;|\s+-\s+)/i,
  ]);
  const businessName = extractFirstMatch(raw, [
    /(?:salon|studio|business|shop)\s+(?:is|name is|called)\s+([a-z0-9 &.'-]{2,80})(?=,|\.|;|\band\b|\bin\b|$)/i,
    /(?:from|at|for)\s+([a-z0-9 &.'-]{2,80})(?:\s+(?:salon|studio|nails|spa|barber))?(?=,|\.|;|\band\b|\bin\b|$)/i,
  ]);
  const teamSize = raw.match(/\b(?:team of|staff of|we have)\s+(\d{1,2})\b/i)?.[1] ?? '';
  const timeline = raw.match(/\b(this week|this month|next quarter|asap|soon|immediately)\b/i)?.[1] ?? '';
  const goal = inferGoal(raw);

  if (email) answers.email = email;
  if (phone) answers.phone = phone;
  if (name && !answers.name.trim()) answers.name = name;
  if (businessName && !answers.businessName.trim()) answers.businessName = businessName;
  if (teamSize && !answers.teamSize.trim()) {
    const numericTeamSize = Number(teamSize);
    answers.teamSize =
      numericTeamSize <= 1 ? 'Just me' : numericTeamSize <= 5 ? '2-5 team members' : numericTeamSize <= 10 ? '6-10 team members' : '10+ team members';
  }
  if (timeline && !answers.timeline.trim()) {
    answers.timeline = timeline.toLowerCase() === 'asap' || timeline.toLowerCase() === 'soon' || timeline.toLowerCase() === 'immediately'
      ? 'This week'
      : timeline.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  if (goal && !answers.primaryGoal.trim()) answers.primaryGoal = goal;
  if (!answers.biggestPain.trim()) answers.biggestPain = raw;
  if (!answers.preferredContact.trim()) answers.preferredContact = phone ? 'Text' : 'Email';

  quickLeadNotice.value = 'I filled the lead details from your message. You can send now or adjust anything below.';
  persistLocalDraft();
  queueDraftSave(150);
};

const submitQuickLead = async () => {
  applyQuickLeadText();
  error.value = '';

  if (!answers.name.trim()) {
    error.value = 'Add your name in the message or the name field below.';
    return;
  }
  if (!answers.email.trim()) {
    error.value = 'Add an email so we can send the demo plan.';
    return;
  }
  if (!emailValid(answers.email.trim())) {
    error.value = 'Enter a valid email address.';
    return;
  }
  if (phoneDigits.value && phoneDigits.value.length !== 10) {
    error.value = 'Enter a valid 10-digit phone number or remove it.';
    return;
  }

  await submitLead();
};

const submitLead = async () => {
  busy.value = true;
  error.value = '';
  clearDraftSaveTimer();

  try {
    await persistLead('final', { force: true });
    success.value = true;
    stepIndex.value = TOTAL_STEPS;
    draftSaveState.value = 'saved';
    clearLocalDraft();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to submit your request.';
  } finally {
    busy.value = false;
  }
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

const openFullscreen = () => {
  isFullscreen.value = true;
};

defineExpose({ openFullscreen });

const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') {
    flushDraftSave();
  }
};

const handleBeforeUnload = () => {
  flushDraftSave();
};

watch(
  [
    () => stepIndex.value,
    () => answers.name,
    () => answers.businessName,
    () => answers.country,
    () => answers.website,
    () => answers.googleBusinessUrl,
    () => answers.instagramHandle,
    () => answers.timezone,
    () => answers.primaryGoal,
    () => answers.teamSize,
    () => answers.biggestPain,
    () => answers.timeline,
    () => answers.preferredContact,
    () => answers.email,
    () => answers.phone,
    () => quickLeadText.value,
  ],
  () => {
    if (hydrating) return;
    persistLocalDraft();
    queueDraftSave();
  },
  { flush: 'post' },
);

watch(
  isFullscreen,
  (value) => {
    if (typeof document === 'undefined') return;
    if (value) {
      bodyOverflowSnapshot = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = bodyOverflowSnapshot;
    }
  },
  { immediate: true },
);

onMounted(() => {
  restoreLocalDraft();
  hydrating = false;
  persistLocalDraft();
  if (canPersistRemotely.value && !draftId.value) {
    queueDraftSave(150);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
});

onBeforeUnmount(() => {
  clearDraftSaveTimer();
  clearDraftNoticeResetTimer();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.body.style.overflow = bodyOverflowSnapshot;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
});
</script>

<template>
  <section :class="['assistant-host', { 'assistant-host--fullscreen': isFullscreen }]">
    <div :class="['assistant-shell', isFullscreen ? 'assistant-shell--fullscreen' : 'assistant-shell--inline']">
      <div class="assistant-glow assistant-glow--warm" />
      <div class="assistant-glow assistant-glow--cool" />

      <div class="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="max-w-4xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            AI Lead Assistant
          </div>
          <h3 class="mt-4 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950 md:text-3xl">
            {{ title }}
          </h3>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {{ subtitle }}
          </p>
          <p class="mt-3 text-sm font-medium text-slate-500">
            Your progress saves automatically, even if you pause before the last step.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div :class="saveStateTone">
            {{ saveStateLabel }}
          </div>
          <button
            type="button"
            class="assistant-focus-button"
            @click="toggleFullscreen"
          >
            {{ isFullscreen ? 'Exit full screen' : 'Open full screen' }}
          </button>
          <div class="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-right shadow-sm">
            <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Progress
            </div>
            <div class="mt-1 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950">
              {{ progress }}%
            </div>
          </div>
        </div>
      </div>

      <div class="assistant-grid">
        <div class="assistant-transcript rounded-[26px] border border-slate-200/80 bg-slate-950 p-4 text-white sm:p-5">
          <div class="mb-4 rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Fast capture
            </div>
            <label class="mt-3 block">
              <span class="text-sm font-medium text-white">Tell me everything in one message</span>
              <textarea
                v-model="quickLeadText"
                rows="5"
                class="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/20"
                placeholder="Hi, I am Maria from Glow House Salon. We have 5 staff, need more bookings and fewer no-shows, and want to launch this month. Email maria@glowhouse.com, text 361 555 0184."
                @blur="applyQuickLeadText"
              />
            </label>
            <div class="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="busy"
                @click="submitQuickLead"
              >
                {{ busy ? 'Sending...' : 'Send from this message' }}
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/8"
                @click="applyQuickLeadText"
              >
                Fill details below
              </button>
            </div>
            <p v-if="quickLeadNotice" class="mt-3 text-xs leading-5 text-emerald-100">
              {{ quickLeadNotice }}
            </p>
          </div>

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

        <div class="assistant-step-card rounded-[26px] border border-slate-200/80 bg-slate-50/90 p-4 sm:p-5">
          <template v-if="!success">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Step {{ Math.min(stepIndex + 1, TOTAL_STEPS) }} of {{ TOTAL_STEPS }}
              </div>
              <div class="text-xs font-medium text-slate-500">
                Saves automatically
              </div>
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
                  rows="6"
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
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block">
                  <span class="text-sm font-medium text-slate-800">Country</span>
                  <input
                    v-model="answers.country"
                    type="text"
                    class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="United States"
                  />
                </label>
                <label class="block">
                  <span class="text-sm font-medium text-slate-800">Time zone</span>
                  <input
                    v-model="answers.timezone"
                    type="text"
                    class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="America/Chicago"
                  />
                </label>
              </div>
              <label class="block">
                <span class="text-sm font-medium text-slate-800">Website</span>
                <input
                  v-model="answers.website"
                  type="url"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="https://example.com"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-slate-800">Google Business URL</span>
                <input
                  v-model="answers.googleBusinessUrl"
                  type="url"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="https://g.page/your-business"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-slate-800">Instagram handle</span>
                <input
                  v-model="answers.instagramHandle"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="@yourbusiness"
                />
              </label>
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
    </div>
  </section>
</template>

<style scoped>
.assistant-host {
  position: relative;
}

.assistant-host--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 80;
  overflow-y: auto;
  padding: 16px;
  background: rgba(8, 14, 28, 0.58);
}

.assistant-shell {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(24px);
}

.assistant-shell--inline {
  border-radius: 30px;
  padding: 24px;
}

.assistant-shell--fullscreen {
  max-width: 1480px;
  min-height: calc(100dvh - 32px);
  margin: 0 auto;
  border-radius: 32px;
  padding: 28px;
}

.assistant-grid {
  position: relative;
  z-index: 10;
  display: grid;
  gap: 20px;
  margin-top: 24px;
}

.assistant-transcript,
.assistant-step-card {
  min-height: 360px;
}

.assistant-shell--fullscreen .assistant-transcript,
.assistant-shell--fullscreen .assistant-step-card {
  min-height: 560px;
}

.assistant-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.84);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.assistant-pill--ok {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(236, 253, 245, 0.92);
  color: #047857;
}

.assistant-pill--warn {
  border-color: rgba(251, 146, 60, 0.28);
  background: rgba(255, 247, 237, 0.94);
  color: #c2410c;
}

.assistant-focus-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.assistant-focus-button:hover {
  transform: translateY(-1px);
  border-color: rgba(100, 116, 139, 0.4);
  background: #ffffff;
}

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

@media (min-width: 1280px) {
  .assistant-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }

  .assistant-shell--fullscreen .assistant-grid {
    grid-template-columns: 1.32fr 0.88fr;
  }
}

@media (max-width: 1024px) {
  .assistant-shell--inline {
    padding: 20px;
  }

  .assistant-shell--fullscreen {
    padding: 22px;
  }
}

@media (max-width: 640px) {
  .assistant-host--fullscreen {
    padding: 0;
  }

  .assistant-shell--inline,
  .assistant-shell--fullscreen {
    border-radius: 24px;
    padding: 18px;
  }

  .assistant-shell--fullscreen {
    min-height: 100dvh;
    border-radius: 0;
  }

  .assistant-transcript,
  .assistant-step-card,
  .assistant-shell--fullscreen .assistant-transcript,
  .assistant-shell--fullscreen .assistant-step-card {
    min-height: 0;
  }
}
</style>
