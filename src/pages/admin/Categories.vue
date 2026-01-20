<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type ServiceCategory,
} from '../../api/serviceCategories';

const categories = ref<ServiceCategory[]>([]);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const error = ref('');
const form = reactive({
  id: '' as string | null,
  name: '',
  icon: '💅',
  sortOrder: 0,
  active: true,
});

const iconOptions = ['💅', '✂️', '🪮', '💇', '🧖', '💆', '💄', '🧴', '🪒', '⭐', '📋'];

const sortedCategories = computed(() =>
  [...categories.value].sort((a, b) => {
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
  }),
);

const loadCategories = async () => {
  loading.value = true;
  error.value = '';
  try {
    categories.value = await fetchCategories();
  } catch (err: any) {
    error.value = err?.message || 'Failed to load categories';
  } finally {
    loading.value = false;
  }
};

onMounted(loadCategories);

const openModal = (cat?: ServiceCategory) => {
  form.id = cat?.id ?? null;
  form.name = cat?.name ?? '';
  form.icon = (cat?.icon ?? iconOptions[0]) as string;
  form.sortOrder = cat?.sortOrder ?? 0;
  form.active = cat?.active ?? true;
  dialogOpen.value = true;
};

const resetForm = () => {
  form.id = null;
  form.name = '';
  form.icon = iconOptions[0] as string;
  form.sortOrder = 0;
  form.active = true;
};

const saveCategory = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('Name is required');
    return;
  }
  saving.value = true;
  try {
    if (form.id) {
      await updateCategory(form.id, {
        name: form.name.trim(),
        icon: form.icon,
        sortOrder: form.sortOrder,
        active: form.active,
      });
      ElMessage.success('Category updated');
    } else {
      await createCategory({
        name: form.name.trim(),
        icon: form.icon,
        sortOrder: form.sortOrder,
        active: form.active,
      });
      ElMessage.success('Category created');
    }
    dialogOpen.value = false;
    resetForm();
    await loadCategories();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save category');
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (cat: ServiceCategory, val: boolean) => {
  try {
    await updateCategory(cat.id, { active: val });
    await loadCategories();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update');
  }
};

const confirmDelete = async (cat: ServiceCategory) => {
  if (cat.id === 'uncategorized') return;
  if (!window.confirm(`Delete category "${cat.name}"? Services will move to Uncategorized.`)) return;
  try {
    await deleteCategory(cat.id);
    ElMessage.success('Category removed');
    await loadCategories();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to delete');
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Service Categories</h1>
      <p class="mt-1 text-sm text-slate-600">
        Organize services into categories for Admin and Kiosk. Uncategorized is always available.
      </p>
    </div>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      :title="error"
      class="w-full"
    />

    <ElCard class="bg-white">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-base font-semibold text-slate-900">Categories</div>
        <ElButton type="primary" size="small" class="sf-btn sf-btn--table" @click="openModal()">Add Category</ElButton>
      </div>

      <ElTable :data="sortedCategories" :loading="loading" style="width: 100%" border>
        <ElTableColumn label="Icon" width="80">
          <template #default="{ row }">
            <div class="text-xl text-center">{{ row.icon || '📋' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="Name" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-900">{{ row.name }}</span>
              <ElTag v-if="row.id === 'uncategorized'" size="small" type="info" effect="plain">Locked</ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="serviceCount" label="Services" width="120">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">#{{ row.serviceCount ?? 0 }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="sortOrder" label="Order" width="120">
          <template #default="{ row }">
            <span class="text-sm text-slate-800">{{ row.sortOrder ?? 0 }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Active" width="130">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.active"
              :disabled="row.id === 'uncategorized'"
              @change="(val) => toggleActive(row, val as boolean)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElButton size="small" plain class="sf-btn sf-btn--table" @click="openModal(row)" :disabled="row.id === 'uncategorized'">
                Edit
              </ElButton>
              <ElButton
                size="small"
                type="danger"
                plain
                class="sf-btn sf-btn--table"
                :disabled="row.id === 'uncategorized'"
                @click="confirmDelete(row)"
              >
                Delete
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="dialogOpen" :title="form.id ? 'Edit Category' : 'Add Category'" width="480px">
      <ElForm label-position="top" class="space-y-3">
        <ElFormItem label="Name" required>
          <ElInput v-model="form.name" maxlength="50" show-word-limit placeholder="e.g., Nails" />
        </ElFormItem>
        <div class="grid grid-cols-2 gap-3">
          <ElFormItem label="Icon">
            <ElSelect v-model="form.icon" filterable>
              <ElOption v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon">
                <span class="text-lg">{{ icon }}</span>
              </ElOption>
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Sort order">
            <ElInputNumber v-model="form.sortOrder" :min="0" :max="999" :step="1" class="w-full" />
          </ElFormItem>
        </div>
        <ElFormItem label="Active">
          <ElSwitch v-model="form.active" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton class="sf-btn" @click="dialogOpen = false">Cancel</ElButton>
          <ElButton type="primary" class="sf-btn" :loading="saving" @click="saveCategory">
            {{ form.id ? 'Save changes' : 'Create category' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
