<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElDatePicker, ElTimeSelect, ElButton, ElAlert } from 'element-plus';
import { fetchServices, type ServiceItem } from '../../api/services';
import { createPublicAppointment } from '../../api/appointments';

const services = ref<ServiceItem[]>([]);
const loadingServices = ref(false);
const submitting = ref(false);
const success = ref(false);
const errorMessage = ref('');

const form = reactive({
  name: '',
  phoneE164: '',
  serviceId: '',
  date: '',
  time: '',
  notes: '',
});

const loadServices = async () => {
  loadingServices.value = true;
  try {
    services.value = await fetchServices();
  } catch {
    services.value = [];
  } finally {
    loadingServices.value = false;
  }
};

onMounted(() => {
  loadServices();
});

const onSubmit = async () => {
  errorMessage.value = '';
  success.value = false;
  submitting.value = true;
  try {
    await createPublicAppointment({
      name: form.name.trim(),
      phoneE164: form.phoneE164.trim(),
      serviceId: form.serviceId,
      scheduledAt: form.date && form.time ? `${form.date}T${form.time}:00` : '',
      notes: form.notes || undefined,
    });
    success.value = true;
    form.name = '';
    form.phoneE164 = '';
    form.serviceId = '';
    form.date = '';
    form.time = '';
    form.notes = '';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to book';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="w-full">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">Book an Appointment</h1>
      <p class="mt-2 text-sm text-slate-600">Choose a service and time that works for you.</p>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <ElForm label-position="top" class="space-y-4" @submit.prevent="onSubmit">
        <ElFormItem label="Name" required>
          <ElInput v-model="form.name" placeholder="Your name" size="large" autocomplete="name" />
        </ElFormItem>

        <ElFormItem label="Phone number" required>
          <ElInput
            v-model="form.phoneE164"
            placeholder="+1 555 123 4567"
            size="large"
            autocomplete="tel"
          />
        </ElFormItem>

        <ElFormItem label="Service" required>
          <ElSelect
            v-model="form.serviceId"
            placeholder="Select a service"
            size="large"
            filterable
            :loading="loadingServices"
          >
            <ElOption
              v-for="service in services"
              :key="service.id"
              :label="service.name"
              :value="service.id"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Date" required>
          <ElDatePicker v-model="form.date" type="date" placeholder="Select date" />
        </ElFormItem>

        <ElFormItem label="Time" required>
          <ElTimeSelect
            v-model="form.time"
            start="08:00"
            step="00:15"
            end="20:00"
            placeholder="Select time"
          />
        </ElFormItem>

        <ElFormItem label="Notes">
          <ElInput v-model="form.notes" type="textarea" :rows="3" placeholder="Notes (optional)" />
        </ElFormItem>

        <div class="space-y-3">
          <ElButton
            type="primary"
            size="large"
            class="w-full"
            :loading="submitting"
            :disabled="!form.name || !form.phoneE164 || !form.serviceId || !form.date || !form.time || submitting"
            @click="onSubmit"
          >
            Book Appointment
          </ElButton>

          <ElAlert
            v-if="success"
            type="success"
            :closable="false"
            title="Your booking is submitted. We’ll confirm soon."
            class="w-full"
          />
          <ElAlert
            v-if="errorMessage"
            type="error"
            :closable="false"
            :title="errorMessage"
            class="w-full"
          />
        </div>
      </ElForm>
    </div>
  </div>
</template>
