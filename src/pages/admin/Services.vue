<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  ElTable,
  ElTableColumn,
  ElSwitch,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElCard,
  ElDialog,
  ElTooltip,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElSelect,
  ElOption,
  ElTag,
} from 'element-plus';
import {
  fetchServices,
  createService,
  updateServiceStatus,
  updateService,
  fetchServiceStaffCounts,
  type ServiceItem,
} from '../../api/services';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  type ServiceCategory,
} from '../../api/serviceCategories';
import { fetchSettings, type DefaultBookingRules } from '../../api/settings';

const router = useRouter();
const services = ref<ServiceItem[]>([]);
const loading = ref(false);
const creating = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);

const iconOptions = ['💅', '✂️', '🪮', '💇', '🧖', '💆', '💄', '🪒', '🧴'];
const categoryIconOptions = ['📋', '💅', '🧖', '🧴', '💄', '✂️', '🪮', '🪒'];
const selectedCategoryFilter = ref<string | null | ''>('');
const staffCounts = ref<Record<string, number>>({});
const settingsDefaults = ref<DefaultBookingRules | null>(null);

const form = reactive({
  name: '',
  durationMinutes: 30,
  points: 0,
  icon: iconOptions[3],
  isActive: true,
  price: 0,
  categoryId: 'uncategorized' as string | null | '',
  requiresStaff: false,
  allowWalkin: true,
  bufferBefore: 0,
  bufferAfter: 0,
  minNotice: 0,
});

const categories = ref<ServiceCategory[]>([]);
const categoryDialogOpen = ref(false);
const categoryForm = reactive({
  id: '' as string | null,
  name: '',
  icon: categoryIconOptions[0],
  sortOrder: 0,
  active: true,
});

const resetForm = () => {
  form.name = '';
  form.durationMinutes = 30;
  form.points = 0;
  form.icon = iconOptions[3];
  form.isActive = true;
  form.price = 0;
  form.categoryId = 'uncategorized';
  form.requiresStaff = false;
  form.allowWalkin = true;
  form.bufferBefore = 0;
  form.bufferAfter = 0;
  form.minNotice = 0;
  editingId.value = null;

  if (settingsDefaults.value) {
    form.bufferBefore = settingsDefaults.value.buffer_before ?? 0;
    form.bufferAfter = settingsDefaults.value.buffer_after ?? 0;
    form.minNotice = settingsDefaults.value.min_notice_minutes ?? 0;
    form.allowWalkin = settingsDefaults.value.allow_walkins_outside_availability !== false;
  }
};

const applyServiceUpdate = (updated: ServiceItem) => {
  const idx = services.value.findIndex((s) => s.id === updated.id);
  if (idx >= 0) {
    services.value[idx] = updated;
  } else {
    services.value = [updated, ...services.value];
  }
};

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

const loadStaffCounts = async () => {
  try {
    staffCounts.value = await fetchServiceStaffCounts();
  } catch {
    staffCounts.value = {};
  }
};

const loadSettingsDefaults = async () => {
  try {
    const s = await fetchSettings();
    settingsDefaults.value = s.defaultBookingRules;
    if (!editingId.value) {
      resetForm();
    }
  } catch {
    settingsDefaults.value = null;
  }
};

onMounted(() => {
  loadCategories();
  loadServices();
  loadStaffCounts();
  loadSettingsDefaults();
});

const handleCreate = async () => {
  if (!form.name || form.durationMinutes <= 0) {
    ElMessage.warning('Name and duration are required');
    return;
  }
  if (!form.categoryId) {
    ElMessage.warning('Select a category');
    return;
  }
  creating.value = true;
  try {
    const bookingRules = {
      requires_staff: !!form.requiresStaff,
      allow_walkin: !!form.allowWalkin,
      buffer_before: Math.max(0, form.bufferBefore || 0),
      buffer_after: Math.max(0, form.bufferAfter || 0),
      min_notice_minutes: Math.max(0, form.minNotice || 0),
    };
    const categoryIdToSend = form.categoryId === 'uncategorized' ? null : form.categoryId || null;
    const created = await createService({
      name: form.name.trim(),
      durationMinutes: form.durationMinutes,
      points: form.points ?? 0,
      icon: form.icon,
      categoryId: categoryIdToSend,
      priceCents: Math.max(0, Math.round((form.price ?? 0) * 100)),
      bookingRules,
    });
    services.value = [created, ...services.value];
    resetForm();
    dialogVisible.value = false;
    ElMessage.success('Service added');
    await loadStaffCounts();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to add service');
  } finally {
    creating.value = false;
  }
};

const openCreate = () => {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (service: ServiceItem) => {
  editingId.value = service.id;
  dialogMode.value = 'edit';
  form.name = service.name;
  form.durationMinutes = service.durationMinutes;
  form.points = service.points;
  form.icon = service.icon || iconOptions[3];
  form.isActive = service.isActive;
  form.price = service.priceCents ? service.priceCents / 100 : 0;
  form.categoryId = service.categoryId || 'uncategorized';
  const rules = service.bookingRules || {};
  form.requiresStaff = !!rules.requires_staff;
  form.allowWalkin = rules.allow_walkin !== false;
  form.bufferBefore = Number.isFinite(rules.buffer_before) ? rules.buffer_before : 0;
  form.bufferAfter = Number.isFinite(rules.buffer_after) ? rules.buffer_after : 0;
  form.minNotice = Number.isFinite(rules.min_notice_minutes) ? rules.min_notice_minutes : 0;
  dialogVisible.value = true;
};

const handleSaveEdit = async () => {
  if (!editingId.value) return;
  if (!form.name || form.durationMinutes <= 0) {
    ElMessage.warning('Name and duration are required');
    return;
  }
  if (!form.categoryId) {
    ElMessage.warning('Select a category');
    return;
  }
  saving.value = true;
  try {
    const bookingRules = {
      requires_staff: !!form.requiresStaff,
      allow_walkin: !!form.allowWalkin,
      buffer_before: Math.max(0, form.bufferBefore || 0),
      buffer_after: Math.max(0, form.bufferAfter || 0),
      min_notice_minutes: Math.max(0, form.minNotice || 0),
    };
    const categoryIdToSend = form.categoryId === 'uncategorized' ? null : form.categoryId || null;
    const updated = await updateService(editingId.value, {
      name: form.name.trim(),
      durationMinutes: form.durationMinutes,
      points: form.points ?? 0,
      icon: form.icon,
      isActive: form.isActive,
      categoryId: categoryIdToSend,
      priceCents: Math.max(0, Math.round((form.price ?? 0) * 100)),
      bookingRules,
    });
    applyServiceUpdate(updated);
    ElMessage.success('Service updated');
    dialogVisible.value = false;
    await loadStaffCounts();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update service');
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (service: ServiceItem) => {
  const next = !service.isActive;
  const original = service.isActive;
  service.isActive = next;
  try {
    const updated = await updateServiceStatus(service.id, next);
    applyServiceUpdate(updated);
    await loadStaffCounts();
  } catch (err) {
    service.isActive = original;
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update service');
  }
};

const rowClass = ({ row }: { row: ServiceItem }) => (!row.isActive ? 'inactive-row' : '');

const handleRowClick = (row: ServiceItem, _: any, event: MouseEvent) => {
  const target = event?.target as HTMLElement;
  if (target?.closest('.no-row-click')) return;
  openEdit(row);
};

const categoryLabel = (id?: string | null) => {
  if (!id) return 'Uncategorized';
  const cat = categories.value.find((c) => c.id === id);
  return cat ? `${cat.icon || '📋'} ${cat.name}` : 'Uncategorized';
};

const sortedCategories = computed(() =>
  [...categories.value].sort((a, b) => {
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
  }),
);

const categoryOptions = computed(() => {
  const active = sortedCategories.value.filter((c) => c.id !== 'uncategorized' && c.active);
  const unc = categories.value.find((c) => c.id === 'uncategorized');
  return unc ? [...active, unc] : active;
});


const filteredServices = computed(() => {
  const filter = selectedCategoryFilter.value;
  if (!filter) return services.value;
  if (filter === '__uncategorized__') return services.value.filter((s) => !s.categoryId);
  return services.value.filter((s) => s.categoryId === filter);
});

const loadCategories = async () => {
  try {
    categories.value = await fetchCategories();
    if (!form.categoryId) {
      form.categoryId = 'uncategorized';
    }
  } catch (err) {
    categories.value = [];
  }
};

const openCategoryDialog = (cat?: ServiceCategory) => {
  categoryForm.id = cat?.id ?? null;
  categoryForm.name = cat?.name ?? '';
  categoryForm.icon = cat?.icon ?? categoryIconOptions[0];
  categoryForm.sortOrder = cat?.sortOrder ?? 0;
  categoryForm.active = cat?.active ?? true;
  categoryDialogOpen.value = true;
};

const saveCategory = async () => {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('Category name is required');
    return;
  }
  try {
    if (categoryForm.id) {
      await updateCategory(categoryForm.id, {
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
        sortOrder: categoryForm.sortOrder,
        active: categoryForm.active,
      });
      ElMessage.success('Category updated');
    } else {
      await createCategory({
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
        sortOrder: categoryForm.sortOrder,
        active: categoryForm.active,
      });
      ElMessage.success('Category created');
    }
    categoryDialogOpen.value = false;
    await loadCategories();
    await loadServices();
    await loadStaffCounts();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to save category');
  }
};

const goToCategories = () => {
  router.push({ name: 'admin-categories' });
};

const handleCategorySelect = (val: string | null) => {
  if (val === '__add__') {
    form.categoryId = 'uncategorized';
    openCategoryDialog();
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
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="text-base font-semibold text-slate-900">All Services</div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <ElButton type="primary" size="small" class="sf-btn sf-btn--table sf-btn--icon" @click="openCreate">
            <span aria-hidden="true">+</span>
            <span>Add service</span>
          </ElButton>
          <ElSelect
            v-model="selectedCategoryFilter"
            placeholder="Filter by category"
            clearable
            size="small"
            style="width: 220px"
          >
            <ElOption label="All categories" :value="''" />
            <ElOption v-for="cat in categoryOptions" :key="cat.id" :label="`${cat.icon} ${cat.name}`" :value="cat.id" />
            <ElOption label="Uncategorized" value="__uncategorized__" />
          </ElSelect>
          <ElButton size="small" plain class="sf-btn sf-btn--table" @click="goToCategories()">Manage Categories</ElButton>
        </div>
      </div>

      <ElTable
        :data="filteredServices"
        style="width: 100%"
        :border="false"
        :stripe="true"
        height="auto"
        :loading="loading"
        :row-class-name="rowClass"
        @row-click="handleRowClick"
      >
        <ElTableColumn label="Category" min-width="160">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ categoryLabel(row.categoryId) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="" width="70">
          <template #default="{ row }">
            <div class="flex items-center justify-center text-xl">{{ row.icon || '💇' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="Name" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <div class="font-semibold text-slate-900">{{ row.name }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="durationMinutes" label="Duration" width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-1 text-slate-800">
              <span>⏱️</span><span>{{ row.durationMinutes }} min</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="priceCents" label="Price" width="140">
          <template #default="{ row }">
            <div class="text-slate-800 font-semibold">
              {{ row.priceCents ? `$${(row.priceCents / 100).toFixed(2)}` : '$0.00' }}
            </div>
          </template>
        </ElTableColumn>
      <ElTableColumn prop="points" label="Points" width="120">
        <template #default="{ row }">
          <div class="flex items-center gap-1 text-slate-800">
            <span>⭐</span><span>{{ row.points }}</span>
          </div>
        </template>
      </ElTableColumn>
        <ElTableColumn label="Staff" width="110">
          <template #default="{ row }">
            <ElTag size="small" effect="plain" type="info">👥 {{ staffCounts[row.id] ?? 0 }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Active" width="120">
          <template #default="{ row }">
            <div class="flex items-center gap-2 no-row-click">
              <ElTooltip
                content="Toggle availability"
                placement="top"
              >
                <ElSwitch
                  :model-value="row.isActive"
                  @change="() => toggleActive(row)"
                />
              </ElTooltip>
              <ElDropdown trigger="click" class="no-row-click">
                <ElButton text size="small" class="sf-btn sf-btn--table">⋮</ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem @click.prevent="openEdit(row)">Edit</ElDropdownItem>
                    <ElDropdownItem disabled>More actions soon</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && services.length === 0" class="py-6 text-center text-sm text-slate-500">
        No services yet. Add your first service to start booking.
      </div>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? 'Add service' : 'Edit service'"
      width="min(640px, calc(100vw - 24px))"
      top="4vh"
      class="service-dialog"
      destroy-on-close
    >
      <ElForm label-position="top" class="grid gap-x-4 gap-y-2 text-sm service-form sm:grid-cols-2">
        <ElFormItem label="Service name" required class="sm:col-span-2">
          <ElInput v-model="form.name" placeholder="e.g., Gel Manicure" size="large" autofocus />
        </ElFormItem>
        <ElFormItem label="Category" required class="sm:col-span-2">
          <ElSelect
            v-model="form.categoryId"
            placeholder="Choose a category"
            filterable
            size="large"
            class="w-full"
            @change="(val) => handleCategorySelect(val as string)"
          >
            <ElOption
              v-for="cat in categoryOptions"
              :key="cat.id"
              :label="`${cat.icon} ${cat.name}`"
              :value="cat.id"
            />
            <ElOption label="+ Add category" value="__add__" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Icon">
          <ElSelect v-model="form.icon" placeholder="Choose an icon" size="large" class="w-full">
            <ElOption v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon">
              <span class="text-lg">{{ icon }}</span>
            </ElOption>
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Duration (minutes)" required>
          <ElInputNumber v-model="form.durationMinutes" :min="1" :step="5" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem label="Price ($)">
          <ElInputNumber v-model="form.price" :min="0" :step="1" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem label="Loyalty points">
          <ElInputNumber v-model="form.points" :min="0" :step="1" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem label="Requires staff">
          <ElSwitch v-model="form.requiresStaff" />
        </ElFormItem>
        <ElFormItem label="Allow walk-ins">
          <ElSwitch v-model="form.allowWalkin" />
        </ElFormItem>
        <ElFormItem label="Buffer before (minutes)">
          <ElInputNumber v-model="form.bufferBefore" :min="0" :max="240" :step="5" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem label="Buffer after (minutes)">
          <ElInputNumber v-model="form.bufferAfter" :min="0" :max="240" :step="5" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem label="Minimum notice (minutes)">
          <ElInputNumber v-model="form.minNotice" :min="0" :max="10080" :step="30" class="w-full" size="large" />
        </ElFormItem>
        <ElFormItem v-if="dialogMode === 'edit'" label="Active">
          <ElSwitch v-model="form.isActive" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ElButton class="sf-btn" @click="dialogVisible = false">Cancel</ElButton>
          <ElButton
            type="primary"
            class="sf-btn"
            :loading="dialogMode === 'create' ? creating : saving"
            @click="dialogMode === 'create' ? handleCreate() : handleSaveEdit()"
          >
            {{ dialogMode === 'create' ? 'Add service' : 'Save changes' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="categoryDialogOpen" :title="categoryForm.id ? 'Edit Category' : 'Add Category'" width="420px">
      <div class="space-y-3">
        <ElForm label-position="top" class="space-y-3 text-sm service-form">
          <ElFormItem label="Name" required>
            <ElInput v-model="categoryForm.name" placeholder="e.g., Nails" size="small" />
          </ElFormItem>
          <ElFormItem label="Icon">
            <ElSelect v-model="categoryForm.icon" placeholder="Select icon" size="small">
              <ElOption v-for="icon in categoryIconOptions" :key="icon" :label="icon" :value="icon">
                <span class="text-lg">{{ icon }}</span>
              </ElOption>
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Sort order">
            <ElInputNumber v-model="categoryForm.sortOrder" :step="1" class="w-full" size="small" />
          </ElFormItem>
          <ElFormItem label="Active">
            <ElSwitch v-model="categoryForm.active" />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton class="sf-btn" @click="categoryDialogOpen = false">Cancel</ElButton>
          <ElButton type="primary" class="sf-btn" @click="saveCategory">Save</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.inactive-row {
  opacity: 0.6;
}
.service-form :deep(.el-form-item__label) {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}
.service-form :deep(.el-input__wrapper),
.service-form :deep(.el-select__wrapper),
.service-form :deep(.el-input-number__wrapper) {
  padding: 12px 14px;
  min-height: 44px;
  font-size: 1rem;
}
.service-form :deep(.el-input__inner) {
  font-size: 1rem;
}
.service-form :deep(.el-switch__core) {
  height: 22px;
}

:global(.service-dialog.el-dialog) {
  max-width: calc(100vw - 24px);
  margin: 12px auto;
  border-radius: 18px;
  overflow: hidden;
}

:global(.service-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px 12px;
  border-bottom: 1px solid #eef2f7;
}

:global(.service-dialog .el-dialog__body) {
  max-height: calc(100vh - 190px);
  overflow-y: auto;
  padding: 18px 24px 8px;
}

:global(.service-dialog .el-dialog__footer) {
  padding: 12px 24px 20px;
  border-top: 1px solid #eef2f7;
}

@media (max-width: 640px) {
  :global(.service-dialog.el-dialog) {
    max-width: calc(100vw - 16px);
    margin: 8px auto;
  }

  :global(.service-dialog .el-dialog__header) {
    padding: 16px 16px 10px;
  }

  :global(.service-dialog .el-dialog__body) {
    max-height: calc(100vh - 150px);
    padding: 14px 16px 4px;
  }

  :global(.service-dialog .el-dialog__footer) {
    padding: 10px 16px 16px;
  }

  :global(.service-dialog .el-dialog__footer .el-button) {
    width: 100%;
    min-height: 44px;
  }
}
</style>
