<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElInput,
  ElButton,
  ElAlert,
  ElDialog,
  ElMessage,
  ElCheckbox,
} from 'element-plus';
import {
  fetchSmsRecipientsCount,
  sendSms,
  type SmsSegment,
} from '../../api/sms';

const segment = ref<SmsSegment>('all');
const recipientsCount = ref(0);
const loadingRecipients = ref(false);
const message = ref('');
const consent = ref(false);
const sending = ref(false);
const showConfirm = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const loadRecipients = async () => {
  loadingRecipients.value = true;
  const currentSegment = segment.value;
  try {
    const count = await fetchSmsRecipientsCount(currentSegment);
    if (currentSegment === segment.value) {
      recipientsCount.value = count;
    }
  } catch (err) {
    recipientsCount.value = 0;
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load SMS recipients');
  } finally {
    loadingRecipients.value = false;
  }
};

onMounted(() => {
  loadRecipients();
});

watch(segment, () => {
  loadRecipients();
});

const charCount = computed(() => message.value.length);
const overLimit = computed(() => charCount.value > 160);
const canSend = computed(
  () =>
    !!message.value.trim() &&
    !overLimit.value &&
    consent.value &&
    recipientsCount.value > 0 &&
    !sending.value &&
    !loadingRecipients.value,
);

const openConfirm = () => {
  successMessage.value = '';
  errorMessage.value = '';
  showConfirm.value = true;
};

const handleSend = async () => {
  sending.value = true;
  try {
    await sendSms({
      segment: segment.value,
      message: message.value.trim(),
      consentConfirmed: true,
    });
    successMessage.value = 'SMS sent for review/dispatch.';
    message.value = '';
    consent.value = false;
    showConfirm.value = false;
    await loadRecipients();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to send SMS';
  } finally {
    sending.value = false;
  }
};

const segmentLabel = (seg: SmsSegment) => {
  if (seg === 'new') return 'New Customers';
  if (seg === 'regular') return 'Regular Customers';
  if (seg === 'vip') return 'VIP Customers';
  return 'All Customers';
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">SMS Promotions</h1>
      <p class="text-sm text-slate-600">
        Manual, one-time promotional SMS to opted-in customers. No scheduling or automation.
      </p>
    </div>

    <ElCard class="bg-white">
      <div class="space-y-4">
        <div class="space-y-2">
          <div class="text-sm font-semibold text-slate-900">Audience</div>
          <ElRadioGroup v-model="segment" size="large">
            <ElRadioButton label="all">All Customers</ElRadioButton>
            <ElRadioButton label="new">New Customers</ElRadioButton>
            <ElRadioButton label="regular">Regular Customers</ElRadioButton>
            <ElRadioButton label="vip">VIP Customers</ElRadioButton>
          </ElRadioGroup>
          <div class="text-sm text-slate-600">
            Recipients: <strong>{{ recipientsCount }}</strong>
            <span v-if="loadingRecipients" class="text-xs text-slate-500">(updating...)</span>
          </div>
          <div class="text-xs text-slate-500">
            Only customers who have opted in for SMS will receive this message.
          </div>
          <ElAlert
            v-if="!loadingRecipients && recipientsCount === 0"
            type="warning"
            title="No opted-in customers found for this audience."
            show-icon
            :closable="false"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-slate-900">Message</div>
            <div class="text-xs text-slate-600">
              {{ charCount }} / 160
            </div>
          </div>
          <ElInput
            v-model="message"
            type="textarea"
            :rows="4"
            placeholder="Enter message (max 160 chars)"
            maxlength="160"
            show-word-limit
          />
        </div>

        <ElAlert
          title="Confirm recipients have opted in. No scheduling or automation."
          type="warning"
          :closable="false"
          class="w-full"
        />

        <div class="flex items-center gap-2">
          <ElCheckbox v-model="consent" label="I confirm these customers have consented to receive SMS messages." />
        </div>

        <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div class="text-sm font-semibold text-slate-900">Preview</div>
          <div class="text-sm text-slate-800 whitespace-pre-line">
            {{ message || 'Your message will appear here.' }}
          </div>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs text-slate-500">
            Manual send only. No scheduling, no automation, no MMS, no emojis.
          </div>
          <ElButton
            type="primary"
            :disabled="!canSend"
            :loading="sending"
            @click="openConfirm"
          >
            Send SMS
          </ElButton>
        </div>

        <ElAlert
          v-if="successMessage"
          type="success"
          :title="successMessage"
          :closable="false"
          class="w-full"
        />
        <ElAlert
          v-if="errorMessage"
          type="error"
          :title="errorMessage"
          :closable="false"
          class="w-full"
        />
      </div>
    </ElCard>

    <ElDialog v-model="showConfirm" title="Confirm Send" width="420px">
      <div class="space-y-3">
        <div class="text-sm text-slate-700">
          Audience: <strong>{{ segmentLabel(segment) }}</strong>
        </div>
        <div class="text-sm text-slate-700">
          Estimated recipients: <strong>{{ recipientsCount }}</strong>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-line">
          {{ message }}
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="showConfirm = false">Cancel</ElButton>
          <ElButton type="primary" :loading="sending" :disabled="!canSend" @click="handleSend">
            Confirm Send
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
