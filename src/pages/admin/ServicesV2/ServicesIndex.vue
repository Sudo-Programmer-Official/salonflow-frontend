<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElSwitch,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElCard,
  ElDialog,
} from 'element-plus';
import { useRouter } from 'vue-router';
import {
  fetchV2Categories,
  saveV2Category,
  fetchV2CategoryWithServices,
  saveV2Service,
  type V2Category,
  type V2Service,
} from '../../../api/servicesV2';

const router = useRouter();
const loading = ref(false);
const categories = ref<V2Category[]>([]);
const selectedCategoryId = ref<string | null>(null);
const services = ref<V2Service[]>([]);
const categoryDialog = ref(false);
const serviceDialog = ref(false);
const saving = ref(false);
const serviceSaving = ref(false);
const editCategory = ref<Partial<V2Category>>({});
const editService = ref<Partial<V2Service> & { categoryId?: string }>({});

const selectedCategory = computed(() => categories.value.find((c) => c.id === selectedCategoryId.value) || null);

const loadCategories = async () => {
  loading.value = true;
  try {
    categories.value = await fetchV2Categories();
    if (categories.value.length && categories.value[0] && !selectedCategoryId.value) {
      await selectCategory(categories.value[0].id);
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load categories');
  } finally {
    loading.value = false;
  }
};

const selectCategory = async (id: string) => {
  selectedCategoryId.value = id;
  services.value = [];
  try {
    const data = await fetchV2CategoryWithServices(id);
    services.value = data.services;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load services');
  }
};

onMounted(loadCategories);

const openCategory = (cat?: V2Category) => {
  editCategory.value = cat
    ? { ...cat }
    : {
        name: '',
        slug: '',
        heroImage: '',
        shortDescription: '',
        highlights: [],
        featured: false,
        featuredOrder: 0,
        published: true,
        sortOrder: categories.value.length,
      };
  categoryDialog.value = true;
};

const saveCategory = async () => {
  saving.value = true;
  try {
    const payload = { ...editCategory.value };
    const saved = await saveV2Category(editCategory.value.id || null, payload as any);
    ElMessage.success('Saved');
    categoryDialog.value = false;
    await loadCategories();
    if (saved.id) {
      await selectCategory(saved.id);
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save');
  } finally {
    saving.value = false;
  }
};

const openService = (svc?: V2Service) => {
  if (!selectedCategory.value) {
    ElMessage.warning('Select a category first');
    return;
  }
  editService.value = svc
    ? { ...svc, categoryId: selectedCategory.value.id }
    : {
        categoryId: selectedCategory.value.id,
        name: '',
        slug: '',
        shortSummary: '',
        fullDescription: '',
        whatIncluded: [],
        addons: [],
        durationMinutes: 30,
        priceCents: 0,
        currency: 'USD',
        order: services.value.length,
        published: true,
        featured: false,
        featuredOrder: 0,
      };
  serviceDialog.value = true;
};

const saveService = async () => {
  if (!editService.value.categoryId) {
    ElMessage.error('Category required');
    return;
  }
  serviceSaving.value = true;
  try {
    await saveV2Service(editService.value.id || null, editService.value as any);
    ElMessage.success('Saved');
    serviceDialog.value = false;
    await selectCategory(editService.value.categoryId);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save service');
  } finally {
    serviceSaving.value = false;
  }
};

</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Services (v2)</h1>
        <p class="text-sm text-slate-600">Single source of truth for categories and services.</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" @click="openCategory()">Add category</ElButton>
        <ElButton :disabled="!selectedCategory" @click="openService()">Add service</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <div class="text-sm font-semibold mb-2">Categories</div>
      <ElTable :data="categories" height="320" row-key="id" @row-click="(row:any)=>selectCategory(row.id)">
        <ElTableColumn prop="name" label="Name" min-width="160" />
        <ElTableColumn prop="slug" label="Slug" min-width="120" />
        <ElTableColumn label="Featured" width="120">
          <template #default="{ row }">
            <ElSwitch v-model="row.featured" @change="saveV2Category(row.id, row as any).then(loadCategories)" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Published" width="120">
          <template #default="{ row }">
            <ElSwitch v-model="row.published" @change="saveV2Category(row.id, row as any).then(loadCategories)" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="servicesCount" label="# Services" width="120" />
        <ElTableColumn label="Actions" width="160">
          <template #default="{ row }">
            <div class="flex gap-2">
              <ElButton size="small" @click.stop="openCategory(row)">Edit</ElButton>
              <ElButton size="small" @click.stop="selectCategory(row.id)">View services</ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElCard v-if="selectedCategory" shadow="never" class="border border-slate-200">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold">Services — {{ selectedCategory?.name }}</div>
        <ElButton size="small" @click="openService()">Add service</ElButton>
      </div>
      <ElTable :data="services" row-key="id">
        <ElTableColumn prop="name" label="Name" min-width="160" />
        <ElTableColumn prop="slug" label="Slug" min-width="120" />
        <ElTableColumn label="Price" width="120">
          <template #default="{ row }">${{ (row.priceCents / 100).toFixed(2) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="durationMinutes" label="Duration" width="110" />
        <ElTableColumn label="Featured" width="110">
          <template #default="{ row }">
            <ElSwitch v-model="row.featured" @change="saveV2Service(row.id, { ...row, categoryId: row.categoryId } as any).then(()=>selectCategory(row.categoryId))" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Published" width="110">
          <template #default="{ row }">
            <ElSwitch v-model="row.published" @change="saveV2Service(row.id, { ...row, categoryId: row.categoryId } as any).then(()=>selectCategory(row.categoryId))" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="160">
          <template #default="{ row }">
            <div class="flex gap-2">
              <ElButton size="small" @click.stop="openService(row)">Edit</ElButton>
              <ElButton size="small" @click.stop="router.push(`/services/${selectedCategory?.slug || row.categoryId}/${row.slug}`)">Preview</ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- Category dialog -->
    <ElDialog v-model="categoryDialog" title="Category" width="520px">
      <div class="space-y-3">
        <ElInput v-model="editCategory.name" placeholder="Name" />
        <ElInput v-model="editCategory.slug" placeholder="Slug (optional)" />
        <ElInput v-model="editCategory.shortDescription" type="textarea" :rows="2" placeholder="Short description" />
        <ElInput v-model="(editCategory.highlights as any)" placeholder="Highlights (comma separated)" @change="(val:any)=>{ editCategory.highlights = String(val||'').split(',').map((s:string)=>s.trim()).filter(Boolean); }" />
        <div class="flex gap-3">
          <ElInputNumber v-model="editCategory.sortOrder" label="Order" />
          <ElInputNumber v-model="editCategory.featuredOrder" label="Featured order" />
        </div>
        <div class="flex gap-4 items-center">
          <span>Featured</span><ElSwitch v-model="editCategory.featured" />
          <span>Published</span><ElSwitch v-model="editCategory.published" />
        </div>
      </div>
      <template #footer>
        <ElButton @click="categoryDialog=false">Cancel</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveCategory">Save</ElButton>
      </template>
    </ElDialog>

    <!-- Service dialog -->
    <ElDialog v-model="serviceDialog" title="Service" width="600px">
      <div class="space-y-3">
        <ElInput v-model="editService.name" placeholder="Name" />
        <ElInput v-model="editService.slug" placeholder="Slug (optional)" />
        <ElInput v-model="editService.shortSummary" type="textarea" :rows="2" placeholder="Short summary" />
        <ElInput v-model="editService.fullDescription" type="textarea" :rows="4" placeholder="Full description" />
        <div class="grid grid-cols-2 gap-3">
          <ElInputNumber v-model="editService.durationMinutes" label="Minutes" />
          <ElInputNumber v-model="editService.priceCents" :step="500" label="Price (cents)" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <ElInputNumber v-model="editService.order" label="Order" />
          <ElInputNumber v-model="editService.featuredOrder" label="Featured order" />
        </div>
        <div class="flex gap-4 items-center">
          <span>Featured</span><ElSwitch v-model="editService.featured" />
          <span>Published</span><ElSwitch v-model="editService.published" />
        </div>
      </div>
      <template #footer>
        <ElButton @click="serviceDialog=false">Cancel</ElButton>
        <ElButton type="primary" :loading="serviceSaving" @click="saveService">Save</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
