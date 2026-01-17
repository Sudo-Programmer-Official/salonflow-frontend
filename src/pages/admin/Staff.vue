<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { ElTable, ElTableColumn, ElSwitch, ElCard, ElMessage, ElButton, ElDialog, ElForm, ElFormItem, ElInput } from 'element-plus';
import { fetchStaff, updateStaffStatus, createStaff, type StaffMember } from '../../api/staff';

const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const form = reactive({
  name: '',
  nickname: '',
  phoneE164: '',
  active: true,
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
  form.nickname = '';
  form.phoneE164 = '';
  form.active = true;
  dialogOpen.value = true;
};

const submit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('Name is required');
    return;
  }
  saving.value = true;
  try {
    await createStaff({
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
      phoneE164: form.phoneE164.trim() || undefined,
      active: form.active,
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
  const nextActive = !member.active;
  member.active = nextActive;
  try {
    await updateStaffStatus(member.id, nextActive);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update staff');
    member.active = !nextActive; // revert
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
      <ElTable
        :data="staff"
        style="width: 100%"
        :loading="loading"
        :stripe="true"
        class="staff-table"
      >
        <ElTableColumn label="Name" min-width="200" class-name="col-name">
          <template #default="{ row }">
            <span class="text-sm font-semibold text-slate-900">{{ row.name }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Nickname" width="180" class-name="col-nickname">
          <template #default="{ row }">
            <span class="text-sm text-slate-800">{{ row.nickname || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="phoneE164" label="Phone" min-width="180" class-name="col-phone">
          <template #default="{ row }">
            <span class="text-sm text-slate-800 flex items-center gap-1">
              📞
              <span>{{ row.phoneE164 || '—' }}</span>
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Active" width="120" class-name="col-active">
          <template #default="{ row }">
            <div class="toggle-wrapper">
              <ElSwitch
                :model-value="row.active"
                @change="() => toggleStatus(row)"
              />
            </div>
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
        <ElFormItem label="Nickname (optional)">
          <ElInput v-model="form.nickname" placeholder="Display name e.g., Abhi" />
        </ElFormItem>
        <ElFormItem label="Phone (optional)">
          <ElInput v-model="form.phoneE164" placeholder="+1 555 123 4567" />
        </ElFormItem>
        <ElFormItem label="Active">
          <ElSwitch v-model="form.active" />
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

<style scoped>
.staff-table :deep(table) {
  table-layout: fixed;
}
.staff-table :deep(.col-name) {
  width: auto;
}
.staff-table :deep(.col-nickname) {
  width: 180px;
}
.staff-table :deep(.col-active) {
  width: 120px;
  text-align: center;
}
.toggle-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

@media (max-width: 1024px) {
  .staff-table :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }
}
</style>
