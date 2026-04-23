<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElTag,
  ElMessage,
  ElRadioGroup,
  ElRadioButton,
  ElTooltip,
  ElSelect,
  ElOption,
  ElSwitch,
  ElTimeSelect,
} from 'element-plus';
import {
  fetchPromotions,
  createPromotion,
  testPromotion,
  sendPromotion,
  type Promotion,
  type PromotionAudienceFilters,
  fetchPromotionStats,
  disablePromotion,
  testPromotionMessage,
  testPromotionEmail,
  previewPromotion,
} from '../../api/promotions';
import { fetchOnboardingStatus } from '../../api/onboarding';
import { dayjs, formatInBusinessTz, getBusinessTimezone, isWithinTcpaWindow } from '../../utils/dates';
import { generateAiSuggestions } from '../../api/smartReminders';

const activeTab = ref<'active' | 'expired'>('active');
const dialogOpen = ref(false);
const saving = ref(false);
const loading = ref(false);
const sending = ref<string | null>(null);
const sendConfirm = ref<{ open: boolean; promo: Promotion | null; stats: any | null }>({
  open: false,
  promo: null,
  stats: null,
});
const testing = ref<string | null>(null);
const testingCreate = ref(false);
const testingEmail = ref(false);
const previewing = ref(false);
const previewCounts = ref<{ totalRecipients: number; sms: number; email: number } | null>(null);
const previewExcluded = ref<any>(null);
const previewSample = ref<Array<{ name: string; lastVisit: string | null; visitCount: number }>>([]);
const aiDialog = ref(false);
const aiLoading = ref(false);
const aiSuggestions = ref<string[]>([]);
const aiTone = ref<'FRIENDLY' | 'URGENT' | 'PREMIUM' | 'CASUAL'>('FRIENDLY');
const aiShort = ref(false);
const wizardStep = ref(1);
const totalSteps = 4;
const businessNameCached = ref<string>('');

const promotions = ref<Promotion[]>([]);
const statsMap = ref<Record<string, any>>({});
const pollers = ref<Record<string, number>>({});
const disableConfirm = ref<{ open: boolean; id: string | null }>({ open: false, id: null });
const viewDrawer = ref<{ open: boolean; promo: Promotion | null }>({ open: false, promo: null });

const filteredPromotions = computed(() =>
  promotions.value.filter((p) => (activeTab.value === 'active' ? p.status !== 'EXPIRED' : p.status === 'EXPIRED')),
);

const audienceOptions = [
  { label: 'All', value: 'all' },
  { label: 'VIP', value: 'vip' },
  { label: 'Regular', value: 'regular' },
  { label: 'New', value: 'new' },
  { label: 'At-risk', value: 'atrisk' },
  { label: 'Booking users', value: 'booking' },
];

const weekdayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const mapSmsTestError = (code?: string) => {
  switch (code) {
    case 'TCPA_BLOCKED':
      return 'Messages can only be sent between 8am–8pm local time.';
    case 'PROMOTIONS_SMS_DISABLED':
      return 'Promotions SMS is disabled in this environment.';
    case 'COMMS_PAUSED':
      return 'Comms are paused. Enable SMS before sending tests.';
    case 'SMS_DISABLED':
      return 'SMS sending is disabled in this environment.';
    case 'PROMOTIONS_BLOCKED':
      return 'Promotional SMS is blocked for this tenant.';
    case 'CAP_EXCEEDED':
    case 'SMS_CAP_REACHED':
      return 'SMS cap exceeded for this tenant.';
    case 'NO_CREDITS':
      return 'Insufficient SMS credits to send this test.';
    case 'SMS_NOT_CONFIGURED':
      return 'SMS provider is not configured.';
    case 'SMS_BLOCKED':
      return 'SMS sending is blocked for this tenant.';
    case 'ACCOUNT_FROZEN':
      return 'Account is frozen; SMS cannot be sent.';
    default:
      return null;
  }
};

const form = reactive({
  name: '',
  offerType: 'percent' as 'percent' | 'amount',
  offerValue: 10,
  audiences: ['all'] as string[],
  startDate: '',
  endDate: '',
  oneTimeUse: false,
  visitedAfter: '',
  visitedBefore: '',
  minVisits: null as number | null,
  businessName: '',
  message: '',
  appendStop: true,
  appendExpiry: true,
  sendWhen: 'now' as 'now' | 'schedule',
  scheduleAt: '',
  allowedDays: [] as number[],
  sendTimeStart: '',
  sendTimeEnd: '',
  testPhone: '',
  testEmail: '',
  channel: 'sms' as 'sms' | 'email' | 'both',
  emailSubject: 'SalonFlow promotion',
});

const scheduleDate = ref<string | null>(null);
const scheduleHour = ref(10);
const scheduleMinute = ref(0);
const scheduleMeridiem = ref<'AM' | 'PM'>('AM');

const charCount = computed(() => form.message.length);
const businessTz = computed(() => getBusinessTimezone());
const tcpaWarning = ref('');

const clearPreview = () => {
  previewCounts.value = null;
  previewExcluded.value = null;
  previewSample.value = [];
};

const evaluateTcpa = () => {
  const inWindow = isWithinTcpaWindow(undefined, businessTz.value);
  if (!inWindow && form.sendWhen === 'now') {
    tcpaWarning.value = 'SMS sending is allowed 8am–8pm local time. Please schedule instead.';
    form.sendWhen = 'schedule';
  } else {
    tcpaWarning.value = inWindow ? '' : 'Outside TCPA window (8am–8pm). Only scheduling is allowed.';
  }
};

const buildAudienceFilters = (): PromotionAudienceFilters | null => {
  const visitedAfter = form.visitedAfter ? buildDateBoundaryIso(form.visitedAfter, 'start') : null;
  const visitedBefore = form.visitedBefore ? buildDateBoundaryIso(form.visitedBefore, 'end') : null;
  const minVisits =
    form.minVisits == null || Number.isNaN(Number(form.minVisits))
      ? null
      : Number(form.minVisits);

  if (!visitedAfter && !visitedBefore && minVisits == null) {
    return null;
  }

  return {
    visitedAfter,
    visitedBefore,
    minVisits,
  };
};

const buildSendWindow = () => {
  const allowedDays = [...form.allowedDays].sort((left, right) => left - right);
  const sendTimeStart = form.sendTimeStart?.trim() || null;
  const sendTimeEnd = form.sendTimeEnd?.trim() || null;

  if (!allowedDays.length && !sendTimeStart && !sendTimeEnd) {
    return null;
  }

  return {
    allowedDays: allowedDays.length ? allowedDays : null,
    sendTimeStart,
    sendTimeEnd,
  };
};

const buildDateBoundaryIso = (dateValue: string, boundary: 'start' | 'end') => {
  if (!dateValue) return '';
  const clock = boundary === 'start' ? '00:00:00' : '23:59:59';
  const local = dayjs.tz(`${dateValue}T${clock}`, businessTz.value);
  return (boundary === 'end' ? local.millisecond(999) : local).toISOString();
};

const timeValueToMinutes = (value: string) => {
  const [hour = 0, minute = 0] = value.split(':').map((part) => Number(part));
  return hour * 60 + minute;
};

const selectedWeekdaysLabel = computed(() => {
  const labels = weekdayOptions
    .filter((option) => form.allowedDays.includes(option.value))
    .map((option) => option.label);
  return labels.length ? labels.join(', ') : 'Any day';
});

const sendWindowLabel = computed(() => {
  if (!form.sendTimeStart && !form.sendTimeEnd) return 'Any time';
  if (!form.sendTimeStart || !form.sendTimeEnd) return 'Incomplete time window';
  return `${form.sendTimeStart} to ${form.sendTimeEnd}`;
});

evaluateTcpa();

const resetForm = () => {
  form.name = '';
  form.offerType = 'percent';
  form.offerValue = 10;
  form.audiences = ['all'];
  form.startDate = '';
  form.endDate = '';
  form.oneTimeUse = false;
  form.visitedAfter = '';
  form.visitedBefore = '';
  form.minVisits = null;
  form.businessName = '';
  form.message = '';
  form.appendStop = true;
  form.appendExpiry = true;
  form.sendWhen = 'now';
  form.scheduleAt = '';
  form.allowedDays = [];
  form.sendTimeStart = '';
  form.sendTimeEnd = '';
  form.testPhone = '';
  form.testEmail = '';
  form.channel = 'sms';
  form.emailSubject = 'SalonFlow promotion';
  scheduleDate.value = null;
  scheduleHour.value = 10;
  scheduleMinute.value = 0;
  scheduleMeridiem.value = 'AM';
  previewCounts.value = null;
  previewExcluded.value = null;
  previewSample.value = [];
  evaluateTcpa();
  wizardStep.value = 1;
  form.businessName = businessNameCached.value || '';
};

const openCreate = () => {
  resetForm();
  dialogOpen.value = true;
  evaluateTcpa();
  loadBusinessName();
};

const loadPromotions = async () => {
  loading.value = true;
  try {
    promotions.value = await fetchPromotions(activeTab.value === 'expired' ? 'expired' : undefined);
    const visiblePromotions = promotions.value.filter((promo) =>
      activeTab.value === 'expired' ? promo.status === 'EXPIRED' : promo.status !== 'EXPIRED',
    );
    // Warm stats map so we have totals for audience counts/summary bars.
    await Promise.all(
      visiblePromotions.map(async (p) => {
        try {
          const stats = await fetchPromotionStats(p.id);
          statsMap.value[p.id] = stats;
        } catch {
          // ignore individual failures to avoid blocking list render
        }
      }),
    );
    promotions.value.forEach((p) => {
      const stat = statsMap.value[p.id];
      const isVisible = activeTab.value === 'expired' ? p.status === 'EXPIRED' : p.status !== 'EXPIRED';
      if (isVisible && (p.status === 'SENDING' || (stat && stat.pending > 0))) {
        ensurePolling(p.id);
      } else {
        stopPolling(p.id);
      }
    });
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load promotions');
  } finally {
    loading.value = false;
  }
};

const setTab = (tab: 'active' | 'expired') => {
  activeTab.value = tab;
  loadPromotions();
};

const addOptimistic = (promo: Promotion) => {
  promotions.value = [promo, ...promotions.value];
};

const stopPolling = (id: string) => {
  const timer = pollers.value[id];
  if (timer) {
    clearInterval(timer);
    delete pollers.value[id];
  }
};

const refreshStats = async (id: string) => {
  try {
    const stats = await fetchPromotionStats(id);
    statsMap.value[id] = stats;
    if ((stats.pending ?? 0) === 0) {
      stopPolling(id);
    }
    return stats;
  } catch {
    // ignore transient errors
    return null;
  }
};

const ensurePolling = (id: string) => {
  if (pollers.value[id]) return;
  refreshStats(id);
  pollers.value[id] = window.setInterval(() => refreshStats(id), 4000);
};

const submit = async () => {
  // ensure all steps valid
  for (let i = 1; i <= totalSteps; i += 1) {
    if (!validateStep(i)) return;
  }

  if (form.sendWhen === 'now') {
    const inWindow = isWithinTcpaWindow(undefined, businessTz.value);
    if (!inWindow) {
      tcpaWarning.value = 'SMS sending is allowed 8am–8pm local time. Switch to schedule.';
      form.sendWhen = 'schedule';
      ElMessage.warning('Outside TCPA window. Please schedule this promotion.');
      return;
    }
  }
  if (form.sendWhen === 'schedule' && !form.scheduleAt) {
    form.scheduleAt = buildScheduleIso();
  }
  if (form.sendWhen === 'schedule' && form.scheduleAt) {
    const scheduled = dayjs(form.scheduleAt);
    if (!scheduled.isValid() || scheduled.isBefore(dayjs())) {
      ElMessage.warning('Schedule time must be in the future');
      return;
    }
  }
  saving.value = true;
  try {
    const audienceFilters = buildAudienceFilters();
    const sendWindow = buildSendWindow();
    const channels: ('sms' | 'email')[] =
      form.channel === 'sms' ? ['sms'] : form.channel === 'email' ? ['email'] : ['sms', 'email'];
    const payload = {
      name: form.name.trim(),
      offerType: form.offerType,
      offerValue: form.offerValue,
      audience: form.audiences,
      message: form.message.trim(),
      channels,
      emailSubject: form.channel === 'email' || form.channel === 'both' ? form.emailSubject.trim() : null,
      emailBody: form.channel === 'email' || form.channel === 'both' ? form.message.trim() : null,
      emailBodyText: form.channel === 'email' || form.channel === 'both' ? form.message.trim() : null,
      startAt: buildDateBoundaryIso(form.startDate, 'start'),
      endAt: buildDateBoundaryIso(form.endDate, 'end'),
      oneTimeUse: form.oneTimeUse,
      scheduledAt: form.sendWhen === 'schedule' ? form.scheduleAt || buildScheduleIso() : null,
      audienceFilters,
      sendWindow,
    };
    const created = await createPromotion(payload);
    addOptimistic(created);
    dialogOpen.value = false;
    ElMessage.success('Promotion saved');
  } catch (err: any) {
    if (err?.code === 'SEND_WINDOW_INVALID') {
      ElMessage.error(err?.message || 'Send window is invalid');
    } else if (err?.code === 'SCHEDULE_IN_PAST') {
      ElMessage.error('Schedule time must be in the future.');
    } else if (err?.code === 'WEEKLY_LIMIT_EXCEEDED') {
      ElMessage.error('Only one promotion per week is allowed.');
    } else {
      ElMessage.error(err?.message || 'Failed to save promotion');
    }
  } finally {
    saving.value = false;
  }
};

const handleDisable = async () => {
  if (!disableConfirm.value.id) return;
  try {
    await disablePromotion(disableConfirm.value.id);
    ElMessage.success('Promotion disabled');
    stopPolling(disableConfirm.value.id);
    await loadPromotions();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to disable');
  } finally {
    disableConfirm.value = { open: false, id: null };
  }
};

const closeView = () => {
  viewDrawer.value = { open: false, promo: null };
};

const openDisable = (id: string) => {
  disableConfirm.value = { open: true, id };
};

const openView = (promo: Promotion) => {
  viewDrawer.value = { open: true, promo };
  ensurePolling(promo.id);
};

const handleTest = async (id: string, phone: string) => {
  if (!phone?.trim()) {
    ElMessage.warning('Enter a test phone number');
    return;
  }
  testing.value = id;
  try {
    await testPromotion(id, phone.trim());
    ElMessage.success('Test sent');
  } catch (err: any) {
    const mapped = mapSmsTestError(err?.code);
    if (mapped) {
      ElMessage.error(mapped);
    } else {
      ElMessage.error(err?.message || 'Failed to send test');
    }
  } finally {
    testing.value = null;
  }
};

const handleCreateTest = async () => {
  if (form.channel === 'email') {
    await handleCreateTestEmail();
    return;
  }
  if (form.channel === 'both') {
    // send SMS if phone present
    if (form.testPhone?.trim()) {
      const phoneVal = form.testPhone.trim();
      if (!form.message?.trim()) {
        ElMessage.warning('Enter a message to test');
        return;
      }
      testingCreate.value = true;
      try {
        await testPromotionMessage(phoneVal, form.message.trim());
        ElMessage.success('Test SMS sent');
      } catch (err: any) {
        const mapped = mapSmsTestError(err?.code);
        if (mapped) {
          ElMessage.error(mapped);
        } else {
          ElMessage.error(err?.message || 'Failed to send SMS test');
        }
      } finally {
        testingCreate.value = false;
      }
    }
    if (form.testEmail?.trim()) {
      await handleCreateTestEmail();
    }
    return;
  }
  if (!form.testPhone?.trim()) {
    ElMessage.warning('Enter a test phone number');
    return;
  }
  if (!form.message?.trim()) {
    ElMessage.warning('Enter a message to test');
    return;
  }
  testingCreate.value = true;
  try {
    await testPromotionMessage(form.testPhone.trim(), form.message.trim());
    ElMessage.success('Test sent');
  } catch (err: any) {
    const mapped = mapSmsTestError(err?.code);
    if (mapped) {
      ElMessage.error(mapped);
    } else {
      ElMessage.error(err?.message || 'Failed to send test');
    }
  } finally {
    testingCreate.value = false;
  }
};

const isValidEmail = (val: string) => /\S+@\S+\.\S+/.test(val);

const handleCreateTestEmail = async () => {
  if (!form.testEmail?.trim()) {
    ElMessage.warning('Enter a test email');
    return;
  }
  if (!isValidEmail(form.testEmail.trim())) {
    ElMessage.warning('Enter a valid email');
    return;
  }
  if (!form.message?.trim()) {
    ElMessage.warning('Enter a message to test');
    return;
  }
  testingEmail.value = true;
  try {
    await testPromotionEmail(
      form.testEmail.trim(),
      form.emailSubject.trim() || 'SalonFlow promotion',
      form.message.trim(),
    );
    ElMessage.success('Test email sent');
  } catch (err: any) {
    if (err?.code === 'COMMS_PAUSED') {
      ElMessage.error('Comms are paused. Enable before sending emails.');
    } else if (err?.code === 'EMAIL_DISABLED') {
      ElMessage.error('Email sending is disabled for this environment.');
    } else if (err?.code === 'CAP_EXCEEDED') {
      ElMessage.error('Email cap exceeded for this tenant.');
    } else {
      ElMessage.error(err?.message || 'Failed to send test email');
    }
  } finally {
    testingEmail.value = false;
  }
};

const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const buildScheduleIso = () => {
  if (!scheduleDate.value) return '';
  let hour = scheduleHour.value % 12;
  if (scheduleMeridiem.value === 'PM') hour += 12;
  const base = dayjs.tz(
    `${scheduleDate.value}T${String(hour).padStart(2, '0')}:${String(scheduleMinute.value).padStart(2, '0')}:00`,
    businessTz.value,
  );
  return base.toISOString();
};

const validateStep = (step: number) => {
  if (step === 1) {
    if (!form.name.trim()) {
      ElMessage.warning('Promotion name is required');
      return false;
    }
    if (!form.offerValue || form.offerValue <= 0) {
      ElMessage.warning('Enter a discount value');
      return false;
    }
  }
  if (step === 2) {
    if (!form.audiences.length) {
      ElMessage.warning('Select at least one audience');
      return false;
    }
    if (form.visitedAfter && form.visitedBefore && dayjs(form.visitedAfter).isAfter(dayjs(form.visitedBefore))) {
      ElMessage.warning('Visited-after date must be on or before visited-before date');
      return false;
    }
    if (form.minVisits != null && (!Number.isInteger(form.minVisits) || form.minVisits < 1)) {
      ElMessage.warning('Minimum visits must be at least 1');
      return false;
    }
  }
  if (step === 3) {
    if (!form.message.trim()) {
      ElMessage.warning('Message is required');
      return false;
    }
    if ((form.channel === 'email' || form.channel === 'both') && !form.emailSubject.trim()) {
      ElMessage.warning('Email subject is required');
      return false;
    }
  }
  if (step === 4) {
    if (!form.startDate || !form.endDate) {
      ElMessage.warning('Start and end dates are required');
      return false;
    }
    if (dayjs(form.endDate).isBefore(dayjs(form.startDate))) {
      ElMessage.warning('End date must be on or after the start date');
      return false;
    }
    if ((form.sendTimeStart && !form.sendTimeEnd) || (!form.sendTimeStart && form.sendTimeEnd)) {
      ElMessage.warning('Select both a send start time and end time');
      return false;
    }
    if (
      form.sendTimeStart &&
      form.sendTimeEnd &&
      timeValueToMinutes(form.sendTimeEnd) <= timeValueToMinutes(form.sendTimeStart)
    ) {
      ElMessage.warning('Send end time must be after the start time');
      return false;
    }
    if (form.sendWhen === 'schedule') {
      if (!scheduleDate.value) {
        ElMessage.warning('Pick a schedule date');
        return false;
      }
      const iso = buildScheduleIso();
      if (!iso) return false;
      const scheduled = dayjs(iso);
      if (!scheduled.isValid() || scheduled.isBefore(dayjs())) {
        ElMessage.warning('Schedule time must be in the future');
        return false;
      }
      form.scheduleAt = iso;
    } else {
      form.scheduleAt = '';
    }
  }
  return true;
};

const nextStep = async () => {
  if (!validateStep(wizardStep.value)) return;
  if (wizardStep.value === 2) {
    const previewOk = await handlePreview(true);
    if (!previewOk) return;
  }
  if (wizardStep.value < totalSteps) wizardStep.value += 1;
};

const prevStep = () => {
  if (wizardStep.value > 1) wizardStep.value -= 1;
};

const onAudienceChange = (vals: any[]) => {
  clearPreview();
  if (vals.includes('all')) {
    form.audiences = ['all'];
  } else {
    form.audiences = vals.filter((v) => v !== 'all');
  }
};

const customerRecipientTotal = (promo: Promotion) => {
  const stats = statsMap.value[promo.id];
  if (stats && typeof stats.customerTotal === 'number') return stats.customerTotal;
  const total = (promo as any).recipientTotal;
  return typeof total === 'number' ? total : null;
};

const deliveryTotal = (promo: Promotion) => {
  const stats = statsMap.value[promo.id];
  if (stats && typeof stats.total === 'number') return stats.total;
  return customerRecipientTotal(promo);
};

const recipientSummaryLabel = (promo: Promotion) => {
  const total = customerRecipientTotal(promo);
  if (total === 0) return 'Customers: 0 (none match audience)';
  if (total) return `Customers: ${total}`;
  return 'Customers: not calculated yet';
};

const promotionStatusLabel = (promo: Promotion) => {
  switch (promo.status) {
    case 'ACTIVE':
      return 'Active';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'SENDING':
      return 'Sending';
    case 'DISABLED':
      return 'Disabled';
    default:
      return 'Expired';
  }
};

const promotionStatusTagType = (promo: Promotion) => {
  switch (promo.status) {
    case 'ACTIVE':
      return 'success';
    case 'SCHEDULED':
      return 'warning';
    default:
      return 'info';
  }
};

const handlePreview = async (silent = false) => {
  previewing.value = true;
  clearPreview();
  try {
    const channels: ('sms' | 'email')[] =
      form.channel === 'sms' ? ['sms'] : form.channel === 'email' ? ['email'] : ['sms', 'email'];
    const result = await previewPromotion({
      audience: form.audiences,
      channels,
      audienceFilters: buildAudienceFilters(),
    });
    previewCounts.value = {
      totalRecipients: result.totalRecipients,
      sms: result.smsCount,
      email: result.emailCount,
    };
    previewExcluded.value = result.excluded;
    previewSample.value = result.sample;
    return true;
  } catch (err: any) {
    if (!silent) {
      ElMessage.error(err?.message || 'Failed to preview audience');
    }
    return false;
  } finally {
    previewing.value = false;
  }
};

const previewAudience = async () => handlePreview(false);

const sendDisabledReason = (promo: Promotion) => {
  if (promo.status === 'DISABLED') return 'Promotion disabled';
  if (promo.status === 'SCHEDULED' && promo.scheduledAt && dayjs(promo.scheduledAt).isAfter(dayjs())) {
    return `Scheduled for ${formatInBusinessTz(promo.scheduledAt, 'MMM D, YYYY h:mm A', businessTz.value)}`;
  }
  if (promo.status === 'SCHEDULED' && promo.startAt && dayjs(promo.startAt).isAfter(dayjs())) {
    return `Starts on ${formatInBusinessTz(promo.startAt, 'MMM D, YYYY', businessTz.value)}`;
  }
  const total = customerRecipientTotal(promo);
  if (total === 0) return 'No recipients match this audience';
  if ((statsMap.value[promo.id]?.pending ?? 0) > 0 || promo.status === 'SENDING') {
    return 'Send in progress';
  }
  return '';
};

const softCap = 1000;

const sendConfirmIsRetry = computed(() => {
  const stats = sendConfirm.value.stats;
  return Boolean(stats && (stats.total ?? 0) > 0);
});

const sendConfirmTargetCount = computed(() => {
  const stats = sendConfirm.value.stats;
  const promo = sendConfirm.value.promo;
  if (!stats) return promo?.recipientTotal ?? 0;
  if ((stats.total ?? 0) > 0) {
    return stats.retryable ?? stats.pending ?? 0;
  }
  return stats.customerTotal ?? promo?.recipientTotal ?? stats.total ?? 0;
});

const handleSend = async (id: string) => {
  try {
    const stats = await fetchPromotionStats(id);
    statsMap.value[id] = stats;
    const promo = promotions.value.find((p) => p.id === id) || null;
    const total = stats.customerTotal ?? promo?.recipientTotal ?? stats.total ?? 0;
    const targetCount = (stats.total ?? 0) > 0 ? (stats.retryable ?? stats.pending ?? 0) : total;
    if (targetCount === 0) {
      ElMessage.warning(
        (stats.total ?? 0) > 0
          ? 'No remaining retryable customers for this promotion.'
          : 'Cannot send: no recipients for this promotion.',
      );
      return;
    }
    if (total === 0) {
      ElMessage.warning('Cannot send: no recipients for this promotion.');
      return;
    }
    sendConfirm.value = { open: true, promo, stats };
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load promotion stats');
  }
};

const confirmSend = async () => {
  if (!sendConfirm.value.promo) return;
  const id = sendConfirm.value.promo.id;
  sendConfirm.value.open = false;
  sending.value = id;
  try {
    await sendPromotion(id);
    ElMessage.success('Promotion send started');
    ensurePolling(id);
    await loadPromotions();
  } catch (err: any) {
    if (err?.code === 'WEEKLY_LIMIT_EXCEEDED') {
      ElMessage.error('Only one promotion per week is allowed.');
    } else if (err?.code === 'TCPA_BLOCKED') {
      ElMessage.error('Messages can only be sent between 8am–8pm local time.');
    } else if (err?.code === 'EMAIL_SUBJECT_MISSING') {
      ElMessage.error('Add an email subject before sending this promotion.');
    } else if (err?.code === 'SCHEDULED_IN_FUTURE') {
      ElMessage.error('This promotion is scheduled for the future. Adjust the schedule to send now.');
    } else {
      ElMessage.error(err?.message || 'Failed to send promotion');
    }
  } finally {
    sending.value = null;
  }
};

const openAi = async () => {
  aiDialog.value = true;
  aiSuggestions.value = [];
  aiLoading.value = true;
  try {
    const suggestions = await generateAiSuggestions({
      context: 'PROMOTION',
      trigger: 'PROMO_SEND',
      audience: (form.audiences[0] || 'all').toString().toUpperCase(),
      channel: form.channel === 'email' ? 'EMAIL' : 'SMS',
      discount: `${form.offerValue}${form.offerType === 'percent' ? '%' : '$'}`,
      expiry: form.endDate ? `Ends ${form.endDate}` : '',
      tone: aiTone.value,
      short: aiShort.value,
      businessName: form.businessName || '',
    });
    aiSuggestions.value = suggestions;
  } catch (err: any) {
    ElMessage.error(err?.message || 'AI generation failed');
  } finally {
    aiLoading.value = false;
  }
};

const useSuggestion = (s: string) => {
  form.message = s;
  aiDialog.value = false;
};

const loadBusinessName = async () => {
  if (businessNameCached.value) return;
  try {
    const status = await fetchOnboardingStatus(true);
    businessNameCached.value = status.businessName || '';
    form.businessName = businessNameCached.value;
  } catch {
    // best-effort only
  }
};
loadPromotions();
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Promotions</h1>
        <p class="text-sm text-slate-600">Targeted offers with SMS-first delivery.</p>
      </div>
      <ElButton type="primary" class="sf-btn" @click="openCreate">New Promotion</ElButton>
    </div>

    <div class="flex items-center gap-3">
      <ElButton
        size="small"
        class="sf-btn"
        :type="activeTab === 'active' ? 'primary' : 'default'"
        @click="setTab('active')"
      >
        Active
      </ElButton>
      <ElButton
        size="small"
        class="sf-btn"
        :type="activeTab === 'expired' ? 'primary' : 'default'"
        @click="setTab('expired')"
      >
        Expired
      </ElButton>
    </div>

    <ElCard class="bg-white">
      <div class="overflow-x-auto" :class="{ 'opacity-60': loading }">
        <table class="promo-table w-full text-left">
          <thead>
            <tr>
              <th>Promotion</th>
              <th>Audience</th>
              <th>Offer</th>
              <th>Condition</th>
              <th>Sent</th>
              <th>Redeemed</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="promo in filteredPromotions" :key="promo.id">
              <td class="font-semibold text-slate-900">{{ promo.name }}</td>
              <td class="text-sm text-slate-700">{{ promo.audience.join(', ') }}</td>
              <td class="text-sm text-slate-700">
                {{ promo.offerType === 'percent' ? `${promo.offerValue}% off` : `$${promo.offerValue} off` }}
              </td>
              <td class="text-sm text-slate-600">—</td>
              <td class="text-sm text-slate-700">{{ promo.sentCount }}</td>
              <td class="text-sm text-slate-700">{{ promo.redeemedCount }}</td>
              <td>
                <ElTag :type="promotionStatusTagType(promo)" effect="light">
                  {{ promotionStatusLabel(promo) }}
                </ElTag>
              </td>
              <td class="text-right">
                <div class="flex flex-col gap-2">
                  <div class="audience-summary">
                    <div class="flex justify-between text-xs text-slate-600">
                      <span>{{ recipientSummaryLabel(promo) }}</span>
                      <span v-if="statsMap[promo.id]">
                        Sent {{ statsMap[promo.id].sent ?? 0 }} · Pending {{ statsMap[promo.id].pending ?? 0 }}
                      </span>
                    </div>
                    <div
                      v-if="deliveryTotal(promo)"
                      class="audience-bar"
                    >
                      <div
                        class="seg seg-sent"
                        :style="{ width: `${Math.max(0, Math.min(100, Math.round(((statsMap[promo.id]?.sent ?? 0) / (deliveryTotal(promo) || 1)) * 100)))}%` }"
                        v-if="statsMap[promo.id]?.sent"
                      />
                      <div
                        class="seg seg-pending"
                        :style="{ width: `${Math.max(0, Math.min(100, Math.round(((statsMap[promo.id]?.pending ?? 0) / (deliveryTotal(promo) || 1)) * 100)))}%` }"
                        v-if="statsMap[promo.id]?.pending"
                      />
                      <div
                        class="seg seg-failed"
                        :style="{ width: `${Math.max(0, Math.min(100, Math.round(((statsMap[promo.id]?.failed ?? 0) / (deliveryTotal(promo) || 1)) * 100)))}%` }"
                        v-if="statsMap[promo.id]?.failed"
                      />
                      <div
                        class="seg seg-blocked"
                        :style="{ width: `${Math.max(0, Math.min(100, Math.round(((statsMap[promo.id]?.blocked_cap ?? 0) / (deliveryTotal(promo) || 1)) * 100)))}%` }"
                        v-if="statsMap[promo.id]?.blocked_cap"
                      />
                    </div>
                  </div>
                  <div v-if="statsMap[promo.id] && statsMap[promo.id].total" class="progress-row">
                    <div class="text-xs text-slate-600 flex justify-between">
                      <span>Pending {{ statsMap[promo.id].pending ?? 0 }}</span>
                      <span>
                        Sent {{ statsMap[promo.id].sent ?? 0 }}
                        | Blocked {{ statsMap[promo.id].blocked_cap ?? 0 }}
                        | Failed {{ statsMap[promo.id].failed ?? 0 }}
                      </span>
                    </div>
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((statsMap[promo.id].sent ?? 0) +
                                (statsMap[promo.id].failed ?? 0) +
                                (statsMap[promo.id].simulated ?? 0) +
                                (statsMap[promo.id].blocked_cap ?? 0)) /
                                (statsMap[promo.id].total || 1) *
                                100,
                            ),
                          )}%`,
                        }"
                      />
                    </div>
                  </div>
                  <div class="flex flex-wrap justify-end gap-2">
                    <ElButton
                      size="small"
                      class="sf-btn sf-btn--table sf-btn--ghost"
                      @click="openView(promo)"
                    >
                      View
                    </ElButton>
                    <ElButton
                      size="small"
                      class="sf-btn sf-btn--table sf-btn--ghost"
                      :disabled="promo.status === 'DISABLED'"
                      @click="openDisable(promo.id)"
                    >
                      Disable
                    </ElButton>
                    <ElTooltip content="Send test to your number">
                      <span>
                        <ElButton
                          size="small"
                          class="sf-btn sf-btn--table sf-btn--ghost"
                          :loading="testing === promo.id"
                          @click="handleTest(promo.id, form.testPhone)"
                        >
                          Test
                        </ElButton>
                      </span>
                    </ElTooltip>
                    <ElButton
                      size="small"
                      type="primary"
                      class="sf-btn sf-btn--table sf-btn--icon"
                      :disabled="Boolean(sendDisabledReason(promo))"
                      :title="sendDisabledReason(promo) || 'Send promotion'"
                      :loading="sending === promo.id"
                      @click="handleSend(promo.id)"
                    >
                      Send
                    </ElButton>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPromotions.length === 0">
              <td colspan="8" class="py-6 text-center text-sm text-slate-500">No promotions yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ElCard>

    <ElDialog v-model="disableConfirm.open" title="Disable promotion" width="420px">
      <div class="text-sm text-slate-700">
        Disabling stops any further sends for this promotion. Existing sent messages remain delivered.
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="disableConfirm = { open: false, id: null }">Cancel</ElButton>
          <ElButton type="danger" @click="handleDisable">Disable</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="sendConfirm.open" title="Confirm send" width="420px">
      <div v-if="sendConfirm.promo" class="space-y-3 text-sm text-slate-800">
        <div class="font-semibold">{{ sendConfirm.promo.name }}</div>
        <div class="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {{ sendConfirmIsRetry ? 'This resend will target' : 'You are about to send to' }}
          <span class="font-semibold">
            {{ sendConfirmTargetCount }}
          </span>
          {{ sendConfirmIsRetry ? 'remaining customers.' : 'customers.' }}
        </div>
        <div class="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1">
          <div>SMS recipients: {{ sendConfirm.stats?.per_channel?.sms?.total ?? 0 }}</div>
          <div>Email recipients: {{ sendConfirm.stats?.per_channel?.email?.total ?? 0 }}</div>
          <div class="text-xs text-slate-600">
            Customer total: {{ sendConfirm.stats?.customerTotal ?? sendConfirm.promo.recipientTotal ?? '—' }}
          </div>
          <div class="text-xs text-slate-600">Total message deliveries: {{ sendConfirm.stats?.total ?? 0 }}</div>
          <div v-if="sendConfirmIsRetry" class="text-xs text-emerald-700">
            Already sent customers will not receive the message again.
          </div>
          <div
            v-if="sendConfirmTargetCount > softCap"
            class="mt-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800 text-xs"
          >
            Large send: {{ sendConfirmTargetCount }} customers. Proceed?
          </div>
        </div>
        <p class="text-xs text-slate-600">
          This will send via all selected channels. This action cannot be undone.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="sendConfirm.open = false">Cancel</ElButton>
          <ElButton type="primary" :loading="sending === sendConfirm.promo?.id" @click="confirmSend">
            Confirm send
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="viewDrawer.open" title="Promotion details" width="640px">
      <div v-if="viewDrawer.promo" class="space-y-3 text-sm text-slate-800">
        <div class="text-base font-semibold">{{ viewDrawer.promo.name }}</div>
        <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold text-slate-600 mb-1">Audience snapshot</div>
          <pre class="whitespace-pre-wrap text-xs text-slate-700">{{ (viewDrawer.promo as any).audienceSnapshotJson || '—' }}</pre>
          <div class="text-xs text-slate-600 mt-1">Recipient total: {{ (viewDrawer.promo as any).recipientTotal ?? '—' }}</div>
        </div>
        <div v-if="statsMap[viewDrawer.promo.id]" class="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
          <div class="text-xs font-semibold text-slate-600">Live stats</div>
          <div class="text-xs text-slate-700">Customers: {{ statsMap[viewDrawer.promo.id].customerTotal ?? viewDrawer.promo.recipientTotal ?? '—' }}</div>
          <div class="text-xs text-slate-700">Total: {{ statsMap[viewDrawer.promo.id].total }}</div>
          <div class="text-xs text-slate-700">Pending: {{ statsMap[viewDrawer.promo.id].pending }}</div>
          <div class="text-xs text-slate-700">Sent: {{ statsMap[viewDrawer.promo.id].sent }}</div>
          <div class="text-xs text-slate-700">Failed: {{ statsMap[viewDrawer.promo.id].failed }}</div>
          <div class="text-xs text-slate-700">Blocked (cap): {{ statsMap[viewDrawer.promo.id].blocked_cap ?? 0 }}</div>
          <div class="text-xs text-slate-700">Excluded (no consent): {{ statsMap[viewDrawer.promo.id].excluded_no_consent ?? 0 }}</div>
          <div class="text-xs text-slate-700">Excluded (no phone): {{ statsMap[viewDrawer.promo.id].excluded_no_phone ?? 0 }}</div>
          <div class="text-xs text-slate-700">Simulated: {{ statsMap[viewDrawer.promo.id].simulated }}</div>
          <div class="text-xs text-slate-700">Status: {{ statsMap[viewDrawer.promo.id].status }}</div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <ElButton @click="closeView">Close</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="dialogOpen" title="Create Promotion" width="960px" class="promo-modal">
      <div class="wizard">
        <div class="wizard-steps">
          <div v-for="n in totalSteps" :key="n" class="wizard-step" :class="{ active: wizardStep === n, done: wizardStep > n }">
            <span class="badge">{{ n }}</span>
            <span class="label">
              {{
                n === 1
                  ? 'Basics'
                  : n === 2
                    ? 'Audience'
                    : n === 3
                      ? 'Message & Channel'
                      : 'Schedule & Review'
              }}
            </span>
          </div>
        </div>

        <div class="wizard-body">
          <template v-if="wizardStep === 1">
            <ElCard class="bg-white">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-slate-800">Promotion name</label>
                  <ElInput v-model="form.name" placeholder="10% Off Valentine Special" />
                </div>
                <div>
                  <label class="text-sm font-medium text-slate-800">Business name</label>
                  <ElInput v-model="form.businessName" placeholder="SalonFlow" disabled />
                </div>
                <div>
                  <label class="text-sm font-medium text-slate-800">Discount</label>
                  <div class="flex gap-3 items-center flex-wrap">
                    <ElRadioGroup v-model="form.offerType" size="small">
                      <ElRadioButton label="percent">Percent</ElRadioButton>
                      <ElRadioButton label="amount">Amount</ElRadioButton>
                    </ElRadioGroup>
                    <ElInputNumber
                      v-model="form.offerValue"
                      :min="1"
                      :max="form.offerType === 'percent' ? 100 : undefined"
                      :step="1"
                      class="w-40"
                    />
                  </div>
                </div>
              </div>
            </ElCard>
          </template>

          <template v-else-if="wizardStep === 2">
            <ElCard class="bg-white">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-slate-800">Who to offer</label>
                  <ElCheckboxGroup v-model="form.audiences" class="audience-grid" @change="onAudienceChange">
                    <ElCheckbox v-for="opt in audienceOptions" :key="opt.value" :label="opt.value">
                      {{ opt.label }}
                    </ElCheckbox>
                  </ElCheckboxGroup>
                </div>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label class="text-sm font-medium text-slate-800">Visited after</label>
                    <ElDatePicker
                      v-model="form.visitedAfter"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="2025-01-01"
                      class="w-full"
                      @change="clearPreview"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-slate-800">Visited before</label>
                    <ElDatePicker
                      v-model="form.visitedBefore"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="Optional"
                      class="w-full"
                      @change="clearPreview"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-slate-800">Minimum visits</label>
                    <ElInputNumber
                      v-model="form.minVisits"
                      :min="1"
                      :step="1"
                      class="w-full"
                      @change="clearPreview"
                    />
                  </div>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                  Leave filters empty to keep the current audience behavior. Add a visited window or minimum visits to target only recent customers.
                </div>
                <ElCheckbox v-model="form.oneTimeUse">One-time use per customer</ElCheckbox>
              </div>
            </ElCard>
          </template>

          <template v-else-if="wizardStep === 3">
            <div class="space-y-4">
              <ElCard class="bg-white">
                <div class="space-y-3">
                <div class="space-y-1">
                  <label class="text-sm font-medium text-slate-800">Channel</label>
                  <ElRadioGroup v-model="form.channel" size="default" class="mt-2 channel-group" @change="clearPreview">
                    <ElRadioButton label="sms">SMS</ElRadioButton>
                    <ElRadioButton label="email">Email</ElRadioButton>
                    <ElRadioButton label="both">Both</ElRadioButton>
                  </ElRadioGroup>
                    <p class="text-xs text-slate-600">
                      Preview customers:
                      <span class="font-semibold">Total {{ previewCounts?.totalRecipients ?? '—' }}</span>
                      ·
                      <span class="font-semibold">SMS {{ previewCounts?.sms ?? '—' }}</span>
                      ·
                      <span class="font-semibold">Email {{ previewCounts?.email ?? '—' }}</span>
                      <ElButton
                        size="small"
                        class="ml-2"
                        :loading="previewing"
                        @click="previewAudience"
                      >
                        Refresh count
                      </ElButton>
                    </p>
                    <p v-if="previewExcluded" class="text-[11px] text-slate-500">
                      Excluded — SMS: no phone {{ previewExcluded.sms.noPhone }}, no consent
                      {{ previewExcluded.sms.noConsent }} · Email: no email {{ previewExcluded.email.noEmail }}, no consent
                      {{ previewExcluded.email.noConsent }}
                    </p>
                    <div v-if="previewSample.length" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                      <div class="mb-2 font-semibold text-slate-800">Sample audience</div>
                      <div v-for="sample in previewSample" :key="`${sample.name}-${sample.lastVisit || 'none'}-${sample.visitCount}`" class="flex items-center justify-between gap-3 py-1">
                        <span>{{ sample.name }}</span>
                        <span class="text-slate-500">
                          {{ sample.lastVisit ? `Last visit ${formatInBusinessTz(sample.lastVisit, 'MMM D, YYYY', businessTz)}` : 'No visit recorded' }}
                          · {{ sample.visitCount }} visit{{ sample.visitCount === 1 ? '' : 's' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-slate-800">
                      Message ({{ form.channel === 'sms' ? 'SMS' : form.channel === 'email' ? 'Email' : 'SMS + Email' }})
                    </label>
                    <ElInput
                      v-model="form.message"
                      type="textarea"
                      :rows="4"
                      :placeholder="form.channel === 'sms' ? 'Hi {{first_name}}, enjoy 10% off your next visit...' : 'Write the email body here'"
                    />
                    <div class="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>
                        {{
                          form.channel === 'sms'
                            ? 'Include offer and expiration details.'
                            : 'Plain-text or simple HTML is fine.'
                        }}
                      </span>
                      <div class="flex items-center gap-2">
                        <ElButton size="small" type="info" plain @click="openAi">Generate with AI</ElButton>
                        <span v-if="form.channel !== 'email'">{{ charCount }} chars</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="form.channel !== 'email'" class="flex flex-col gap-2">
                    <ElCheckbox v-model="form.appendStop">Auto-append “Reply STOP to opt out”</ElCheckbox>
                    <ElCheckbox v-model="form.appendExpiry">Include expiry text</ElCheckbox>
                  </div>
                  <div v-else class="space-y-2">
                    <label class="text-sm font-medium text-slate-800">Email subject</label>
                    <ElInput v-model="form.emailSubject" placeholder="MTV Nails · Special offer inside" />
                  </div>
                </div>
              </ElCard>

              <ElCard class="bg-white">
                <div class="grid gap-3 md:grid-cols-2">
                  <div v-if="form.channel !== 'email'">
                    <label class="text-sm font-medium text-slate-800">Test phone (optional)</label>
                    <ElInput v-model="form.testPhone" placeholder="+1 555 123 4567" />
                    <ElButton
                      class="sf-btn sf-btn--ghost mt-2"
                      size="small"
                      native-type="button"
                      :loading="testingCreate"
                      :disabled="!form.testPhone || !form.message || testingCreate"
                      @click="handleCreateTest"
                    >
                      Send test
                    </ElButton>
                  </div>
                  <div v-if="form.channel !== 'sms'">
                    <label class="text-sm font-medium text-slate-800">Test email (optional)</label>
                    <ElInput v-model="form.testEmail" placeholder="you@example.com" />
                    <ElButton
                      class="sf-btn sf-btn--ghost mt-2"
                      size="small"
                      native-type="button"
                      :loading="testingEmail"
                      :disabled="!form.testEmail || !isValidEmail(form.testEmail) || !form.message || testingEmail"
                      @click="handleCreateTestEmail"
                    >
                      Send test email
                    </ElButton>
                    <p class="mt-1 text-xs text-slate-500">Test messages are one-time and not saved.</p>
                  </div>
                </div>
              </ElCard>
            </div>
          </template>

          <template v-else>
            <ElCard class="bg-white review-card">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="text-sm font-medium text-slate-800">Start date</label>
                    <ElDatePicker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="Start" class="w-full" />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-slate-800">End date</label>
                    <ElDatePicker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="End" class="w-full" />
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-800">Allowed days</label>
                  <ElCheckboxGroup v-model="form.allowedDays" class="audience-grid">
                    <ElCheckbox v-for="option in weekdayOptions" :key="option.value" :label="option.value">
                      {{ option.label }}
                    </ElCheckbox>
                  </ElCheckboxGroup>
                  <p class="text-xs text-slate-500">Leave empty to allow any day. For Mon–Thu, select Mon, Tue, Wed, Thu.</p>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="text-sm font-medium text-slate-800">Send window start</label>
                    <ElTimeSelect
                      v-model="form.sendTimeStart"
                      start="06:00"
                      end="22:00"
                      step="00:30"
                      placeholder="09:00"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-slate-800">Send window end</label>
                    <ElTimeSelect
                      v-model="form.sendTimeEnd"
                      start="06:00"
                      end="22:00"
                      step="00:30"
                      placeholder="18:00"
                      class="w-full"
                    />
                  </div>
                </div>
                <p class="text-xs text-slate-500">
                  Messages only send while the promotion is in date range, on the selected days, and inside this time window.
                </p>

                <div class="send-timing-row">
                  <div class="send-timing-label">
                    <label class="text-sm font-medium text-slate-800">Send timing</label>
                  </div>
                  <div class="send-timing-actions">
                    <ElRadioGroup v-model="form.sendWhen" size="small" class="send-timing-buttons">
                      <ElRadioButton label="now">Send now</ElRadioButton>
                      <ElRadioButton label="schedule">Schedule</ElRadioButton>
                    </ElRadioGroup>
                    <div v-if="tcpaWarning" class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {{ tcpaWarning }}
                    </div>
                  </div>
                </div>
                <div v-if="form.sendWhen === 'schedule'" class="mt-3 space-y-2">
                  <ElDatePicker
                    v-model="scheduleDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="Select date"
                    class="w-full"
                  />
                  <div class="flex flex-wrap items-center gap-2">
                    <ElSelect v-model="scheduleHour" placeholder="HH" style="width: 90px">
                      <ElOption v-for="h in hourOptions" :key="h" :label="h.toString().padStart(2, '0')" :value="h" />
                    </ElSelect>
                    <span class="text-slate-500">:</span>
                    <ElSelect v-model="scheduleMinute" placeholder="MM" style="width: 90px">
                      <ElOption
                        v-for="m in minuteOptions"
                        :key="m"
                        :label="m.toString().padStart(2, '0')"
                        :value="m"
                      />
                    </ElSelect>
                    <ElSelect v-model="scheduleMeridiem" style="width: 90px">
                      <ElOption label="AM" value="AM" />
                      <ElOption label="PM" value="PM" />
                    </ElSelect>
                  </div>
                  <p class="text-xs text-slate-500">12-hour format. The first batch will wait until this scheduled time in the business timezone.</p>
                </div>

                <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 space-y-2">
                  <div class="font-semibold text-slate-900">
                    You are about to send to {{ previewCounts?.totalRecipients ?? '—' }} customers
                  </div>
                  <div>Audience: {{ form.audiences.join(', ') }}</div>
                  <div>Visit filters: {{ form.visitedAfter || form.visitedBefore || form.minVisits ? `After ${form.visitedAfter || 'any'}, before ${form.visitedBefore || 'any'}, min ${form.minVisits ?? 1} visit(s)` : 'None' }}</div>
                  <div>Promotion window: {{ form.startDate || '—' }} to {{ form.endDate || '—' }}</div>
                  <div>Allowed days: {{ selectedWeekdaysLabel }}</div>
                  <div>Send time window: {{ sendWindowLabel }}</div>
                  <div v-if="form.sendWhen === 'schedule' && (form.scheduleAt || scheduleDate)">
                    Scheduled for: {{ formatInBusinessTz(form.scheduleAt || buildScheduleIso(), 'MMM D, YYYY h:mm A', businessTz) }}
                  </div>
                  <div v-else>Delivery mode: Send immediately</div>
                </div>
              </div>
            </ElCard>
          </template>
        </div>

        <div class="wizard-footer">
          <div class="wizard-progress">Step {{ wizardStep }} of {{ totalSteps }}</div>
          <div class="wizard-actions">
            <ElButton :disabled="wizardStep === 1" @click="prevStep">Back</ElButton>
            <ElButton v-if="wizardStep < totalSteps" type="primary" @click="nextStep">Next</ElButton>
            <ElButton v-else type="primary" :loading="saving" @click="submit">Save</ElButton>
            <ElButton class="ml-2" @click="dialogOpen = false">Cancel</ElButton>
          </div>
        </div>
      </div>
    </ElDialog>

    <ElDialog v-model="aiDialog" title="AI Suggestions" width="520px">
      <div class="flex gap-3 items-center mb-3">
        <ElSelect v-model="aiTone" size="small" style="width: 160px" placeholder="Tone">
          <ElOption label="Friendly" value="FRIENDLY" />
          <ElOption label="Urgent" value="URGENT" />
          <ElOption label="Premium" value="PREMIUM" />
          <ElOption label="Casual" value="CASUAL" />
        </ElSelect>
        <ElSwitch v-model="aiShort" active-text="Short & punchy" />
        <ElButton size="small" :loading="aiLoading" @click="openAi">Refresh</ElButton>
      </div>
      <div v-if="aiLoading" class="text-sm text-slate-500">Generating…</div>
      <div v-else class="space-y-2">
        <ElCard v-for="s in aiSuggestions" :key="s" class="cursor-pointer" @click="useSuggestion(s)">
          <div class="text-sm text-slate-800">{{ s }}</div>
          <div class="mt-1 text-2xs text-slate-500">Click to use</div>
        </ElCard>
        <div v-if="!aiSuggestions.length" class="text-sm text-slate-500">No suggestions yet.</div>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.promo-table th,
.promo-table td {
  padding: 10px 8px;
}
.promo-table th {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.promo-table td {
  border-top: 1px solid #e2e8f0;
}
.promo-modal :deep(.el-dialog) {
  max-width: 960px;
  width: 92%;
}
.promo-modal :deep(.el-dialog__body) {
  padding-top: 24px;
  padding-bottom: 24px;
}
.promo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 900px) {
  .promo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.promo-col :deep(.el-card__body) {
  padding: 16px;
}
.audience-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px 12px;
}
.progress-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #6366f1);
  transition: width 0.3s ease;
}
.audience-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.audience-bar {
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}
.audience-bar .seg {
  height: 100%;
}
.seg-sent {
  background: #16a34a;
}
.seg-pending {
  background: #0ea5e9;
}
.seg-failed {
  background: #f97316;
}
.seg-blocked {
  background: #475569;
}

.wizard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wizard-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.wizard-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}
.wizard-step .badge {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}
.wizard-step.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #0f172a;
}
.wizard-step.active .badge {
  background: #3b82f6;
  color: white;
}
.wizard-step.done {
  border-color: #bbf7d0;
  background: #ecfdf3;
}
.wizard-step.done .badge {
  background: #22c55e;
  color: white;
}
.wizard-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.review-card :deep(.el-card__body) {
  padding-top: 32px;
  padding-bottom: 32px;
}
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 4px;
  border-top: 1px solid #e2e8f0;
  position: sticky;
  bottom: 0;
  background: white;
}
.wizard-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.wizard-progress {
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}
.channel-group {
  display: inline-flex;
  gap: 6px;
  padding-left: 4px;
}
.channel-group :deep(.el-radio-button__inner) {
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 10px 14px;
}
.send-timing-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.send-timing-label {
  min-width: 110px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
}
.send-timing-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.send-timing-buttons :deep(.el-radio-button__inner) {
  min-height: 44px;
  min-width: 140px;
  padding: 10px 18px;
  font-size: 15px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
