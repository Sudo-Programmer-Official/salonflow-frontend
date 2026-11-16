<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { trackMarketingEvent } from '@/api/marketing';
import { applyMarketingSeo, type MarketingFaq } from '@/utils/marketingSeo';

type ProductFeature = {
  title: string;
  detail: string;
};

type ProductPage = {
  path: string;
  eyebrow: string;
  seoTitle: string;
  title: string;
  description: string;
  intro: string;
  proof: string;
  sectionTitle: string;
  features: ProductFeature[];
  fitTitle: string;
  fitPoints: string[];
  faqs: MarketingFaq[];
};

const productPages: Record<string, ProductPage> = {
  '/salon-management-software': {
    path: '/salon-management-software',
    eyebrow: 'Salon management software',
    seoTitle: 'Salon Management Software for Independent Salons | SalonFlow',
    title: 'Run your salon with one system built to grow bookings.',
    description:
      'SalonFlow is salon management software for independent salons that need a website, online booking, reminders, reviews, loyalty, and growth tools in one place.',
    intro:
      'SalonFlow brings the daily operating work and the customer-growth work together. Give new guests a clear way to find and book you, then keep the follow-up moving after the appointment.',
    proof: 'Website, booking, reminders, reviews, loyalty, and front-desk workflow',
    sectionTitle: 'The core work of running a salon, connected',
    features: [
      {
        title: 'Get discovered and booked',
        detail: 'Use a polished salon website and online booking flow to turn Google searches, social clicks, referrals, and QR codes into appointments.',
      },
      {
        title: 'Reduce no-shows and slow follow-up',
        detail: 'Keep reminders and customer follow-up organized so the front desk spends less time chasing confirmations and missed visits.',
      },
      {
        title: 'Create more repeat visits',
        detail: 'Use review requests, loyalty signals, and customer context to make the next appointment easier to earn.',
      },
      {
        title: 'Keep owner visibility',
        detail: 'See the customer, appointment, staff, billing, and growth workflow in one operating system instead of stitching together separate tools.',
      },
    ],
    fitTitle: 'A practical fit for independent salons',
    fitPoints: [
      'You want a professional website and booking flow without managing several vendors.',
      'Your team needs fewer manual reminders, follow-up tasks, and disconnected customer notes.',
      'You want to improve repeat visits while keeping the setup simple for staff.',
    ],
    faqs: [
      {
        question: 'What does salon management software include?',
        answer:
          'SalonFlow combines a salon website, online booking, reminders, customer management, reviews, loyalty, social scheduling, and a path toward POS rollout in one system.',
      },
      {
        question: 'Is SalonFlow built for independent salons?',
        answer:
          'Yes. SalonFlow is designed around the workflow of independent salons that need more bookings and repeat visits without adding more front-desk complexity.',
      },
      {
        question: 'How does setup work?',
        answer:
          'Setup is included. The launch is organized around your brand, services, staff, booking flow, and the plan that fits your salon.',
      },
    ],
  },
  '/salon-booking-software': {
    path: '/salon-booking-software',
    eyebrow: 'Salon booking software',
    seoTitle: 'Salon Booking Software for More Appointments | SalonFlow',
    title: 'Make it easier for the next guest to book you.',
    description:
      'SalonFlow is salon booking software with a branded website, online appointments, reminders, customer follow-up, and tools that help salons earn repeat visits.',
    intro:
      'A booking link is only the start. SalonFlow connects the page a guest sees, the appointment they choose, the reminder they receive, and the follow-up that brings them back.',
    proof: 'Online appointments, mobile-friendly pages, reminders, follow-up, and repeat-visit support',
    sectionTitle: 'A booking flow that supports the whole visit',
    features: [
      {
        title: 'Book from any important touchpoint',
        detail: 'Give guests a clear path from your website, Google profile, social links, referrals, or a QR code to the appointment they want.',
      },
      {
        title: 'Make the schedule easier to trust',
        detail: 'Present services, pricing, staff, and availability in a cleaner flow that helps a new guest choose without a long message thread.',
      },
      {
        title: 'Keep appointments moving',
        detail: 'Use reminders and follow-up to reduce avoidable no-shows and keep the team informed before and after the visit.',
      },
      {
        title: 'Turn first visits into repeat visits',
        detail: 'Keep customer context, review requests, loyalty, and rebooking support connected to the booking workflow.',
      },
    ],
    fitTitle: 'For salons that have outgrown a booking link',
    fitPoints: [
      'You lose potential guests in DMs, text threads, or a booking page that does not reflect your brand.',
      'No-shows and manual confirmations take time away from the salon floor.',
      'You need booking, customer follow-up, and growth tools to work together.',
    ],
    faqs: [
      {
        question: 'Can SalonFlow handle online salon appointments?',
        answer:
          'Yes. SalonFlow provides online booking through a branded salon website and connects that booking flow with reminders, customer context, and follow-up.',
      },
      {
        question: 'Can guests book from mobile devices?',
        answer:
          'Yes. The marketing site and booking experience are designed for the mobile screens guests commonly use when they discover a salon.',
      },
      {
        question: 'Does SalonFlow only provide booking?',
        answer:
          'No. Booking is connected to reminders, reviews, loyalty, customer management, social scheduling, and a broader salon growth workflow.',
      },
    ],
  },
};

const route = useRoute();
const page = computed(() => productPages[route.path] ?? productPages['/salon-management-software']!);
let lastTrackedPath = '';

const applyPageSeo = () => {
  applyMarketingSeo({
    path: page.value.path,
    title: page.value.seoTitle,
    description: page.value.description,
    faqs: page.value.faqs,
  });

  if (lastTrackedPath === route.fullPath) return;
  lastTrackedPath = route.fullPath;
  void trackMarketingEvent({
    eventType: 'page_view',
    sourcePage: page.value.path.slice(1),
    path: route.fullPath,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    payload: { page: page.value.path },
  });
};

const trackProductCta = (placement: string) => {
  void trackMarketingEvent({
    eventType: 'cta_click',
    sourcePage: page.value.path.slice(1),
    path: route.fullPath,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    payload: { placement, target: '/start' },
  });
};

watch(() => route.path, applyPageSeo, { immediate: true });
</script>

<template>
  <main>
    <section class="bg-[linear-gradient(135deg,#f7f2e9_0%,#ffffff_55%,#e9f5ee_100%)]">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center lg:px-8 lg:py-24">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{{ page.eyebrow }}</div>
          <h1 class="sf-display mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] text-slate-950 sm:text-5xl lg:text-6xl">
            {{ page.title }}
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{{ page.intro }}</p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/start"
              @click="trackProductCta('hero-request-demo')"
              class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Request a demo
            </RouterLink>
            <RouterLink
              to="/contact"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
            >
              Talk with the team
            </RouterLink>
          </div>
        </div>

        <aside class="rounded-[30px] border border-white/80 bg-slate-950 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:p-9">
          <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">Built for salon growth</div>
          <p class="mt-5 text-2xl font-semibold leading-tight">{{ page.proof }}</p>
          <div class="mt-8 space-y-4 text-sm leading-7 text-slate-300">
            <div class="border-t border-white/15 pt-4">Setup included for your salon workflow.</div>
            <div class="border-t border-white/15 pt-4">Start with the plan that fits today and upgrade as you grow.</div>
            <div class="border-t border-white/15 pt-4">See the product before you commit to a long-term contract.</div>
          </div>
        </aside>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="max-w-2xl">
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">What it covers</div>
          <h2 class="sf-display mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{{ page.sectionTitle }}</h2>
        </div>
        <div class="mt-10 grid gap-5 md:grid-cols-2">
          <article
            v-for="(feature, index) in page.features"
            :key="feature.title"
            class="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
          >
            <div class="text-sm font-semibold text-emerald-700">0{{ index + 1 }}</div>
            <h3 class="sf-display mt-4 text-2xl font-semibold text-slate-950">{{ feature.title }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ feature.detail }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="border-t border-slate-200 bg-slate-50">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr,1.2fr] lg:px-8 lg:py-20">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Is it a fit?</div>
          <h2 class="sf-display mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{{ page.fitTitle }}</h2>
          <p class="mt-5 text-base leading-8 text-slate-600">
            SalonFlow is designed to make the path from first impression to booked appointment and repeat visit easier to manage.
          </p>
        </div>
        <ul class="space-y-4">
          <li v-for="point in page.fitPoints" :key="point" class="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
            <span class="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">✓</span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="text-center">
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Questions owners ask</div>
          <h2 class="sf-display mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">Clear answers before you book a demo.</h2>
        </div>
        <div class="mt-10 space-y-4">
          <article v-for="faq in page.faqs" :key="faq.question" class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 class="text-base font-semibold leading-7 text-slate-950">{{ faq.question }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ faq.answer }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-slate-950 text-white">
      <div class="mx-auto flex max-w-5xl flex-col items-start justify-between gap-7 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <h2 class="sf-display text-3xl font-semibold leading-tight sm:text-4xl">See what SalonFlow could look like for your salon.</h2>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Tell us where bookings, follow-up, or front-desk work is getting stuck. We will show you the right path.</p>
        </div>
        <RouterLink to="/start" @click="trackProductCta('bottom-request-demo')" class="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Request a demo
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sf-display {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
}
</style>
