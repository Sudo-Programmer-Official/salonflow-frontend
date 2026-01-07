<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import {
  ElTable,
  ElTableColumn,
  ElSwitch,
  ElCard,
  ElMessage,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
} from 'element-plus';
import { fetchStaff, updateStaffStatus, createStaff, type StaffMember } from '../../api/staff';

const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const form = reactive({
  name: '',
  email: '',
  role: 'STAFF',
  status: 'active',
});

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

const openDialog = () => {
  form.name = '';
  form.email = '';
  form.role = 'STAFF';
  form.status = 'active';
  dialogOpen.value = true;
};

const submit = async () => {
  if (!form.name.trim() || !form.email.trim()) {
    ElMessage.warning('Name and email are required');
    return;
  }
  saving.value = true;
  try {
    await createStaff({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status as 'active' | 'inactive',
    });
    dialogOpen.value = false;
    await loadStaff();
    ElMessage.success('Staff added');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to add staff');
  } finally {
    saving.value = false;
  }
};

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
      <p class="mt-1 text-sm text-slate-600">Add team members and enable or disable access.</p>
    </div>

    <ElCard class="bg-white">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Team</div>
        <ElButton type="primary" @click="openDialog">Add Staff</ElButton>
      </div>
      <ElTable :data="staff" style="width: 100%" :loading="loading" :stripe="true">
        <ElTableColumn prop="name" label="Name" />
        <ElTableColumn prop="role" label="Role" width="140" />
        <ElTableColumn prop="email" label="Email" min-width="180" />
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

    <ElDialog v-model="dialogOpen" title="Add Staff" width="420px">
      <ElForm label-position="top" class="space-y-3">
        <ElFormItem label="Name" required>
          <ElInput v-model="form.name" placeholder="Jane Doe" />
        </ElFormItem>
        <ElFormItem label="Email" required>
          <ElInput v-model="form.email" placeholder="jane@example.com" />
        </ElFormItem>
        <ElFormItem label="Role">
          <ElSelect v-model="form.role" disabled>
            <ElOption label="Staff" value="STAFF" />
          </ElSelect>
          <div class="text-xs text-slate-500 mt-1">
            Staff role is supported now. Owners are managed separately.
          </div>
        </ElFormItem>
        <ElFormItem label="Status">
          <ElSelect v-model="form.status">
            <ElOption label="Active" value="active" />
            <ElOption label="Inactive" value="inactive" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="dialogOpen = false">Cancel</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">Save</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
