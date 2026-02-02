<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PublicWebsiteLayout from '../../layouts/PublicWebsiteLayout.vue';
import { useWebsite } from '../../composables/useWebsite';
import { apiUrl } from '../../api/client';
import { resolveMedia } from '../../utils/resolveMedia';
import { fetchGroupedServices } from '../../api/checkins';

const BOOKING_PATH = '/check-in/book';

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

const isHomePage = computed(() => slug.value === 'home');
const isServicesPage = computed(() => slug.value === 'services');
const isAboutPage = computed(() => slug.value === 'about');
const isContactPage = computed(() => slug.value === 'contact');
const bookingPath = computed(() => BOOKING_PATH);

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
const servicesMode = computed(() => {
  const raw = (page.value?.content as any)?.servicesMode || (page.value?.content as any)?.services_mode;
  return raw === 'custom' || raw === 'live' ? raw : 'auto';
});
const servicesIntro = computed(() => {
  const intro = (page.value?.content as any)?.servicesIntro || (page.value?.content as any)?.services_intro;
  if (intro) return String(intro);
  return (page.value?.content as any)?.servicesIntroDefault ||
    'At MTV Nails, we offer a full range of nail, spa, and beauty services designed to help you look polished and feel confident.';
});
const valueProps = computed(() => {
  const raw = (page.value?.content as any)?.valueProps || (page.value?.content as any)?.value_props;
  if (!Array.isArray(raw)) return [] as string[];
  return raw
    .map((v) => (typeof v === 'string' ? v.trim() : v?.title || v?.label || ''))
    .filter(Boolean)
    .slice(0, 6);
});
const hygieneNote = computed(() => {
  const raw = (page.value?.content as any)?.hygiene || (page.value?.content as any)?.hygieneNote;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return 'Hospital-grade disinfection on every tool and station; fresh files and buffers for each client.';
});
const socialProof = computed(() => {
  const raw = (page.value?.content as any)?.socialProof || (page.value?.content as any)?.social_proof;
  if (!raw) return { headline: '', body: '' };
  if (typeof raw === 'string') return { headline: raw, body: '' };
  return {
    headline: raw.headline || raw.title || '',
    body: raw.body || raw.subheadline || '',
  };
});
const promoBanner = computed(() => {
  const raw = (page.value?.content as any)?.promo || (page.value?.content as any)?.promotion;
  if (!raw) return null as null | { text: string; cta?: string | null; url?: string | null };
  if (typeof raw === 'string') return { text: raw, cta: null, url: null };
  const text = raw.text || raw.headline || '';
  if (!text) return null;
  return { text, cta: raw.cta || raw.ctaText || null, url: raw.url || raw.ctaUrl || null };
});
const bookingNote = computed(() => {
  const raw = (page.value?.content as any)?.bookingNote || (page.value?.content as any)?.booking_note;
  return raw ? String(raw) : '';
});
const faqItems = computed(() => {
  const raw = (page.value?.content as any)?.faq;
  if (!Array.isArray(raw)) return [] as Array<{ question: string; answer: string }>;
  return raw
    .map((f: any) => ({
      question: String(f?.question || f?.q || '').trim(),
      answer: String(f?.answer || f?.a || '').trim(),
    }))
    .filter((f: any) => f.question && f.answer)
    .slice(0, 8);
});
const contactNotes = computed(() => {
  const c = contact.value || {};
  return c.notes || c.parking || null;
});
const contactPolicies = computed(() => {
  const c = contact.value || {};
  return c.policies || c.policy || null;
});
const contactHoursLines = computed(() => {
  const h = contact.value?.hours;
  if (!h) return [] as string[];
  return String(h)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
});
const mapEmbedSrc = computed(() => {
  const c = contact.value || {};
  const explicit =
    (c as any).map_embed ||
    (c as any).map_embed_url ||
    (c as any).mapUrl ||
    (c as any).mapUrlEmbed;
  if (explicit) return explicit;
  if (c.directions_url) {
    const url = c.directions_url;
    // if it's already an embed URL, return as-is
    if (/\/embed/i.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}output=embed`;
  }
  if (c.address) {
    const q = encodeURIComponent(c.address);
    return `https://www.google.com/maps?&q=${q}&output=embed`;
  }
  return null;
});
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
const servicesHeroImages = computed(() =>
  heroSlides.value.length ? heroSlides.value : heroMedia.value ? [heroMedia.value] : [],
);
const currentServicesHero = computed(
  () => servicesHeroImages.value[heroSlideIndex.value % (servicesHeroImages.value.length || 1)] || null,
);

const homeHeroBg = computed(() => {
  if (!isHomePage.value) return null;
  const src = currentHeroSlide.value?.src || heroMedia.value?.src;
  return src || null;
});
const aboutImage = computed(() => currentHeroSlide.value || heroMedia.value || resolvedGallery.value[0] || null);
const aboutValues = computed(() => {
  const vals = page.value?.content?.values;
  if (Array.isArray(vals) && vals.length) {
    return vals
      .map((v: any) => (typeof v === 'string' ? v : v?.title || v?.label))
      .filter(Boolean)
      .slice(0, 4);
  }
  return ['Quality', 'Hygiene', 'Experience'];
});
const aboutParagraphs = computed(() => {
  const copy =
    (page.value?.content?.about as any)?.copy ||
    hero.value?.subheadline ||
    contact.value?.hours ||
    '';
  return String(copy)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
});
let heroInterval: ReturnType<typeof setInterval> | null = null;

const liveServices = ref<
  Array<{
    name: string;
    description?: string | null;
    durationMinutes?: number;
    priceCents?: number;
    currency?: string;
  }>
>([]);
const servicesLoading = ref(false);
const servicesError = ref<string | null>(null);

const loadServices = async () => {
  if (servicesLoading.value) return;
  servicesLoading.value = true;
  servicesError.value = null;
  try {
    const grouped = await fetchGroupedServices();
    const flattened = grouped.flatMap((group: any) =>
      (group.services || []).map((svc: any) => ({
        name: svc.name,
        description: (svc.bookingRules as any)?.short_description || null,
        durationMinutes: svc.durationMinutes,
        priceCents: svc.priceCents,
        currency: svc.currency,
      })),
    );
    liveServices.value = flattened;
  } catch (err: any) {
    servicesError.value = err?.message || 'Unable to load services';
    liveServices.value = [];
  } finally {
    servicesLoading.value = false;
  }
};

const formatMoney = (cents?: number | null, currency = 'USD') => {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
};

const serviceCards = computed(() => {
  const customServices = Array.isArray(services.value) ? services.value : [];
  const haveLive = liveServices.value.length > 0;
  const mode = servicesMode.value;

  const items =
    mode === 'live'
      ? liveServices.value
      : mode === 'custom'
        ? customServices
        : haveLive
          ? liveServices.value
          : customServices;
  const galleryImages = resolvedGallery.value;
  const defaultImg = galleryImages.length ? galleryImages[0] : null;

  return items
    .map((svc: any, idx: number) => {
      const title = svc?.title || svc?.name || svc;
      if (!title) return null;
      let img = null;
      const imageId = svc?.image;
      if (imageId) {
        const media = mediaMap.value.get(imageId);
        if (media) img = { id: imageId, ...resolveMedia(media, title) };
      }
      if (!img && galleryImages.length) {
        img = galleryImages[idx % galleryImages.length];
      }
      if (!img && defaultImg) img = defaultImg;
      return {
        name: title,
        description: svc?.description,
        durationMinutes: svc?.durationMinutes,
        priceCents: svc?.priceCents,
        currency: svc?.currency,
        img,
      };
    })
    .filter(Boolean) as Array<{
      name: string;
      description?: string;
      durationMinutes?: number;
      priceCents?: number;
      currency?: string;
      img: any;
    }>;
});

const showServicesSection = computed(() => !isContactPage.value && serviceCards.value.length > 0);
const showContactSection = computed(() => isHomePage.value || isContactPage.value);

onMounted(() => {
  const start = () => {
    if (heroInterval) clearInterval(heroInterval);
    if (heroSlides.value.length > 1) {
      heroInterval = setInterval(() => {
        heroSlideIndex.value = (heroSlideIndex.value + 1) % heroSlides.value.length;
      }, 4200);
    }
  };
  start();

  watch(
    () => heroSlides.value.length,
    () => {
      start();
    },
    { immediate: false },
  );
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

const pageToPath = (page: string, loc: 'en' | 'es') => {
  const prefix = loc === 'es' ? '/es' : '';
  switch (page) {
    case 'services':
      return `${prefix}/services`;
    case 'about':
      return `${prefix}/about`;
    case 'contact':
      return `${prefix}/contact`;
    case 'home':
    default:
      return `${prefix}/`;
  }
};

const headerConfig = computed(() => {
  return (
    data.value?.layout?.header || {
      enabled: true,
      nav: [],
      ctas: { call: { enabled: true }, book: { enabled: true, url: '/check-in/book' } },
    }
  );
});

const footerConfig = computed(() => data.value?.layout?.footer || { enabled: false });

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

  const fallbackNav = Array.isArray(headerConfig.value?.nav)
    ? headerConfig.value.nav.map((n: any, idx: number) => ({
        label: String(n.label || ''),
        path: pageToPath(n.page, locale.value as 'en' | 'es'),
        position: idx,
      }))
    : [];

  const merged = items.length ? items : fallbackNav;
  const seen = new Set<string>();
  return merged.filter((i) => {
    if (seen.has(i.path)) return false;
    seen.add(i.path);
    return Boolean(i.label && i.path);
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
  await Promise.all([fetchSite(), loadServices()]);
  injectHead();
  trackEvent('page_view');
});

watch(
  () => route.fullPath,
  async () => {
    await fetchSite();
    if (!servicesLoading.value && liveServices.value.length === 0) {
      loadServices();
    }
    injectHead();
    trackEvent('page_view');
  },
);

const brandName = computed(
  () =>
    hero.value?.brand ||
    seo.value?.title ||
    (page.value?.slug === 'home' ? 'SalonFlow' : page.value?.slug || 'SalonFlow'),
);

const headerView = computed(() => ({
  enabled: headerConfig.value?.enabled !== false,
  brand: brandName.value,
  nav: navItems.value,
  ctas: {
    call: {
      enabled: headerConfig.value?.ctas?.call?.enabled !== false,
      phone: footerConfig.value?.contact?.phone || contact.value?.phone || null,
    },
    book: {
      enabled: headerConfig.value?.ctas?.book?.enabled !== false,
      url: BOOKING_PATH,
    },
  },
}));

const footerView = computed(() => {
  const contactInfo = {
    phone: footerConfig.value?.contact?.phone || contact.value?.phone || null,
    email: footerConfig.value?.contact?.email || contact.value?.email || null,
  };
  const hoursManual =
    footerConfig.value?.hours?.manual?.length
      ? footerConfig.value.hours
      : data.value?.businessHours
        ? {
            source: 'admin',
            manual: Object.entries(data.value.businessHours || {})
              .filter(([, v]) => v)
              .map(([day, v]: any) => ({
                day: day.slice(0, 3).charAt(0).toUpperCase() + day.slice(1, 3),
                open: v.open,
                close: v.close,
              })),
          }
        : null;
  return {
    ...footerConfig.value,
    contact: contactInfo,
    hours: footerConfig.value?.hours ?? hoursManual,
    fallbackHoursText: contact.value?.hours || null,
  };
});
</script>

<template>
  <PublicWebsiteLayout :header="headerView" :footer="footerView" :active-path="route.path">
    <div class="space-y-12">
      <div
        v-if="isPreview"
        class="sf-container inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 mt-8"
      >
        Preview mode
      </div>

      <section
        v-if="isServicesPage"
        class="services-hero relative overflow-hidden text-white shadow-2xl min-h-[55vh]"
      >
        <div class="absolute inset-0 services-hero__image" aria-hidden="true">
          <picture v-if="currentServicesHero?.src" class="block h-full w-full">
            <source
              v-for="(src, idx) in currentServicesHero.sources || []"
              :key="idx"
              :srcset="src.srcset"
              :type="src.type"
              :media="src.media"
            />
            <img
              :src="currentServicesHero.src"
              :alt="hero.headline || 'Services hero image'"
              class="h-full w-full object-cover"
              loading="lazy"
            />
          </picture>
        </div>
        <div class="absolute inset-0 services-hero__overlay"></div>
        <div class="relative z-10">
          <div class="sf-container py-10 lg:py-14">
            <div class="grid items-center gap-10 lg:grid-cols-[1.05fr,0.95fr]">
              <div class="space-y-4">
                <p class="text-xs uppercase tracking-[0.35em] text-white/70">Our Services</p>
                <h1 class="text-4xl font-bold lg:text-5xl">
                  {{ hero.headline || 'Premium services, zero compromise.' }}
                </h1>
                <p class="text-lg text-white/80 max-w-2xl">
                  {{ hero.subheadline || 'Select a service and book instantly.' }}
                </p>
                <div class="flex flex-wrap gap-3">
                  <a
                    :href="bookingPath"
                    class="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-text shadow-lg ring-1 ring-white/60 backdrop-blur hover:-translate-y-0.5 hover:shadow-2xl transition"
                  >
                    {{ hero.ctaPrimary || 'Book Appointment' }}
                  </a>
                  <a
                    class="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/80 transition"
                    href="#services"
                  >
                    View services
                  </a>
                </div>
              </div>
              <div class="relative">
                <div class="services-hero__frame">
                  <picture v-if="currentServicesHero?.src" class="block">
                    <source
                      v-for="(src, idx) in currentServicesHero.sources || []"
                      :key="idx"
                      :srcset="src.srcset"
                      :type="src.type"
                      :media="src.media"
                    />
                    <img
                      :src="currentServicesHero.src"
                      :alt="hero.headline || 'Services hero image'"
                      class="w-full h-full object-cover services-hero__img"
                      loading="lazy"
                    />
                  </picture>
                </div>
                <div
                  v-if="servicesHeroImages.length > 1"
                  class="absolute inset-x-0 -bottom-6 flex justify-center gap-2"
                >
                  <button
                    v-for="(slide, i) in servicesHeroImages"
                    :key="slide.id || i"
                    class="h-2.5 w-2.5 rounded-full transition-all"
                    :class="i === heroSlideIndex ? 'bg-surface w-5' : 'bg-surface opacity-60'"
                    @click="heroSlideIndex = i"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        v-else
        class="sf-section home-hero"
        :class="{ 'home-hero--bg': !!homeHeroBg }"
        :style="
          homeHeroBg
            ? { backgroundImage: `linear-gradient(135deg, rgba(7,12,24,0.82), rgba(7,12,24,0.42)), url(${homeHeroBg})` }
            : undefined
        "
      >
        <div class="sf-container grid gap-8 lg:grid-cols-[1.05fr,0.95fr] items-center">
        <div class="space-y-4">
          <p class="text-xs uppercase tracking-wide text-muted">{{ page?.slug === 'home' ? 'Salon' : page?.slug }}</p>
          <h1 class="text-3xl font-bold text-text lg:text-4xl">{{ hero.headline || 'Beautiful Nails. Exceptional Care.' }}</h1>
          <p class="text-lg text-muted leading-relaxed">{{ hero.subheadline || '' }}</p>
          <div class="flex flex-wrap gap-3">
            <a
              class="inline-flex items-center gap-2 rounded-full bg-text px-4 py-2 text-white text-sm font-semibold hover:bg-text/90"
              :href="bookingPath"
            >
              {{ hero.ctaPrimary || 'Book Appointment' }}
            </a>
            <a
              v-if="showServicesSection"
              class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text hover:border-border"
              href="#services"
            >
              {{ hero.ctaSecondary || 'Our services' }}
            </a>
          </div>
        </div>
        <div v-if="(heroSlides.length && currentHeroSlide) || heroMedia?.src" class="relative">
          <div
            class="hero-frame rounded-3xl overflow-hidden shadow-2xl border border-border hero-tilt"
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
                :key="heroSlideIndex"
                :src="currentHeroSlide?.src || heroMedia?.src"
                :alt="hero.headline || 'Salon hero image'"
                class="w-full h-full object-cover aspect-[5/4] md:min-h-[360px] hero-slide"
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
              :class="i === heroSlideIndex ? 'bg-text w-5' : 'bg-muted/60'"
              @click="heroSlideIndex = i"
            />
          </div>
        </div>
        <div
          v-else
          class="rounded-2xl text-white p-6 shadow-xl"
          :style="{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--sf-text, #0f172a) 90%, transparent) 0%, color-mix(in srgb, var(--sf-text, #0f172a) 68%, transparent) 100%)',
          }"
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
        </div>
      </section>

      <section v-if="isAboutPage" class="sf-container sf-section space-y-6">
        <div class="grid gap-6 lg:grid-cols-[1fr,1.05fr] items-center">
          <div v-if="aboutImage?.src" class="hero-frame overflow-hidden rounded-3xl shadow-2xl border border-border">
            <picture>
              <source
                v-for="(src, idx) in aboutImage.sources || []"
                :key="idx"
                :srcset="src.srcset"
                :type="src.type"
                :media="src.media"
              />
              <img
                :src="aboutImage.src"
                :alt="hero.headline || 'About image'"
                class="w-full h-full object-cover aspect-[5/4]"
                loading="lazy"
              />
            </picture>
          </div>
          <div class="space-y-4">
            <p class="text-xs uppercase tracking-wide text-muted">About</p>
            <h2 class="text-3xl font-bold text-text">Welcome to {{ brandName }}</h2>
            <p
              v-for="(p, idx) in aboutParagraphs"
              :key="idx"
              class="text-base text-muted leading-relaxed"
            >
              {{ p }}
            </p>
            <div class="flex flex-wrap gap-3">
              <a
                class="inline-flex items-center gap-2 rounded-full bg-text px-4 py-2 text-white text-sm font-semibold hover:bg-text/90"
                :href="bookingPath"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="text-sm uppercase tracking-wide text-muted mb-3">Values</div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="(val, idx) in aboutValues"
              :key="idx"
              class="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm font-semibold text-text"
            >
              • {{ val }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="showServicesSection" id="services" class="sf-container sf-section space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-text">Services</h2>
        </div>

        <div class="grid gap-3 lg:grid-cols-[1.3fr,0.7fr] items-start">
          <div class="space-y-3">
            <p v-if="servicesIntro" class="text-base text-muted leading-relaxed">
              {{ servicesIntro }}
            </p>
            <div v-if="valueProps.length" class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="(val, idx) in valueProps"
                :key="idx"
                class="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-text shadow-sm"
              >
                • {{ val }}
              </div>
            </div>
            <div
              v-if="promoBanner"
              class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm font-semibold shadow-sm flex items-center gap-2"
            >
              <span>{{ promoBanner.text }}</span>
              <a
                v-if="promoBanner.cta && promoBanner.url"
                :href="promoBanner.url"
                class="underline font-bold"
              >
                {{ promoBanner.cta }}
              </a>
            </div>
          </div>

          <div class="rounded-2xl border border-border bg-surface-muted px-4 py-4 shadow-inner space-y-2">
            <div class="text-sm uppercase tracking-wide text-muted">Hygiene</div>
            <p class="text-sm text-text leading-relaxed">{{ hygieneNote }}</p>
            <div v-if="bookingNote" class="pt-2 text-sm text-muted leading-relaxed">
              {{ bookingNote }}
            </div>
            <div v-if="socialProof.headline" class="pt-3 border-t border-border">
              <div class="text-sm font-semibold text-text">{{ socialProof.headline }}</div>
              <p v-if="socialProof.body" class="text-sm text-muted leading-relaxed">
                {{ socialProof.body }}
              </p>
            </div>
          </div>
        </div>

        <p v-if="servicesError" class="text-sm text-rose-600">{{ servicesError }}</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
          v-for="(card, idx) in serviceCards"
          :key="idx"
          class="relative overflow-hidden rounded-2xl border border-border bg-white shadow-lg service-tilt"
          >
            <div class="absolute inset-0 services-card-glow"></div>
            <picture v-if="card.img?.src" class="block">
              <source
                v-for="(src, sIdx) in card.img.sources"
                :key="sIdx"
                :srcset="src.srcset"
                :type="src.type"
                :media="src.media"
              />
              <img
                :src="card.img.src"
                :alt="card.name"
                class="w-full h-36 object-cover"
                loading="lazy"
              />
            </picture>
            <div class="p-4 flex items-center justify-between gap-3">
              <div class="text-base font-semibold text-text">
                <div>{{ card.name }}</div>
                <div v-if="card.description" class="text-sm text-muted font-normal mt-1 line-clamp-2">
                  {{ card.description }}
                </div>
                <div
                  v-if="card.durationMinutes || card.priceCents !== undefined"
                  class="text-sm text-muted mt-1 flex items-center gap-2"
                >
                  <span v-if="card.durationMinutes">{{ card.durationMinutes }} min</span>
                  <span v-if="card.durationMinutes && card.priceCents !== undefined">•</span>
                  <span v-if="card.priceCents !== undefined">
                    {{ formatMoney(card.priceCents, card.currency || 'USD') }}
                  </span>
                </div>
              </div>
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-text text-white text-sm font-semibold shadow-md">
                {{ idx + 1 }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showContactSection" id="contact" class="sf-container sf-section space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-text">Contact</h2>
        </div>
        <div class="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <div class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Address</div>
                <div class="text-base text-text">{{ contact.address || 'Add your address' }}</div>
              </div>
              <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Phone</div>
                <div class="text-base text-text">{{ contact.phone || '(361) 000-0000' }}</div>
              </div>
              <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Email</div>
                <div class="text-base text-text">{{ contact.email || 'your@email.com' }}</div>
              </div>
              <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Hours</div>
                <div v-if="contactHoursLines.length" class="text-base text-text space-y-1">
                  <div v-for="(line, idx) in contactHoursLines" :key="idx">{{ line }}</div>
                </div>
                <div v-else class="text-base text-text">Set your business hours</div>
              </div>
            </div>
            <div v-if="contactNotes || contactPolicies" class="grid gap-3 lg:grid-cols-2">
              <div v-if="contactNotes" class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Parking / Access</div>
                <div class="text-sm text-text leading-relaxed whitespace-pre-line">
                  {{ contactNotes }}
                </div>
              </div>
              <div v-if="contactPolicies" class="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div class="text-sm uppercase tracking-wide text-muted">Policies</div>
                <div class="text-sm text-text leading-relaxed whitespace-pre-line">
                  {{ contactPolicies }}
                </div>
              </div>
            </div>
            <div
              v-if="mapEmbedSrc"
              class="rounded-xl border border-border bg-surface shadow-sm overflow-hidden"
            >
              <iframe
                :src="mapEmbedSrc"
                class="w-full h-72"
                style="border: 0;"
                allowfullscreen
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div class="text-sm uppercase tracking-wide text-muted">Send us a message</div>
            <form class="mt-2 space-y-3" @submit.prevent="submitLead">
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-sm font-semibold text-text">
                  Name
                  <input v-model="leadForm.name" required class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border focus:outline-none" />
                </label>
                <label class="block text-sm font-semibold text-text">
                  Phone
                  <input v-model="leadForm.phone" inputmode="tel" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border focus:outline-none" placeholder="(555) 123-4567" />
                </label>
              </div>
              <label class="block text-sm font-semibold text-text">
                Email
                <input v-model="leadForm.email" type="email" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border focus:outline-none" placeholder="you@example.com" />
              </label>
              <label class="block text-sm font-semibold text-text">
                Preferred time
                <input v-model="leadForm.preferred_time" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border focus:outline-none" placeholder="e.g. Tomorrow 2-4pm" />
              </label>
              <label class="block text-sm font-semibold text-text">
                Message
                <textarea v-model="leadForm.message" rows="3" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border focus:outline-none" placeholder="Tell us what you need"></textarea>
              </label>
              <input v-model="leadForm.website" class="hidden" aria-hidden="true" />
              <div class="flex items-center gap-3">
                <button :disabled="leadSubmitting" type="submit" class="inline-flex items-center gap-2 rounded-full bg-text px-4 py-2 text-white text-sm font-semibold hover:bg-text/90 disabled:opacity-60">
                  {{ leadSubmitting ? 'Sending…' : 'Send message' }}
                </button>
                <p class="text-sm text-muted" v-if="leadSuccess">Thanks! We received your message.</p>
                <p class="text-sm text-rose-600" v-if="leadError">{{ leadError }}</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section v-if="faqItems.length" class="sf-container sf-section space-y-3">
        <h2 class="text-2xl font-semibold text-text">FAQ</h2>
        <div class="grid gap-3 lg:grid-cols-2">
          <div
            v-for="(item, idx) in faqItems"
            :key="idx"
            class="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-2"
          >
            <div class="text-sm uppercase tracking-wide text-muted">Q{{ idx + 1 }}</div>
            <div class="text-base font-semibold text-text">{{ item.question }}</div>
            <div class="text-sm text-muted leading-relaxed whitespace-pre-line">{{ item.answer }}</div>
          </div>
        </div>
      </section>

      <section v-if="gallery.length" class="sf-container sf-section space-y-3">
        <h2 class="text-2xl font-semibold text-text">Gallery</h2>
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
              class="w-full rounded-xl border border-border object-cover aspect-[4/3]"
              loading="lazy"
              :alt="img.alt || ''"
            />
          </picture>
        </div>
      </section>

      <div v-if="loading" class="sf-container text-sm text-muted">Loading…</div>
      <div v-if="error" class="sf-container text-sm text-rose-600">{{ error }}</div>
    </div>
  </PublicWebsiteLayout>
</template>

<style scoped>
.services-hero {
  background: var(--sf-hero-gradient);
  box-shadow: var(--sf-shadow-overlay, 0 30px 80px rgba(0, 0, 0, 0.25));
  transform: translateZ(0);
}
.services-hero__image img {
  transition: transform 500ms ease, filter 500ms ease;
}
.services-hero:hover .services-hero__image img {
  transform: scale(1.02);
  filter: saturate(1.05);
}
.services-hero__overlay {
  background: linear-gradient(
    110deg,
    color-mix(in srgb, var(--sf-text, #0f172a) 92%, transparent) 0%,
    color-mix(in srgb, var(--sf-text, #0f172a) 75%, transparent) 45%,
    color-mix(in srgb, var(--sf-text, #0f172a) 28%, transparent) 100%
  );
}
.services-hero__frame {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.3);
}
.services-hero__img {
  aspect-ratio: 4 / 3;
  object-fit: cover;
  min-height: 320px;
}

.hero-frame {
  border-radius: 24px;
  overflow: hidden;
}

.hero-slide {
  animation: heroFade 4.2s ease-in-out;
  transform-origin: center;
}
@keyframes heroFade {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(1.02) rotateY(-4deg);
  }
  18% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateY(0deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateY(0deg);
  }
}

.hero-tilt {
  transform: perspective(1200px) rotateY(-6deg) rotateX(2deg);
  transition: transform 400ms ease, box-shadow 400ms ease;
}
.hero-tilt:hover {
  transform: perspective(1200px) rotateY(-2deg) rotateX(0deg) scale(1.01);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.18);
}

.service-tilt {
  transition: transform 220ms ease, box-shadow 220ms ease;
}
.service-tilt:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.12);
}
.services-card-glow {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sf-text, #0f172a) 6%, transparent) 0%,
    color-mix(in srgb, var(--sf-text, #0f172a) 4%, transparent) 100%
  );
  filter: blur(28px);
  pointer-events: none;
}

.home-hero {
  position: relative;
  padding-top: 72px;
  padding-bottom: 72px;
  color: #fff;
  background: linear-gradient(135deg, #0b1220, #101826);
  overflow: hidden;
}
.home-hero--bg {
  background-size: cover;
  background-position: center;
}
.home-hero :deep(.text-text) {
  color: #fff;
}
.home-hero :deep(.text-muted) {
  color: rgba(255, 255, 255, 0.82);
}
.home-hero .hero-frame {
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
}
</style>
