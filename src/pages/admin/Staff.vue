<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElTable, ElTableColumn, ElSwitch, ElCard, ElMessage } from 'element-plus';
import { fetchStaff, updateStaffStatus, type StaffMember } from '../../api/staff';

const staff = ref<StaffMember[]>([]);
const loading = ref(false);

const loadStaff = async () => {
  loading.value = true;
  try {
    staff.value = await fetchStaff();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load staff');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStaff();
});

const toggleStatus = async (member: StaffMember) => {
  const nextStatus = member.status === 'active' ? 'inactive' : 'active';
  try {
    await updateStaffStatus(member.id, nextStatus);
    await loadStaff();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update staff');
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Staff</h1>
      <p class="mt-1 text-sm text-slate-600">Enable or disable staff access.</p>
    </div>

    <ElCard class="bg-white">
      <div class="mb-4 text-base font-semibold text-slate-900">Team</div>
      <ElTable :data="staff" style="width: 100%" :loading="loading" :stripe="true">
        <ElTableColumn prop="name" label="Name" />
        <ElTableColumn prop="role" label="Role" width="140" />
        <ElTableColumn label="Active" width="140">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.status === 'active'"
              active-text="Active"
              inactive-text="Inactive"
              @change="() => toggleStatus(row)"
            />
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && staff.length === 0" class="py-6 text-center text-sm text-slate-500">
        No staff members found.
      </div>
    </ElCard>
  </div>
</template>
