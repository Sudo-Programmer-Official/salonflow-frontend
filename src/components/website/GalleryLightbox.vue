<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { FALLBACK_IMAGE, type ResolvedMedia } from '../../utils/resolveMedia';

type DisplayMedia = ResolvedMedia & {
  id?: string;
};

const props = defineProps({
  open: { type: Boolean, required: true },
  images: {
    type: Array as PropType<DisplayMedia[]>,
    default: () => [],
  },
  startIndex: { type: Number, default: 0 },
});

const emit = defineEmits<{
  close: [];
}>();

const activeIndex = ref(0);

const activeImage = computed(() => props.images[activeIndex.value] || props.images[0] || null);

const prev = () => {
  if (!props.images.length) return;
  activeIndex.value = activeIndex.value === 0 ? props.images.length - 1 : activeIndex.value - 1;
};

const next = () => {
  if (!props.images.length) return;
  activeIndex.value = (activeIndex.value + 1) % props.images.length;
};

const onKeydown = (event: KeyboardEvent) => {
  if (!props.open) return;
  if (event.key === 'Escape') {
    emit('close');
    return;
  }
  if (event.key === 'ArrowLeft') prev();
  if (event.key === 'ArrowRight') next();
};

const onImageError = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.dataset.fallbackApplied === '1') return;
  target.dataset.fallbackApplied = '1';
  target.src = FALLBACK_IMAGE;
};

watch(
  () => [props.open, props.startIndex, props.images.length] as const,
  () => {
    const bounded =
      props.images.length > 0
        ? Math.min(Math.max(props.startIndex, 0), props.images.length - 1)
        : 0;
    activeIndex.value = bounded;
  },
  { immediate: true },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <transition name="gallery-lightbox">
    <div
      v-if="open && activeImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div class="gallery-lightbox-panel w-full max-w-6xl rounded-[28px] border border-white/12 bg-slate-950/80 p-4 shadow-[0_40px_120px_rgba(15,23,42,0.48)]">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
            Gallery
            <span class="ml-2 text-white/50">{{ activeIndex + 1 }} / {{ images.length }}</span>
          </div>
          <button
            type="button"
            class="rounded-full border border-white/15 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-white"
            @click="emit('close')"
          >
            Close
          </button>
        </div>

        <div class="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[22px] bg-white/5 px-4 py-4">
          <button
            v-if="images.length > 1"
            type="button"
            class="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
            @click="prev"
          >
            Prev
          </button>
          <picture class="block w-full">
            <source
              v-for="(src, idx) in activeImage.sources || []"
              :key="`${activeImage.id || 'gallery'}-${idx}`"
              :srcset="src.srcset"
              :type="src.type"
              :media="src.media"
            />
            <img
              :src="activeImage.src || FALLBACK_IMAGE"
              :alt="activeImage.alt || 'Gallery image'"
              class="mx-auto max-h-[72vh] w-full rounded-[18px] object-contain"
              @error="onImageError"
            />
          </picture>
          <button
            v-if="images.length > 1"
            type="button"
            class="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
            @click="next"
          >
            Next
          </button>
        </div>

        <div v-if="images.length > 1" class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            v-for="(img, idx) in images"
            :key="img.id || idx"
            type="button"
            class="h-2.5 rounded-full transition-all"
            :class="idx === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/35'"
            @click="activeIndex = idx"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.gallery-lightbox-enter-active,
.gallery-lightbox-leave-active {
  transition: opacity 220ms ease;
}

.gallery-lightbox-enter-active .gallery-lightbox-panel,
.gallery-lightbox-leave-active .gallery-lightbox-panel {
  transition: transform 260ms ease, opacity 260ms ease;
}

.gallery-lightbox-enter-from,
.gallery-lightbox-leave-to {
  opacity: 0;
}

.gallery-lightbox-enter-from .gallery-lightbox-panel,
.gallery-lightbox-leave-to .gallery-lightbox-panel {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
</style>
