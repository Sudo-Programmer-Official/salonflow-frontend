<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { FALLBACK_IMAGE, type ResolvedMedia } from '../../utils/resolveMedia';

type DisplayMedia = ResolvedMedia & {
  id?: string;
};

type ServiceDetailItem = {
  id: string;
  name: string;
  categoryName?: string | null;
  description?: string | null;
  fullDescription?: string | null;
  durationMinutes?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  images: DisplayMedia[];
  bullets?: string[];
};

const props = defineProps({
  open: { type: Boolean, required: true },
  service: {
    type: Object as PropType<ServiceDetailItem | null>,
    default: null,
  },
  bookingPath: { type: String, required: true },
  canPrev: { type: Boolean, default: false },
  canNext: { type: Boolean, default: false },
});

const emit = defineEmits<{
  close: [];
  prev: [];
  next: [];
}>();

const activeImageIndex = ref(0);

const images = computed(() => {
  if (props.service?.images?.length) return props.service.images;
  return [{ id: 'fallback', src: FALLBACK_IMAGE, alt: props.service?.name || '', sources: [] }];
});

const activeImage = computed(() => images.value[activeImageIndex.value] || images.value[0]);

const formatMoney = (cents?: number | null, currency = 'USD') => {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
};

const onKeydown = (event: KeyboardEvent) => {
  if (!props.open) return;
  if (event.key === 'Escape') {
    emit('close');
    return;
  }
  if (event.key === 'ArrowLeft') {
    if (images.value.length > 1) {
      activeImageIndex.value =
        activeImageIndex.value === 0 ? images.value.length - 1 : activeImageIndex.value - 1;
      return;
    }
    if (props.canPrev) emit('prev');
    return;
  }
  if (event.key === 'ArrowRight') {
    if (images.value.length > 1) {
      activeImageIndex.value = (activeImageIndex.value + 1) % images.value.length;
      return;
    }
    if (props.canNext) emit('next');
  }
};

const onImageError = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.dataset.fallbackApplied === '1') return;
  target.dataset.fallbackApplied = '1';
  target.src = FALLBACK_IMAGE;
};

watch(
  () => props.service?.id,
  () => {
    activeImageIndex.value = 0;
  },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <transition name="service-modal">
    <div
      v-if="open && service"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div class="service-modal-panel w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.32)]">
        <div class="grid max-h-[90vh] gap-0 lg:grid-cols-[1.1fr,0.9fr]">
          <div class="service-modal-media relative border-b border-slate-200 bg-slate-950 lg:border-b-0 lg:border-r">
            <div class="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
              <div class="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {{ service.categoryName || 'Service details' }}
              </div>
              <button
                type="button"
                class="rounded-full border border-white/15 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-white"
                @click="emit('close')"
              >
                Close
              </button>
            </div>

            <div class="flex h-full min-h-[320px] items-center justify-center px-5 pb-6 pt-16">
              <picture class="block w-full">
                <source
                  v-for="(src, idx) in activeImage?.sources || []"
                  :key="`${activeImage?.id || 'service'}-${idx}`"
                  :srcset="src.srcset"
                  :type="src.type"
                  :media="src.media"
                />
                <img
                  :src="activeImage?.src || FALLBACK_IMAGE"
                  :alt="activeImage?.alt || service.name"
                  class="mx-auto max-h-[56vh] w-full rounded-[22px] bg-white/80 object-contain"
                  @error="onImageError"
                />
              </picture>
            </div>

            <div
              v-if="images.length > 1"
              class="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 px-4"
            >
              <button
                type="button"
                class="rounded-full border border-white/20 bg-black/45 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
                @click="
                  activeImageIndex = activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1
                "
              >
                Prev image
              </button>
              <button
                v-for="(img, idx) in images"
                :key="img.id || idx"
                type="button"
                class="h-2.5 rounded-full transition-all"
                :class="idx === activeImageIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/45'"
                @click="activeImageIndex = idx"
              />
              <button
                type="button"
                class="rounded-full border border-white/20 bg-black/45 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
                @click="activeImageIndex = (activeImageIndex + 1) % images.length"
              >
                Next image
              </button>
            </div>
          </div>

          <div class="flex max-h-[90vh] flex-col bg-[linear-gradient(180deg,#fff_0%,#f8fafc_100%)]">
            <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Service</p>
                <h2 class="text-2xl font-semibold text-slate-950">{{ service.name }}</h2>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!canPrev"
                  @click="emit('prev')"
                >
                  Prev service
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!canNext"
                  @click="emit('next')"
                >
                  Next service
                </button>
              </div>
            </div>

            <div class="space-y-5 overflow-y-auto px-6 py-5">
              <div class="flex flex-wrap gap-2">
                <span
                  v-if="service.durationMinutes"
                  class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {{ service.durationMinutes }} min
                </span>
                <span
                  v-if="service.priceCents !== null && service.priceCents !== undefined"
                  class="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 shadow-sm"
                >
                  {{ formatMoney(service.priceCents, service.currency || 'USD') }}
                </span>
              </div>

              <div v-if="service.description || service.fullDescription" class="space-y-3">
                <p v-if="service.description" class="text-base leading-relaxed text-slate-600">
                  {{ service.description }}
                </p>
                <div
                  v-if="service.fullDescription"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-700 shadow-sm"
                >
                  {{ service.fullDescription }}
                </div>
              </div>

              <div
                v-if="service.bullets?.length"
                class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Included</div>
                <ul class="mt-3 space-y-2 text-sm text-slate-700">
                  <li v-for="(item, idx) in service.bullets" :key="`${service.id}-bullet-${idx}`" class="flex gap-2">
                    <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-white shadow-lg">
                <div class="text-xs uppercase tracking-[0.24em] text-white/60">Ready to book?</div>
                <p class="mt-2 text-sm leading-relaxed text-white/80">
                  Reserve your appointment now or call the salon if you want help choosing the right service.
                </p>
                <div class="mt-4">
                  <a
                    :href="bookingPath"
                    class="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Book now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.service-modal-enter-active,
.service-modal-leave-active {
  transition: opacity 220ms ease;
}

.service-modal-enter-active .service-modal-panel,
.service-modal-leave-active .service-modal-panel {
  transition: transform 260ms ease, opacity 260ms ease;
}

.service-modal-enter-from,
.service-modal-leave-to {
  opacity: 0;
}

.service-modal-enter-from .service-modal-panel,
.service-modal-leave-to .service-modal-panel {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
</style>
