<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElButton, ElCard, ElDialog, ElImage, ElMessage, ElUpload, ElMessageBox } from 'element-plus';
import type { UploadRequestOptions } from 'element-plus';
import {
  deleteWebsiteMedia,
  listWebsiteMedia,
  restoreWebsiteMedia,
  uploadWebsiteMedia,
  type WebsiteMedia,
} from '../../api/website';

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
const inflight = ref(0);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB each
const imageCandidateIndex = ref<Record<string, number>>({});
const imageUnavailable = ref<Record<string, boolean>>({});

const selectedCount = computed(() => props.modelValue?.length || 0);
const isAtMaxCount = computed(
  () => Boolean(props.maxCount && props.maxCount > 0 && selectedCount.value >= props.maxCount),
);
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

const showMaxCountMessage = () => {
  if (!props.maxCount || props.maxCount <= 0) return;
  ElMessage.warning(`You can select up to ${props.maxCount} items here.`);
};

const toggle = (id: string) => {
  const current = props.modelValue || [];
  const item = getMediaById(id);
  if (item?.archived_at && !current.includes(id)) return;
  if (current.includes(id)) {
    emit('update:modelValue', current.filter((m) => m !== id));
    return;
  }
  if (props.maxCount === 1) {
    emit('update:modelValue', [id]);
    return;
  }
  if (isAtMaxCount.value) {
    showMaxCountMessage();
    return;
  }
  emit('update:modelValue', [...current, id]);
};

const mediaCandidates = (item?: WebsiteMedia | null): string[] => {
  if (!item || isVideo(item)) return [];
  const variants = item.variants || {};
  const values = [
    variants.thumbnail?.url,
    variants.md?.url,
    variants.sm?.url,
    variants.lg?.url,
    variants.xl?.url,
    item.original_url,
  ];
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
};

const mediaSource = (item?: WebsiteMedia | null) => {
  const candidates = mediaCandidates(item);
  if (!item || !candidates.length || imageUnavailable.value[item.id]) return '';
  const index = imageCandidateIndex.value[item.id] || 0;
  return candidates[Math.min(index, candidates.length - 1)] || '';
};

const handleImageError = (item?: WebsiteMedia | null) => {
  if (!item) return;
  const candidates = mediaCandidates(item);
  const currentIndex = imageCandidateIndex.value[item.id] || 0;
  if (currentIndex + 1 < candidates.length) {
    imageCandidateIndex.value = {
      ...imageCandidateIndex.value,
      [item.id]: currentIndex + 1,
    };
    return;
  }
  imageUnavailable.value = { ...imageUnavailable.value, [item.id]: true };
};

const remove = (index: number) => {
  const next = [...props.modelValue];
  next.splice(index, 1);
  emit('update:modelValue', next);
};

const handleUpload = async (opts: UploadRequestOptions) => {
  const file = opts.file as File;
  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('File exceeds 50MB limit');
    ElMessage.error(err.message);
    opts.onError?.(err as any);
    return;
  }
  const form = new FormData();
  form.append('file', file);
  if (props.target) {
    form.append('target', JSON.stringify(props.target));
  }
  inflight.value += 1;
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
    inflight.value -= 1;
    uploading.value = inflight.value > 0;
  }
};

const getMediaById = (id: string) => media.value.find((m) => m.id === id);
const isSelected = (id: string) => (props.modelValue || []).includes(id);
const isVideo = (m?: WebsiteMedia) =>
  (m?.mime_type || (m as any)?.variants?.original?.mimeType || '').startsWith('video');

const deleteItem = async (item: WebsiteMedia, evt: Event) => {
  evt.stopPropagation();
  try {
    await ElMessageBox.confirm(
      'This will archive the media from the picker. Existing pages keep working and the image remains recoverable.',
      'Archive image?',
      {
        confirmButtonText: 'Archive',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
  } catch {
    return;
  }
  try {
    await deleteWebsiteMedia(item.id);
    media.value = media.value.map((m) => (m.id === item.id ? { ...m, archived_at: new Date().toISOString() } : m));
    ElMessage.success('Archived');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Delete failed');
  }
};

const restoreItem = async (item: WebsiteMedia, evt: Event) => {
  evt.stopPropagation();
  try {
    const restored = await restoreWebsiteMedia(item.id);
    media.value = media.value.map((m) => (m.id === item.id ? restored : m));
    imageCandidateIndex.value = { ...imageCandidateIndex.value, [item.id]: 0 };
    imageUnavailable.value = { ...imageUnavailable.value, [item.id]: false };
    ElMessage.success('Restored');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Restore failed');
  }
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
        <template v-if="isVideo(getMediaById(id))">
          <div class="media-selected-video">
            <span class="media-selected-video__icon">▶</span>
            <span class="media-selected-video__label">Video</span>
          </div>
        </template>
        <template v-else>
          <div v-if="imageUnavailable[id]" class="media-selected-unavailable">
            Image unavailable
          </div>
          <ElImage
            v-else
            :src="mediaSource(getMediaById(id))"
            @error="handleImageError(getMediaById(id))"
            style="width: 96px; height: 96px; object-fit: cover; border-radius: 8px;"
          />
        </template>
        <button class="absolute -top-2 -right-2 bg-white text-xs rounded-full border px-1" @click.prevent="remove(idx)">✕</button>
      </div>
    </div>

    <ElDialog v-model="open" title="Media Library" width="70%" :destroy-on-close="false" append-to-body>
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
        <div class="space-y-1">
          <div class="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>{{ selectionSummary }}</span>
            <span class="text-xs font-normal text-slate-500">(Upload max 50MB each)</span>
          </div>
          <div v-if="ruleHints.length" class="text-xs text-slate-500 space-y-0.5 leading-relaxed">
            <div v-for="(hint, idx) in ruleHints" :key="idx">• {{ hint }}</div>
          </div>
        </div>
        <ElUpload
          :http-request="handleUpload"
          :show-file-list="false"
          accept="image/*,video/*"
          multiple
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
          :class="[
            isSelected(item.id) ? 'media-card--selected' : 'border-transparent hover:border-slate-200',
            !isSelected(item.id) && isAtMaxCount ? 'media-card--disabled' : '',
            item.archived_at ? 'media-card--archived' : '',
          ]"
          @click="toggle(item.id)"
        >
          <button
            v-if="!item.archived_at"
            class="media-card__delete"
            title="Delete media"
            @click.stop="deleteItem(item, $event)"
          >
            ✕
          </button>
          <button
            v-else
            class="media-card__restore"
            title="Restore media"
            @click.stop="restoreItem(item, $event)"
          >
            Restore
          </button>

          <template v-if="isVideo(item)">
            <div class="media-card__video">
              <div class="media-card__badge">Video</div>
              <div class="media-card__video-icon">▶</div>
              <div class="media-card__video-name">{{ (item.mime_type || '').split('/')[1] || 'mp4' }}</div>
            </div>
          </template>
          <template v-else>
            <div v-if="imageUnavailable[item.id]" class="media-card__unavailable">
              Image unavailable
            </div>
            <ElImage
              v-else
              :src="mediaSource(item)"
              @error="handleImageError(item)"
              style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px;"
            />
          </template>
          <div v-if="isSelected(item.id)" class="media-card__check">✓</div>
          <div v-if="item.archived_at" class="media-card__archived-label">Archived</div>
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
.media-card:hover .media-card__delete {
  opacity: 1;
  pointer-events: auto;
}
.media-card--selected {
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.25);
}
.media-card--disabled {
  opacity: 0.7;
}
.media-card--archived {
  opacity: 0.62;
  cursor: default;
}
.media-card__archived-label,
.media-card__unavailable,
.media-selected-unavailable {
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 0.75rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 10px;
}
.media-card__archived-label {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 7px;
  background: rgba(255, 255, 255, 0.92);
}
.media-card__unavailable {
  width: 100%;
  aspect-ratio: 4 / 3;
}
.media-selected-unavailable {
  width: 96px;
  height: 96px;
}
.media-card__restore {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  border: 0;
  border-radius: 9999px;
  padding: 5px 8px;
  color: #0369a1;
  background: rgba(255, 255, 255, 0.94);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
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
.media-card__delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background: rgba(248, 113, 113, 0.9);
  color: white;
  font-weight: 800;
  border: none;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 20px rgba(248, 113, 113, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
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
.media-card__video {
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 10px;
  background: radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.2), transparent 35%),
    linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  display: grid;
  place-items: center;
  gap: 6px;
  position: relative;
}
.media-card__video-icon {
  font-size: 28px;
  line-height: 1;
}
.media-card__video-name {
  font-size: 12px;
  letter-spacing: 0.4px;
  color: #cbd5e1;
}
.media-selected-video {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  display: grid;
  place-items: center;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.4);
}
.media-selected-video__icon {
  font-size: 20px;
}
.media-selected-video__label {
  font-size: 11px;
  letter-spacing: 0.3px;
}
</style>
