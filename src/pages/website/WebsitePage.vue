<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PublicWebsiteLayout from '../../layouts/PublicWebsiteLayout.vue';
import { useWebsite } from '../../composables/useWebsite';
import { apiUrl } from '../../api/client';
import { resolveMedia } from '../../utils/resolveMedia';

const route = useRoute();
const locale = computed(() => {
  const path = route.path;
  return path.startsWith('/es') ? 'es' : 'en';
});
const slug = computed(() => {
  const path = route.path.replace(/^\/es/, '');
  if (path === '/' || path === '') return 'home';
  const trimmed = path.replace(/^\//, '');
  return trimmed || 'home';
});

const { data, loading, error, fetchSite } = useWebsite(locale.value as 'en' | 'es');

const mediaMap = computed(() => {
  const map = new Map<string, any>();
  (data.value?.media || []).forEach((m: any) => map.set(m.id, m));
  return map;
});

const page = computed(() => {
  const pages = data.value?.pages || [];
  let p = pages.find((pg) => pg.slug === slug.value && pg.locale === locale.value);
  if (!p && locale.value === 'es') {
    p = pages.find((pg) => pg.slug === slug.value && pg.locale === 'en');
  }
  return p;
});

const hero = computed(() => page.value?.content?.hero || {});
const services = computed(() => page.value?.content?.services || []);
const contact = computed(() => page.value?.content?.contact || {});
const gallery = computed(() => page.value?.content?.gallery || []);
const resolvedGallery = computed(() => {
  const ids = Array.isArray(gallery.value) ? gallery.value : [];
  return ids.map((item: string) => {
    const isUuid = /^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      item,
    );
    if (isUuid && mediaMap.value.has(item)) {
      const media = mediaMap.value.get(item);
      const resolved = resolveMedia(media);
      return { id: item, ...resolved };
    }
    return { id: item, src: item, sources: [], alt: '' };
  });
});

const heroMedia = computed(() => {
  const img = hero.value?.image || hero.value?.imageId || hero.value?.imageUrl;
  if (!img) return null;
  const isUuid = /^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    img,
  );
  if (isUuid && mediaMap.value.has(img)) {
    return { id: img, ...resolveMedia(mediaMap.value.get(img), hero.value?.headline || '') };
  }
  return { id: img, ...resolveMedia({ original_url: img }, hero.value?.headline || '') };
});

const heroSlides = computed(() => resolvedGallery.value.slice(0, 5));
const heroSlideIndex = ref(0);
const currentHeroSlide = computed(() => heroSlides.value[heroSlideIndex.value] || null);
let heroInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (heroSlides.value.length > 1) {
    heroInterval = setInterval(() => {
      heroSlideIndex.value = (heroSlideIndex.value + 1) % heroSlides.value.length;
    }, 4200);
  }
});

onBeforeUnmount(() => {
  if (heroInterval) clearInterval(heroInterval);
});
const firstGalleryImage = computed(() => resolvedGallery.value?.[0]?.src);
const seo = computed(() => page.value?.seo || {});
const publishedLocales = computed(() => data.value?.meta?.locales || []);
const basePath = computed(() => route.path.replace(/^\/es/, '') || '/');
const isPreview = computed(
  () =>
    typeof window !== 'undefined' &&
    window.location.search.includes('websitePreview=1') &&
    Boolean(localStorage.getItem('token')),
);

const canonicalUrl = computed(() => {
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const prefix = locale.value === 'es' ? '/es' : '';
  return `https://${host}${prefix}${basePath.value === '/' ? '' : basePath.value}`;
});

const navItems = computed(() => {
  const raw = Array.isArray(data.value?.nav) ? data.value.nav : [];
  const items = raw
    .filter((n: any) => n && n.visible !== false)
    .map((n: any) => ({
      label: String(n.label ?? ''),
      path: String(n.path ?? '/'),
      position: Number.isFinite(n.position) ? n.position : 0,
    }))
    .sort((a: any, b: any) => a.position - b.position);

  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.path)) return false;
    seen.add(i.path);
    return true;
  });
});

const injectHead = () => {
  if (seo.value?.title) document.title = seo.value.title;
  if (seo.value?.description) {
    let meta = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = seo.value.description;
  }
  let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl.value;

  // hreflang
  document.querySelectorAll("link[rel='alternate'][hreflang]").forEach((n) => n.remove());
  const host = typeof window !== 'undefined' ? window.location.host : '';
  publishedLocales.value.forEach((loc: string) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = loc;
    const prefix = loc === 'es' ? '/es' : '';
    const baseCanonical = (data.value?.meta?.canonical ?? 'https://' + host).replace(/\/$/, '');
    link.href = `${baseCanonical}${prefix}${basePath.value === '/' ? '' : basePath.value}`;
    document.head.appendChild(link);
  });

  // JSON-LD LocalBusiness
  const scriptId = 'ld-localbusiness';
  document.getElementById(scriptId)?.remove();
  const contactData = page.value?.content?.contact || {};
  const businessName =
    page.value?.content?.hero?.brand ||
    page.value?.content?.hero?.headline ||
    'Salon';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: businessName,
    url: data.value?.meta?.canonical || canonicalUrl.value,
    telephone: contactData.phone || undefined,
    address: contactData.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: contactData.address,
        }
      : undefined,
    image: firstGalleryImage.value,
    openingHours: contactData.hours ? [contactData.hours] : undefined,
  };
  const ldScript = document.createElement('script');
  ldScript.id = scriptId;
  ldScript.type = 'application/ld+json';
  ldScript.textContent = JSON.stringify(ld);
  document.head.appendChild(ldScript);
};

const trackEvent = (eventType: 'page_view' | 'click_call' | 'click_directions' | 'form_submit') => {
  if (isPreview.value) return;
  fetch(apiUrl('/public/website/events'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-website-host': typeof window !== 'undefined' ? window.location.host : '',
    },
    body: JSON.stringify({
      event_type: eventType,
      path: route.path,
      locale: locale.value,
      source_page: route.path,
    }),
  }).catch(() => undefined);
};

const leadForm = reactive({
  name: '',
  phone: '',
  email: '',
  preferred_time: '',
  message: '',
  website: '', // honeypot
});
const leadSubmitting = ref(false);
const leadSuccess = ref(false);
const leadError = ref<string | null>(null);

const submitLead = async () => {
  leadError.value = null;
  leadSuccess.value = false;
  const digits = (leadForm.phone || '').replace(/\\D/g, '');
  if (digits && digits.length !== 10) {
    leadError.value = 'Enter a valid 10-digit phone number';
    return;
  }
  leadSubmitting.value = true;
  try {
    const res = await fetch(apiUrl('/public/website/leads'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-host': typeof window !== 'undefined' ? window.location.host : '',
      },
      body: JSON.stringify({
        ...leadForm,
        phone: digits ? digits : '',
        locale: locale.value,
        source_page: route.path,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to send');
    }
    // fire-and-forget event tracking
    fetch(apiUrl('/public/website/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-host': typeof window !== 'undefined' ? window.location.host : '',
      },
      body: JSON.stringify({
        event_type: 'form_submit',
        path: route.path,
        locale: locale.value,
        source_page: route.path,
      }),
    }).catch(() => undefined);
    leadSuccess.value = true;
    leadForm.name = '';
    leadForm.phone = '';
    leadForm.email = '';
    leadForm.preferred_time = '';
    leadForm.message = '';
  } catch (err: any) {
    leadError.value = err?.message || 'Failed to send';
  } finally {
    leadSubmitting.value = false;
  }
};

onMounted(async () => {
  await fetchSite();
  injectHead();
  trackEvent('page_view');
});

watch(
  () => route.fullPath,
  async () => {
    await fetchSite();
    injectHead();
    trackEvent('page_view');
  },
);
</script>

<template>
  <PublicWebsiteLayout>
    <template #brand>
      <div class="flex items-center gap-2">
        <div class="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">SF</div>
        <div class="text-base font-semibold leading-tight">{{ hero.brand || 'SalonFlow' }}</div>
        <span
          v-if="isPreview"
          class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200"
        >
          Preview
        </span>
      </div>
    </template>
    <template #nav>
      <a
        v-for="item in navItems"
        :key="item.path"
        class="hover:text-slate-900"
        :href="item.path"
      >
        {{ item.label }}
      </a>
    </template>

    <div class="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <section class="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] items-center">
        <div class="space-y-4">
          <p class="text-xs uppercase tracking-wide text-slate-500">{{ page?.slug === 'home' ? 'Salon' : page?.slug }}</p>
          <h1 class="text-3xl font-bold text-slate-900 lg:text-4xl">{{ hero.headline || 'Beautiful Nails. Exceptional Care.' }}</h1>
          <p class="text-lg text-slate-700">{{ hero.subheadline || '' }}</p>
          <div class="flex flex-wrap gap-3">
            <a class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800" href="#contact">
              {{ hero.ctaPrimary || 'Book Appointment' }}
            </a>
            <a class="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-400" href="#services">
              {{ hero.ctaSecondary || 'Our services' }}
            </a>
          </div>
        </div>
        <div v-if="(heroSlides.length && currentHeroSlide) || heroMedia?.src" class="relative">
          <div
            class="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 hero-tilt"
          >
            <picture>
              <source
                v-for="(src, idx) in (currentHeroSlide?.sources || heroMedia?.sources || [])"
                :key="idx"
                :srcset="src.srcset"
                :type="src.type"
                :media="src.media"
              />
              <img
                :src="currentHeroSlide?.src || heroMedia?.src"
                :alt="hero.headline || 'Salon hero image'"
                class="w-full h-full object-cover aspect-[4/3]"
                loading="lazy"
              />
            </picture>
          </div>
          <div
            v-if="heroSlides.length > 1"
            class="absolute inset-x-0 -bottom-6 flex justify-center gap-2"
          >
            <button
              v-for="(slide, i) in heroSlides"
              :key="slide.id || i"
              class="h-2.5 w-2.5 rounded-full transition-all"
              :class="i === heroSlideIndex ? 'bg-slate-900 w-5' : 'bg-slate-300'"
              @click="heroSlideIndex = i"
            />
          </div>
        </div>
        <div
          v-else
          class="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-xl"
        >
          <div class="text-sm uppercase tracking-wide text-white/70">Hours</div>
          <p class="mt-2 text-lg font-semibold">{{ contact.hours || 'Open daily' }}</p>
          <div class="mt-6 text-sm uppercase tracking-wide text-white/70">Call</div>
          <a
            :href="contact.phone ? `tel:${contact.phone}` : undefined"
            class="mt-2 inline-block text-2xl font-bold underline-offset-4 hover:underline"
            @click.prevent="contact.phone ? trackEvent('click_call') : null"
          >
            {{ contact.phone || '(361) 000-0000' }}
          </a>
          <div class="mt-6 text-sm uppercase tracking-wide text-white/70">Visit</div>
          <p class="mt-2 text-base leading-relaxed">
            <span>{{ contact.address || 'Your salon address' }}</span>
            <span v-if="contact.directions_url">
              ·
              <a
                class="underline hover:no-underline"
                :href="contact.directions_url"
                target="_blank"
                rel="noopener"
                @click="trackEvent('click_directions')"
              >
                Directions
              </a>
            </span>
          </p>
        </div>
      </section>

      <section id="services" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-slate-900">Services</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="(svc, idx) in services"
            :key="idx"
            class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="text-lg font-semibold text-slate-900">{{ svc.title }}</div>
            <div class="text-sm text-slate-600">{{ svc.description }}</div>
          </div>
        </div>
      </section>

      <section id="contact" class="space-y-3">
        <h2 class="text-2xl font-semibold text-slate-900">Contact</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm uppercase tracking-wide text-slate-500">Address</div>
            <div class="text-base text-slate-900">{{ contact.address || 'Add your address' }}</div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm uppercase tracking-wide text-slate-500">Phone</div>
            <div class="text-base text-slate-900">{{ contact.phone || '(361) 000-0000' }}</div>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="text-sm uppercase tracking-wide text-slate-500">Send us a message</div>
          <form class="mt-2 space-y-3" @submit.prevent="submitLead">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-sm font-semibold text-slate-800">
                Name
                <input v-model="leadForm.name" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
              </label>
              <label class="block text-sm font-semibold text-slate-800">
                Phone
                <input v-model="leadForm.phone" inputmode="tel" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" placeholder="(555) 123-4567" />
              </label>
            </div>
            <label class="block text-sm font-semibold text-slate-800">
              Email
              <input v-model="leadForm.email" type="email" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" placeholder="you@example.com" />
            </label>
            <label class="block text-sm font-semibold text-slate-800">
              Preferred time
              <input v-model="leadForm.preferred_time" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" placeholder="e.g. Tomorrow 2-4pm" />
            </label>
            <label class="block text-sm font-semibold text-slate-800">
              Message
              <textarea v-model="leadForm.message" rows="3" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" placeholder="Tell us what you need"></textarea>
            </label>
            <input v-model="leadForm.website" class="hidden" aria-hidden="true" />
            <div class="flex items-center gap-3">
              <button :disabled="leadSubmitting" type="submit" class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60">
                {{ leadSubmitting ? 'Sending…' : 'Send message' }}
              </button>
              <p class="text-sm text-slate-600" v-if="leadSuccess">Thanks! We received your message.</p>
              <p class="text-sm text-rose-600" v-if="leadError">{{ leadError }}</p>
            </div>
          </form>
        </div>
      </section>

      <section v-if="gallery.length" class="space-y-3">
        <h2 class="text-2xl font-semibold text-slate-900">Gallery</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <picture
            v-for="(img, idx) in resolvedGallery"
            :key="idx"
            class="block"
          >
            <source
              v-for="(src, sIdx) in img.sources"
              :key="sIdx"
              :srcset="src.srcset"
              :type="src.type"
              :media="src.media"
            />
            <img
              :src="img.src"
              class="w-full rounded-xl border border-slate-200 object-cover aspect-[4/3]"
              loading="lazy"
              :alt="img.alt || ''"
            />
          </picture>
        </div>
      </section>

      <div v-if="loading" class="text-sm text-slate-600">Loading…</div>
      <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>
    </div>
  </PublicWebsiteLayout>
</template>

<style scoped>
.hero-tilt {
  transform: perspective(1200px) rotateY(-6deg) rotateX(2deg);
  transition: transform 400ms ease, box-shadow 400ms ease;
}
.hero-tilt:hover {
  transform: perspective(1200px) rotateY(-2deg) rotateX(0deg) scale(1.01);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.18);
}
</style>
