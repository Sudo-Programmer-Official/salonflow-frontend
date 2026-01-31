<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElButton, ElCard, ElDialog, ElImage, ElMessage, ElUpload } from 'element-plus';
import type { UploadRequestOptions } from 'element-plus';
import { listWebsiteMedia, uploadWebsiteMedia, type WebsiteMedia } from '../../api/website';

const props = defineProps<{
  modelValue: string[];
  target?: any;
  /** Optional textual rules to show in the modal header. */
  rules?: string[];
  /** Optional max count hint for the counter display. */
  maxCount?: number | null;
  /** Optional noun to append after the counter, e.g., \"images selected\". */
  countLabel?: string | null;
}>();
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const uploading = ref(false);
const media = ref<WebsiteMedia[]>([]);

const selectedCount = computed(() => props.modelValue?.length || 0);
const selectionSummary = computed(() => {
  if (props.maxCount && props.maxCount > 0) {
    const base = `${selectedCount.value} / ${props.maxCount}`;
    return props.countLabel ? `${base} ${props.countLabel}` : `${base} selected`;
  }
  const base = `${selectedCount.value}`;
  return props.countLabel ? `${base} ${props.countLabel}` : `${base} selected`;
});
const ruleHints = computed(() => (props.rules || []).filter(Boolean));

const load = async () => {
  try {
    const items = await listWebsiteMedia();
    media.value = items;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load media');
  }
};

onMounted(load);

const toggle = (id: string) => {
  const current = props.modelValue || [];
  if (current.includes(id)) {
    emit('update:modelValue', current.filter((m) => m !== id));
  } else {
    emit('update:modelValue', [...current, id]);
  }
};

const remove = (index: number) => {
  const next = [...props.modelValue];
  next.splice(index, 1);
  emit('update:modelValue', next);
};

const handleUpload = async (opts: UploadRequestOptions) => {
  const file = opts.file as File;
  const form = new FormData();
  form.append('file', file);
  if (props.target) {
    form.append('target', JSON.stringify(props.target));
  }
  uploading.value = true;
  try {
    const uploaded = await uploadWebsiteMedia(form);
    media.value = [uploaded, ...media.value];
    ElMessage.success('Uploaded');
    opts.onSuccess?.(uploaded as any);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Upload failed');
    opts.onError?.(err as any);
  } finally {
    uploading.value = false;
  }
};

const getMediaById = (id: string) => media.value.find((m) => m.id === id);
const isSelected = (id: string) => (props.modelValue || []).includes(id);
const isVideo = (m?: WebsiteMedia) =>
  (m?.mime_type || (m as any)?.variants?.original?.mimeType || '').startsWith('video');

const toUrl = (
  input?:
    | string
    | { url: string; width?: number; height?: number; mimeType?: string }
    | { original_url?: string; originalUrl?: string }
    | null,
): string | undefined => {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  // prefer explicit url field if present
  if ('url' in input && input.url) return input.url;
  if ('original_url' in input && input.original_url) return input.original_url as string;
  if ('originalUrl' in input && input.originalUrl) return input.originalUrl as string;
  return undefined;
};
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <ElButton size="small" @click="open = true">Pick media</ElButton>
      <span class="text-xs text-slate-500">{{ selectionSummary }}</span>
      <span v-if="ruleHints.length" class="text-[11px] text-slate-500">• {{ ruleHints[0] }}</span>
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

    <ElDialog v-model="open" title="Media Library" width="70%" :destroy-on-close="false" append-to-body>
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
        <div class="space-y-1">
          <div class="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>{{ selectionSummary }}</span>
            <span class="text-xs font-normal text-slate-500">(Upload max 10MB each)</span>
          </div>
          <div v-if="ruleHints.length" class="text-xs text-slate-500 space-y-0.5 leading-relaxed">
            <div v-for="(hint, idx) in ruleHints" :key="idx">• {{ hint }}</div>
          </div>
        </div>
        <ElUpload
          :http-request="handleUpload"
          :show-file-list="false"
          accept="image/*,video/*"
          :disabled="uploading"
        >
          <ElButton :loading="uploading" type="primary">Upload</ElButton>
        </ElUpload>
      </div>
      <div class="grid gap-3 sm:grid-cols-4 md:grid-cols-5">
        <ElCard
          v-for="item in media"
          :key="item.id"
          class="media-card cursor-pointer border transition relative overflow-hidden"
          :class="isSelected(item.id) ? 'media-card--selected' : 'border-transparent hover:border-slate-200'"
          @click="toggle(item.id)"
        >
          <ElImage
            :src="toUrl(item.variants?.thumbnail) || toUrl(item.original_url)"
            style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px;"
          />
          <div v-if="isSelected(item.id)" class="media-card__check">✓</div>
          <div v-else-if="isVideo(item)" class="media-card__badge">Video</div>
        </ElCard>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.media-card {
  border-radius: 12px;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.media-card:hover {
  transform: translateY(-2px);
}
.media-card--selected {
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.25);
}
.media-card__check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: white;
  font-weight: 800;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.35);
}
.media-card__badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(15, 23, 42, 0.8);
  color: white;
}
</style>
