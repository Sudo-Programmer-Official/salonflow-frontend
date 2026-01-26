<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  ElTable,
  ElTableColumn,
  ElInput,
  ElSwitch,
  ElButton,
  ElSelect,
  ElOption,
  ElMessage,
} from 'element-plus';
import { fetchWebsiteNav, saveWebsiteNav, type WebsiteNavItem } from '../../../api/website';

const locale = ref<'en' | 'es'>('en');
const loading = ref(false);
const saving = ref(false);
const items = ref<WebsiteNavItem[]>([]);

const load = async () => {
  loading.value = true;
  try {
    items.value = await fetchWebsiteNav(locale.value);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load navigation');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const addItem = () => {
  const prefix = locale.value === 'es' ? '/es' : '';
  items.value.push({
    label: 'New link',
    path: `${prefix}/`,
    visible: true,
    position: items.value.length,
    locale: locale.value,
  });
};

const move = (idx: number, direction: number) => {
  const next = idx + direction;
  if (next < 0 || next >= items.value.length) return;
  const copy = [...items.value];
  if (!copy[idx] || !copy[next]) return;
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  items.value = copy.map((item, i) => ({ ...item, position: i }));
};

const remove = (idx: number) => {
  const copy = [...items.value];
  copy.splice(idx, 1);
  items.value = copy.map((item, i) => ({ ...item, position: i }));
};

const save = async () => {
  saving.value = true;
  try {
    const payload = items.value.map((item, idx) => ({
      label: item.label?.trim() || `Link ${idx + 1}`,
      path: item.path?.trim() || '/',
      visible: item.visible !== false,
      position: idx,
      locale: locale.value,
    }));
    items.value = await saveWebsiteNav(locale.value, payload);
    ElMessage.success('Navigation saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save navigation');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-xs text-slate-500 flex items-center gap-2">
          <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
          <span>/</span>
          <span>Navigation</span>
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">Navigation</h1>
        <p class="text-sm text-slate-600">Control header links, order, and visibility for each locale.</p>
      </div>
      <div class="flex items-center gap-2">
        <ElSelect v-model="locale" size="small" @change="load">
          <ElOption label="EN" value="en" />
          <ElOption label="ES" value="es" />
        </ElSelect>
        <ElButton type="primary" plain @click="addItem">Add link</ElButton>
      </div>
    </div>

    <ElTable :data="items" :loading="loading" style="width: 100%">
      <ElTableColumn label="#" width="60">
        <template #default="{ $index }">
          <div class="flex gap-1">
            <ElButton size="small" circle plain @click="move($index, -1)" :disabled="$index === 0">↑</ElButton>
            <ElButton size="small" circle plain @click="move($index, 1)" :disabled="$index === items.length - 1">↓</ElButton>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Label" min-width="180">
        <template #default="{ row }">
          <ElInput v-model="row.label" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Path" min-width="220">
        <template #default="{ row }">
          <ElInput v-model="row.path" placeholder="/services" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Visible" width="120" align="center">
        <template #default="{ row }">
          <ElSwitch v-model="row.visible" />
        </template>
      </ElTableColumn>
      <ElTableColumn width="120" label="Remove">
        <template #default="{ $index }">
          <ElButton size="small" type="danger" plain @click="remove($index)" :disabled="items.length <= 1">Remove</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <div class="flex justify-end">
      <ElButton type="primary" :loading="saving" @click="save">Save navigation</ElButton>
    </div>
  </div>
</template>
