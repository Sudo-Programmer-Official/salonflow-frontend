<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElTable, ElTableColumn, ElSwitch, ElButton, ElForm, ElFormItem, ElInput, ElInputNumber, ElMessage, ElCard } from 'element-plus';
import { fetchServices, createService, updateServiceStatus, type ServiceItem } from '../../api/services';

const services = ref<ServiceItem[]>([]);
const loading = ref(false);
const creating = ref(false);

const form = reactive({
  name: '',
  durationMinutes: 30,
  points: 0,
});

const loadServices = async () => {
  loading.value = true;
  try {
    services.value = await fetchServices();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load services');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadServices();
});

const handleCreate = async () => {
  if (!form.name || form.durationMinutes <= 0) {
    ElMessage.warning('Name and duration are required');
    return;
  }
  creating.value = true;
  try {
    await createService({
      name: form.name.trim(),
      durationMinutes: form.durationMinutes,
      points: form.points ?? 0,
    });
    form.name = '';
    form.durationMinutes = 30;
    form.points = 0;
    await loadServices();
    ElMessage.success('Service added');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to add service');
  } finally {
    creating.value = false;
  }
};

const toggleActive = async (service: ServiceItem) => {
  try {
    await updateServiceStatus(service.id, !service.isActive);
    await loadServices();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update service');
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Services</h1>
      <p class="mt-1 text-sm text-slate-600">Manage services offered to customers.</p>
    </div>

    <ElCard class="bg-white">
      <div class="mb-4 text-base font-semibold text-slate-900">Add Service</div>
      <ElForm label-position="top" class="grid gap-4 sm:grid-cols-3 sm:items-end">
        <ElFormItem label="Name" class="sm:col-span-1">
          <ElInput v-model="form.name" placeholder="e.g., Gel Manicure" />
        </ElFormItem>
        <ElFormItem label="Duration (minutes)" class="sm:col-span-1">
          <ElInputNumber v-model="form.durationMinutes" :min="1" :step="5" class="w-full" />
        </ElFormItem>
        <ElFormItem label="Points" class="sm:col-span-1">
          <ElInputNumber v-model="form.points" :min="0" :step="1" class="w-full" />
        </ElFormItem>
        <div class="sm:col-span-3 flex justify-end">
          <ElButton type="primary" :loading="creating" @click="handleCreate">Add Service</ElButton>
        </div>
      </ElForm>
    </ElCard>

    <ElCard class="bg-white">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">All Services</div>
      </div>
      <ElTable :data="services" style="width: 100%" :border="false" :stripe="true" height="auto" :loading="loading">
        <ElTableColumn prop="name" label="Name" />
        <ElTableColumn prop="durationMinutes" label="Duration (min)" width="140" />
        <ElTableColumn prop="points" label="Points" width="100" />
        <ElTableColumn label="Active" width="120">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.isActive"
              active-text="Active"
              inactive-text="Inactive"
              @change="() => toggleActive(row)"
            />
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && services.length === 0" class="py-6 text-center text-sm text-slate-500">
        No services yet.
      </div>
    </ElCard>
  </div>
</template>
