<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue';
import { ElTable, ElTableColumn, ElSwitch, ElCard, ElMessage, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElTabs, ElTabPane, ElTimeSelect } from 'element-plus';
import { fetchStaff, updateStaffStatus, createStaff, fetchStaffServices, assignStaffServices, fetchAvailability, saveAvailability, type StaffMember, type AvailabilityEntry } from '../../api/staff';
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchCategories, type ServiceCategory } from '../../api/serviceCategories';

function createEmptyAvailability(): Record<number, AvailabilityEntry[]> {
  return {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
}

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const staff = ref<StaffMember[]>([]);
const totalStaff = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const servicesLoading = ref(false);
const assignmentsSaving = ref(false);
const services = ref<ServiceItem[]>([]);
const selectedStaffId = ref<string | null>(null);
const staffServices = ref<string[]>([]);
const categories = ref<ServiceCategory[]>([]);
const dialogTab = ref<'services' | 'availability'>('services');
const availability = ref<Record<number, AvailabilityEntry[]>>(createEmptyAvailability());
const availabilityLoading = ref(false);
const availabilitySaving = ref(false);
const form = reactive({
  name: '',
  nickname: '',
  phoneE164: '',
  active: true,
});

const loadStaff = async () => {
  loading.value = true;
  try {
    const res = await fetchStaff(page.value, pageSize.value);
    staff.value = res.items;
    totalStaff.value = res.total ?? res.items.length;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load staff');
    staff.value = [];
    totalStaff.value = 0;
  } finally {
    loading.value = false;
  }
};

const loadServices = async () => {
  servicesLoading.value = true;
  try {
    services.value = await fetchServices();
  } catch (err) {
    services.value = [];
  } finally {
    servicesLoading.value = false;
  }
};

onMounted(() => {
  loadStaff();
  loadServices();
  loadCategories();
});

const changePage = (val: number) => {
  page.value = val;
  loadStaff();
};

const openDialog = () => {
  form.name = '';
  form.nickname = '';
  form.phoneE164 = '';
  form.active = true;
  selectedStaffId.value = null;
  staffServices.value = [];
  dialogTab.value = 'services';
  resetAvailability();
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

const staffInitial = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();

const resetAvailability = () => {
  availability.value = createEmptyAvailability();
};

const loadAvailabilityForStaff = async (staffId: string) => {
  availabilityLoading.value = true;
  resetAvailability();
  try {
    const entries = await fetchAvailability(staffId);
    const grouped = createEmptyAvailability();
    entries.forEach((entry) => {
      const day = entry.dayOfWeek;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({ ...entry });
    });
    availability.value = grouped;
  } catch (err) {
    availability.value = createEmptyAvailability();
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load availability');
  } finally {
    availabilityLoading.value = false;
  }
};

const openAssignments = async (member: StaffMember) => {
  selectedStaffId.value = member.id;
  assignmentsSaving.value = false;
  dialogTab.value = 'services';
  try {
    staffServices.value = await fetchStaffServices(member.id);
  } catch (err) {
    staffServices.value = [];
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load assignments');
  }
  await loadAvailabilityForStaff(member.id);
  dialogOpen.value = true;
};

const categoryGroups = computed(() => {
  const groups: Record<string, { label: string; items: ServiceItem[] }> = {};
  services.value.forEach((svc) => {
    const key = svc.categoryId || 'uncategorized';
    if (!groups[key]) {
      const catLabel = svc.categoryId
        ? `${categories.value.find((c) => c.id === svc.categoryId)?.name || 'Category'}`
        : 'Other';
      groups[key] = { label: catLabel, items: [] };
    }
    groups[key].items.push(svc);
  });
  return Object.values(groups);
});

const loadCategories = async () => {
  try {
    categories.value = await fetchCategories();
  } catch {
    categories.value = [];
  }
};

const saveAssignments = async () => {
  if (!selectedStaffId.value) return;
  assignmentsSaving.value = true;
  try {
    await assignStaffServices(selectedStaffId.value, staffServices.value);
    ElMessage.success('Services updated');
    dialogOpen.value = false;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update services');
  } finally {
    assignmentsSaving.value = false;
  }
};

const addAvailabilityBlock = (day: number) => {
  if (!availability.value[day]) availability.value[day] = [];
  availability.value[day].push({
    id: `${day}-${Date.now()}-${Math.random()}`,
    dayOfWeek: day,
    startLocalTime: '09:00',
    endLocalTime: '17:00',
    active: true,
    sortOrder: availability.value[day].length,
  } as AvailabilityEntry);
};

const removeAvailabilityBlock = (day: number, index: number) => {
  if (!availability.value[day]) return;
  availability.value[day].splice(index, 1);
};

const saveAvailabilityChanges = async () => {
  if (!selectedStaffId.value) return;
  const entries: Omit<AvailabilityEntry, 'id'>[] = [];
  let hasError = false;
  for (let day = 0; day <= 6; day += 1) {
    const blocks = availability.value[day] || [];
    blocks.forEach((block, idx) => {
      if (!block.startLocalTime || !block.endLocalTime) return;
      if (block.endLocalTime <= block.startLocalTime) {
        hasError = true;
        ElMessage.error(`End time must be after start for ${dayLabels[day]}`);
        return;
      }
      entries.push({
        dayOfWeek: day,
        startLocalTime: block.startLocalTime,
        endLocalTime: block.endLocalTime,
        active: block.active ?? true,
        sortOrder: idx,
      });
    });
  }
  if (hasError) return;
  availabilitySaving.value = true;
  try {
    await saveAvailability(selectedStaffId.value, entries);
    ElMessage.success('Availability saved');
    await loadAvailabilityForStaff(selectedStaffId.value);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to save availability');
  } finally {
    availabilitySaving.value = false;
  }
};
</script>

<template>
  <div class="staff-page flex h-full flex-col space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Staff</h1>
      <p class="mt-1 text-sm text-slate-600">Add team members and enable or disable access.</p>
    </div>

    <ElCard class="bg-white flex-1 flex flex-col">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Team</div>
        <ElButton type="primary" class="action-accent" @click="openDialog">Add Staff</ElButton>
      </div>
      <div class="flex-1 overflow-auto">
        <ElTable
          :data="staff"
          style="width: 100%"
          :loading="loading"
          :stripe="true"
          class="staff-table"
        >
          <ElTableColumn label="Name" min-width="200" class-name="col-name">
            <template #default="{ row }">
              <div class="flex items-center gap-3">
                <div class="name-avatar" aria-hidden="true">
                  {{ staffInitial(row.name) }}
                </div>
                <span class="text-sm font-semibold text-slate-900">{{ row.name }}</span>
              </div>
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
          <ElTableColumn label="Services" width="150">
            <template #default="{ row }">
              <ElButton size="small" class="action-accent" @click="openAssignments(row)">Assign</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-if="!loading && staff.length === 0" class="py-6 text-center text-sm text-slate-500">
          No staff members found.
        </div>
      </div>
      <div class="pagination-bar" v-if="!loading && totalStaff > pageSize">
        <el-pagination
          background
          layout="prev, pager, next"
          :page-size="pageSize"
          :total="totalStaff"
          :current-page="page"
          @current-change="changePage"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialogOpen" :title="selectedStaffId ? 'Staff settings' : 'Add Staff'" width="760px">
      <div v-if="selectedStaffId" class="space-y-3">
        <ElTabs v-model="dialogTab" type="border-card">
          <ElTabPane label="Services" name="services">
            <div class="text-sm text-slate-700 mb-2">Select services this staff member can perform.</div>
            <div class="space-y-3 max-h-80 overflow-y-auto">
              <div v-for="(group, idx) in categoryGroups" :key="idx" class="space-y-2">
                <div class="text-xs font-semibold text-slate-700">{{ group.label }}</div>
                <ElSelect
                  v-model="staffServices"
                  multiple
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="Select services"
                  class="w-full"
                  :loading="servicesLoading"
                >
                  <ElOption
                    v-for="svc in group.items"
                    :key="svc.id"
                    :label="`${svc.name} — $${svc.priceCents ? (svc.priceCents / 100).toFixed(2) : '0.00'}`"
                    :value="svc.id"
                  />
                </ElSelect>
              </div>
            </div>
          </ElTabPane>
          <ElTabPane label="Availability" name="availability">
            <div class="text-sm text-slate-700 mb-3">
              Weekly availability in business local time. Add one or more windows per day.
            </div>
            <div v-if="availabilityLoading" class="py-4 text-center text-slate-500 text-sm">
              Loading availability...
            </div>
            <div v-else class="space-y-3 max-h-96 overflow-y-auto">
              <div v-for="day in 7" :key="day" class="rounded border border-slate-200 p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm font-semibold text-slate-800">{{ dayLabels[day - 1] }}</div>
                  <ElButton size="small" type="primary" plain @click="addAvailabilityBlock(day - 1)">Add window</ElButton>
                </div>
                <div v-if="(availability[day - 1] || []).length === 0" class="text-xs text-slate-500">
                  No availability set.
                </div>
                <div v-for="(block, idx) in availability[day - 1]" :key="`${day}-${idx}`" class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 mb-2">
                  <div class="flex items-center gap-2 flex-1">
                    <ElTimeSelect
                      v-model="block.startLocalTime"
                      placeholder="Start"
                      start="06:00"
                      end="23:45"
                      step="00:15"
                      class="w-full"
                    />
                    <ElTimeSelect
                      v-model="block.endLocalTime"
                      placeholder="End"
                      start="06:00"
                      end="23:59"
                      step="00:15"
                      class="w-full"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-600">Active</span>
                    <ElSwitch v-model="block.active" />
                    <ElButton text type="danger" size="small" @click="removeAvailabilityBlock(day - 1, idx)">Remove</ElButton>
                  </div>
                </div>
              </div>
            </div>
          </ElTabPane>
        </ElTabs>
      </div>
      <div v-else>
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
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="dialogOpen = false">Cancel</ElButton>
          <ElButton
            v-if="selectedStaffId"
            type="primary"
            :loading="dialogTab === 'services' ? assignmentsSaving : availabilitySaving"
            @click="dialogTab === 'services' ? saveAssignments() : saveAvailabilityChanges()"
          >
            {{ dialogTab === 'services' ? 'Save services' : 'Save availability' }}
          </ElButton>
          <ElButton
            v-else
            type="primary"
            :loading="saving"
            @click="submit"
          >
            Save
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.staff-table :deep(table) {
  table-layout: fixed;
}
.staff-page {
  font-size: var(--font-md);
}
.staff-page :deep(.el-table) {
  font-size: 1rem;
}
.staff-page :deep(.el-input__wrapper),
.staff-page :deep(.el-select__wrapper) {
  padding: 12px 14px;
  min-height: 44px;
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
.name-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #2563eb, #38bdf8);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.18);
}

@media (max-width: 1024px) {
  .staff-table :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }
}
</style>
