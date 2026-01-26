<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElButton, ElCard, ElDialog, ElImage, ElMessage, ElUpload } from 'element-plus';
import { listWebsiteMedia, uploadWebsiteMedia, type WebsiteMedia } from '../../api/website';

const props = defineProps<{ modelValue: string[] }>();
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const uploading = ref(false);
const media = ref<WebsiteMedia[]>([]);

const load = async () => {
  try {
    const items = await listWebsiteMedia();
    media.value = items;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load media');
  }
};

onMounted(load);

const add = (id: string) => {
  const next = [...(props.modelValue || []), id];
  emit('update:modelValue', next);
};

const remove = (index: number) => {
  const next = [...props.modelValue];
  next.splice(index, 1);
  emit('update:modelValue', next);
};

const handleUpload = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  uploading.value = true;
  try {
    const uploaded = await uploadWebsiteMedia(form);
    media.value = [uploaded, ...media.value];
    ElMessage.success('Uploaded');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Upload failed');
  } finally {
    uploading.value = false;
  }
};

const getMediaById = (id: string) => media.value.find((m) => m.id === id);

const toUrl = (
  input?: string | { url: string; width?: number; height?: number; mimeType?: string } | null,
): string | undefined => {
  if (!input) return undefined;
  return typeof input === 'string' ? input : input.url;
};
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <ElButton size="small" @click="open = true">Pick images</ElButton>
      <span class="text-xs text-slate-500">{{ modelValue?.length || 0 }} selected</span>
    </div>
    <div class="flex flex-wrap gap-2">
      <div v-for="(id, idx) in modelValue" :key="id" class="relative">
        <ElImage
          :src="toUrl(getMediaById(id)?.variants?.thumbnail) || toUrl(getMediaById(id)?.original_url)"
          style="width: 96px; height: 96px; object-fit: cover; border-radius: 8px;"
        />
        <button class="absolute -top-2 -right-2 bg-white text-xs rounded-full border px-1" @click.prevent="remove(idx)">✕</button>
      </div>
    </div>

    <ElDialog v-model="open" title="Media Library" width="70%">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm text-slate-600">Upload images (10MB max)</div>
        <ElUpload
          :http-request="(opts:any)=>handleUpload(opts.file)"
          :show-file-list="false"
          accept="image/*"
          :disabled="uploading"
        >
          <ElButton :loading="uploading" type="primary">Upload</ElButton>
        </ElUpload>
      </div>
      <div class="grid gap-3 sm:grid-cols-4 md:grid-cols-5">
        <ElCard
          v-for="item in media"
          :key="item.id"
          class="cursor-pointer"
          @click="add(item.id)"
        >
          <ElImage
            :src="toUrl(item.variants?.thumbnail) || toUrl(item.original_url)"
            style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 8px;"
          />
        </ElCard>
      </div>
    </ElDialog>
  </div>
</template>
