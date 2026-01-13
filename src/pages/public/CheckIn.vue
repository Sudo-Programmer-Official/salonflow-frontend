<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElButton, ElAlert } from 'element-plus';
import { useRoute } from 'vue-router';
import { createPublicCheckIn, fetchServices } from '../../api/checkins';
import type { ServiceOption } from '../../api/checkins';

const form = reactive({
  name: '',
  phoneE164: '',
  serviceId: '',
});

const services = ref<ServiceOption[]>([]);
const loadingServices = ref(false);
const submitting = ref(false);
const success = ref(false);
const errorMessage = ref('');
const businessName = ref<string>('Check In');
const route = useRoute();
const tenant = computed(
  () =>
    (route.query.tenant as string | undefined) ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) ||
    'demo',
);

onMounted(async () => {
  if (tenant.value) {
    localStorage.setItem('tenantSubdomain', tenant.value);
    localStorage.setItem('tenantId', tenant.value);
  }
  loadingServices.value = true;
  try {
    services.value = await fetchServices();
  } catch {
    // leave services empty on failure; page still works
    services.value = [];
  } finally {
    loadingServices.value = false;
  }

  try {
    const res = await fetch(
      tenant.value ? `/api/public/tenant?tenant=${encodeURIComponent(tenant.value)}` : '/api/public/tenant',
    );
    if (res.ok) {
      const data = await res.json();
      businessName.value = data.name || 'Check In';
      localStorage.setItem('businessName', data.name);
      document.title = `${data.name} – Check In`;
    }
  } catch {
    // ignore
  }
});

const onSubmit = async () => {
  errorMessage.value = '';
  success.value = false;
  submitting.value = true;
  try {
    await createPublicCheckIn({
      name: form.name.trim(),
      phoneE164: form.phoneE164.trim(),
      serviceId: form.serviceId || undefined,
      serviceName:
        form.serviceId && services.value.length
          ? services.value.find((s) => s.id === form.serviceId)?.name
          : undefined,
    });
    success.value = true;
    form.name = '';
    form.phoneE164 = '';
    form.serviceId = '';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to check in';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="w-full">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">{{ businessName }}</h1>
      <p class="mt-2 text-sm text-slate-600">Let us know you're here. We'll call you shortly.</p>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <ElForm label-position="top" class="space-y-4" @submit.prevent="onSubmit">
        <ElFormItem label="Name" required>
          <ElInput
            v-model="form.name"
            placeholder="Your name"
            size="large"
            autocomplete="name"
          />
        </ElFormItem>

        <ElFormItem label="Phone number" required>
          <ElInput
            v-model="form.phoneE164"
            placeholder="+1 555 123 4567"
            size="large"
            autocomplete="tel"
          />
        </ElFormItem>

        <ElFormItem label="Service (optional)">
          <ElSelect
            v-model="form.serviceId"
            placeholder="Select a service"
            size="large"
            clearable
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

        <div class="space-y-3">
          <ElButton
            type="primary"
            size="large"
            class="w-full"
            :loading="submitting"
            :disabled="!form.name || !form.phoneE164 || submitting"
            @click="onSubmit"
          >
            Check In
          </ElButton>

          <ElAlert
            v-if="success"
            type="success"
            :closable="false"
            title="You're checked in! Please wait to be called."
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
