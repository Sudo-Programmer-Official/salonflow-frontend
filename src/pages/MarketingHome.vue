<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import LeadAssistant from '../components/marketing/LeadAssistant.vue';
import { trackMarketingEvent } from '@/api/marketing';

const route = useRoute();
const assistantSection = ref<HTMLElement | null>(null);
const firstWeekSection = ref<HTMLElement | null>(null);
const firstWeekPulse = ref(false);
const leadAssistant = ref<InstanceType<typeof LeadAssistant> | null>(null);

const trackHomeEvent = (eventType: 'page_view' | 'cta_click' | 'request_start', payload: Record<string, any> = {}) =>
  trackMarketingEvent({
    eventType,
    sourcePage: 'marketing-home',
    path: route.fullPath,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    payload,
  });

const jumpToAssistant = () => {
  void trackHomeEvent('cta_click', { placement: 'hero-see-demo-flow', target: '#assistant' });
  assistantSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  leadAssistant.value?.openFullscreen();
};

const jumpToFirstWeek = () => {
  void trackHomeEvent('cta_click', { placement: 'hero-see-first-week', target: '#first-week' });
  firstWeekSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  firstWeekPulse.value = true;
  window.setTimeout(() => {
    firstWeekPulse.value = false;
  }, 1400);
};

const handleDemoRequestClick = (placement: string) => {
  void trackHomeEvent('cta_click', { placement, target: '/start' });
};

const openDemoFromRoute = async () => {
  if (route.query.demo !== '1') return;
  await nextTick();
  jumpToAssistant();
};

onMounted(() => {
  void trackHomeEvent('page_view', { page: 'home' });
  void openDemoFromRoute();
});

watch(() => route.query.demo, openDemoFromRoute);

const outcomeStats = [
  { value: 'More bookings', label: 'Turn more website visits and referrals into real appointments' },
  { value: 'Fewer no-shows', label: 'Keep the schedule fuller with reminders and follow-up' },
  { value: 'Less admin work', label: 'Spend less time chasing leads and setting up tools' },
];

const featureSystems = [
  {
    icon: 'booking',
    title: 'Booking & Website',
    desc: 'Turn discovery into a polished first impression and a booking flow that feels easy to trust.',
    bullets: [
      'Modern website built around your salon brand',
      'Online booking and QR check-in in one flow',
      'Mobile-friendly first impression for new guests',
    ],
  },
  {
    icon: 'reminders',
    title: 'Customer Reminders',
    desc: 'Keep appointments moving and reduce no-shows with timely follow-up that feels organized.',
    bullets: [
      'Automated reminders before appointments',
      'Cleaner follow-up after missed or completed visits',
      'Less manual chasing from the front desk',
    ],
  },
  {
    icon: 'customers',
    title: 'Customer Management',
    desc: 'Keep client context, history, and communication inside one operating system instead of scattered tools.',
    bullets: [
      'Client details and visit context in one place',
      'Better owner visibility across staff and guests',
      'Cleaner follow-up and retention workflow',
    ],
  },
  {
    icon: 'pos',
    title: 'POS & Billing',
    desc: 'Bring checkout, billing visibility, and front-desk structure into the same business workflow.',
    bullets: [
      'Billing and checkout flow built for salon operations',
      'Front-desk visibility without extra vendor sprawl',
      'Stronger control when the salon is ready for more',
    ],
    badge: 'Included in Complete plan',
  },
  {
    icon: 'social',
    title: 'Social Media Engine',
    desc: 'Keep promotions active, schedule content, and stay visible without adding another marketing tool.',
    bullets: [
      'Schedule posts and keep content moving',
      'Support promotions that feed bookings',
      'A more consistent brand presence online',
    ],
  },
  {
    icon: 'growth',
    title: 'Reviews & Growth',
    desc: 'Bring guests back more often with feedback loops, loyalty signals, and smarter growth visibility.',
    bullets: [
      'Review requests and repeat-visit support',
      'Loyalty and retention flow that feels intentional',
      'More clarity on what drives salon growth',
    ],
  },
];

const spotlightCards = [
  {
    title: 'More bookings from the same traffic',
    desc: 'Turn Instagram clicks, Google searches, and referrals into clean booking experiences instead of lost DMs.',
    image: '/images/landing/marketing-feature-growth.jpg',
  },
  {
    title: 'Less chaos at the front desk',
    desc: 'Keep appointments, walk-ins, reminders, and follow-up in one operating system built around the salon floor.',
    image: '/images/landing/marketing-feature-operations.jpg',
  },
  {
    title: 'Marketing that stays active',
    desc: 'Plan promos, publish updates, and keep your website fresh without hiring a separate marketing team.',
    image: '/images/landing/marketing-feature-social.jpg',
  },
];

const offeringHighlights = [
  { label: 'Website + booking', className: 'offering-pill--sky' },
  { label: 'Social media scheduling', className: 'offering-pill--violet' },
  { label: 'SMS reminders', className: 'offering-pill--amber' },
  { label: 'Loyalty + reviews', className: 'offering-pill--emerald' },
  { label: 'Owner visibility', className: 'offering-pill--rose' },
  { label: 'POS rollout', className: 'offering-pill--indigo' },
  { label: 'Done-for-you setup', className: 'offering-pill--teal' },
];

const comparisonRows = [
  {
    label: 'Website',
    other: 'Square / Booksy: booking-first, website secondary',
    salonFlow: 'SalonFlow: the website is part of the sales system, not an afterthought',
  },
  {
    label: 'CRM + follow-up',
    other: 'GlossGenius: light follow-up, limited owner visibility',
    salonFlow: 'SalonFlow: customer context, reminders, and repeat-visit workflow in one place',
  },
  {
    label: 'Growth tools',
    other: 'Most booking apps: reviews and marketing are add-ons',
    salonFlow: 'SalonFlow: reminders, reviews, social, loyalty, and follow-up work together',
  },
  {
    label: 'POS rollout',
    other: 'Often separate and disconnected from the booking stack',
    salonFlow: 'Built to roll forward into the same salon operating system',
  },
];

const firstWeekSteps = [
  {
    day: 'Day 1',
    title: 'We set up your salon',
    detail: 'Your branding, logo, colors, photos, and contact information are added to a working website.',
  },
  {
    day: 'Day 2',
    title: 'We import your business',
    detail: 'Services, pricing, staff, customers, and business settings are brought into the new setup where possible.',
  },
  {
    day: 'Day 3',
    title: 'Everything is connected',
    detail: 'SMS reminders, booking links, QR check-in, and email notifications are configured and tested.',
  },
  {
    day: 'Day 5',
    title: 'Staff training',
    detail: 'We walk your team through the workflow, verify the setup, and fine-tune anything that needs adjustment.',
  },
  {
    day: 'Day 7',
    title: 'You’re fully live',
    detail: 'Customers can book online, history is available, and your old process has been replaced with a smoother one.',
  },
];

const featuredClient = {
  name: 'MTV Nails',
  location: 'Corpus Christi, TX',
  website: 'https://www.mtvnailcorpuschristi.com/',
  websiteLabel: 'www.mtvnailcorpuschristi.com',
};

const clientTrustSignals = [
  {
    label: 'Live website',
    value: 'Public proof',
    detail: 'Inspect a real client site instead of guessing from screenshots.',
  },
  {
    label: 'Real salon',
    value: 'Corpus Christi',
    detail: 'A working salon in market, not a fake demo brand.',
  },
  {
    label: 'Product feedback',
    value: 'Owner-shaped',
    detail: 'Launch decisions are shaped by real salon workflow.',
  },
];

const clientBeliefPoints = [
  'This is a live customer website, not a placeholder concept.',
  'The presentation is designed to look strong on the screens salon owners and guests actually use.',
  'One real client in market creates more trust than a wall of invented logos.',
];

const clientProofCards = [
  {
    label: 'Proof point',
    title: 'Live public site',
    detail: 'A real business already trusts SalonFlow in public.',
  },
  {
    label: 'Experience',
    title: 'Desktop + mobile ready',
    detail: 'The website presentation holds up on the screens guests use most.',
  },
];

const whoIsItForCards = [
  {
    title: 'Nail salons',
    detail: 'The flagship demo with bookings, loyalty, reminders, and a polished first impression.',
  },
  {
    title: 'Hair salons',
    detail: 'Best for color, styling, rebooking, and owner visibility across a busier schedule.',
  },
  {
    title: 'Barbers',
    detail: 'Built for fast booking, chair turnover, and a clean customer experience.',
  },
  {
    title: 'Beauty studios',
    detail: 'Perfect for brows, lashes, PMU, and specialty services that need clarity.',
  },
  {
    title: 'Day spas',
    detail: 'Designed for massages, facials, waxing, packages, and gift cards.',
  },
];

const demoTemplateCards = [
  {
    title: 'Nail Salon',
    eyebrow: 'Flagship demo',
    stats: ['200+ customers', '3-5 staff', 'Website + POS'],
    detail: 'The most important demo tenant for salons that need the fullest proof story.',
  },
  {
    title: 'Hair Salon',
    eyebrow: 'High-volume booking',
    stats: ['Haircuts', 'Color', 'Balayage'],
    detail: 'Shows a different service mix, branding, and appointment rhythm.',
  },
  {
    title: 'Spa',
    eyebrow: 'Packages + gift cards',
    stats: ['Massage', 'Facial', 'Waxing'],
    detail: 'Helps prospects see how SalonFlow handles longer services and packages.',
  },
  {
    title: 'Beauty Studio',
    eyebrow: 'Specialty services',
    stats: ['Brows', 'Lashes', 'PMU'],
    detail: 'Built for focused service menus and premium personal-brand experiences.',
  },
];

const pricingPlans = [
  {
    title: 'Core',
    price: '$65',
    description: 'For salon owners who want a polished website, fast booking, and less front-desk friction.',
    features: [
      'Website + online booking',
      'QR check-in and cleaner first impression',
      'Basic SMS reminders and follow-up',
      'Customer capture in one place',
      'Done-for-you setup included',
    ],
    ctaLabel: 'Start Free',
    badge: null,
    cardClass: 'pricing-card',
    buttonClass: 'pricing-button pricing-button--base',
    priceNote: 'Launch fast without stitching together separate tools.',
  },
  {
    title: 'Growth',
    price: '$99',
    description: 'For salons ready to drive repeat visits, stay consistent, and turn more attention into bookings.',
    features: [
      'Everything in Core',
      'Reviews, loyalty, and repeat-visit flow',
      'Social media scheduling and posting support',
      'Owner visibility into bookings and follow-up',
      'Growth-focused setup and launch guidance',
    ],
    ctaLabel: 'Start Growing',
    badge: 'Most Popular',
    cardClass: 'pricing-card pricing-card--popular',
    buttonClass: 'pricing-button pricing-button--popular',
    priceNote: 'The best fit for most salons that want growth, not just software.',
  },
  {
    title: 'Complete',
    price: '$129',
    description: 'For salons that want the strongest all-in-one operating layer with more control, visibility, and support.',
    features: [
      'Everything in Growth',
      'POS rollout visibility and front-desk structure',
      'Deeper owner control across the workflow',
      'Priority support for launch and optimization',
      'Best-value path for a fully unified setup',
    ],
    ctaLabel: 'Get Everything',
    badge: 'Best Value',
    cardClass: 'pricing-card pricing-card--value',
    buttonClass: 'pricing-button pricing-button--value',
    priceNote: 'The clearest value if you want the full SalonFlow operating system.',
  },
];

const faqItems = [
  {
    question: 'What exactly does SalonFlow do for my salon?',
    answer:
      'SalonFlow brings your website, online booking, QR check-in, SMS reminders, customer capture, reviews, loyalty, social scheduling, and POS rollout into one operating system. The goal is less tool-hopping and a cleaner path from first click to repeat visit.',
  },
  {
    question: 'Is setup really included, or do I have to build everything myself?',
    answer:
      'Setup is included. We help organize the launch around your salon, your services, your booking flow, and the plan you choose so you are not left stitching together software on your own.',
  },
  {
    question: 'Do I need to sign a long contract?',
    answer:
      'No. SalonFlow is built so you can start simple, prove the value, and upgrade when your salon needs more follow-up, visibility, or POS structure.',
  },
  {
    question: 'Which plan should I choose?',
    answer:
      'Core is best if you need a polished website and booking flow. Growth is the strongest fit for most salons that want reviews, loyalty, social scheduling, and repeat-visit support. Complete is for salons that want the fullest operating layer with POS rollout visibility and priority support.',
  },
  {
    question: 'Can SalonFlow replace the tools I already use?',
    answer:
      'In many cases, yes, but we do not force a messy switch on day one. During the demo, we look at what you use now, what is working, and where SalonFlow can remove friction without disrupting your team.',
  },
  {
    question: 'How does this help me get more customers?',
    answer:
      'SalonFlow focuses on the moments that usually leak revenue: weak first impressions, lost DMs, slow follow-up, missed reminders, inconsistent reviews, and no clear repeat-visit system. The product is designed to turn more attention into booked and returning guests.',
  },
  {
    question: 'Is SalonFlow only for large salons?',
    answer:
      'No. It works for salons that want a cleaner foundation now and room to grow later. Smaller salons can start with Core, while busier teams can move into Growth or Complete as operations become more complex.',
  },
  {
    question: 'Can I see a real example before trusting it?',
    answer:
      'Yes. MTV Nails in Corpus Christi is already live on SalonFlow, so you can inspect a real customer website instead of relying only on mockups or screenshots.',
  },
];
</script>

<template>
  <div class="marketing-page bg-[linear-gradient(180deg,#f8f5ef_0%,#fffdf9_34%,#f4f7f4_100%)] text-slate-900">
    <section class="relative overflow-hidden border-b border-black/5">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute left-[-4rem] top-12 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl" />
        <div class="absolute right-[-4rem] top-20 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
        <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" />
      </div>

      <div class="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-12 lg:grid-cols-[1.02fr,0.98fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
              Built with real salons in Corpus Christi
            </div>

            <h1 class="sf-display mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl">
              Get more customers, bookings, and repeat visits without hiring more staff.
            </h1>

            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              SalonFlow runs your website, bookings, reminders, customer follow-up, and growth workflow in one system
              built for salons. No contract. Setup included.
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <RouterLink
                to="/start"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                @click="handleDemoRequestClick('hero-request-demo')"
              >
                Request My Demo
              </RouterLink>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/75 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                @click="jumpToFirstWeek"
              >
                See Your First Week →
              </button>
            </div>

            <p class="mt-4 text-sm font-medium text-slate-500">
              Takes about 60 seconds • Setup included • No credit card
            </p>

            <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">Setup included</span>
              <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">Personalized demo</span>
              <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">No long-term contract</span>
            </div>

            <div class="mt-8 grid gap-4 sm:grid-cols-3">
              <div
                v-for="stat in outcomeStats"
                :key="stat.value"
                class="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-sm backdrop-blur"
              >
                <div class="sf-display text-2xl font-semibold text-slate-950">{{ stat.value }}</div>
                <div class="mt-2 text-sm leading-6 text-slate-600">{{ stat.label }}</div>
              </div>
            </div>
          </div>

          <div class="relative">
            <div class="hero-media-card relative overflow-hidden rounded-[34px] border border-white/70 bg-slate-950 p-3 shadow-[0_28px_100px_rgba(15,23,42,0.22)]">
              <img
                src="/images/landing/marketing-hero.jpg"
                alt="SalonFlow hero"
                class="h-[520px] w-full rounded-[28px] object-cover"
              />
              <div class="absolute inset-3 rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.66))]" />
              <div class="absolute inset-x-10 bottom-10 rounded-[26px] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
                  SalonFlow Positioning
                </div>
                <div class="sf-display mt-3 text-2xl font-semibold leading-tight">
                  All-in-one salon growth system
                </div>
                <p class="mt-3 max-w-md text-sm leading-6 text-white/78">
                  Website, bookings, reminders, client retention, and POS rollout under one product built with salons.
                </p>
              </div>
            </div>

            <div class="hero-plan-card ml-4 mt-5 max-w-[280px] rounded-[28px] p-5 text-white">
              <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">Founding plan</div>
              <div class="hero-plan-card__price mt-3 sf-display text-4xl font-semibold">
                $65<span class="hero-plan-card__unit ml-1 text-lg">/mo</span>
              </div>
              <p class="hero-plan-card__copy mt-3 text-sm leading-6">
                Less than the cost of one extra appointment a week for most salons.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>

    <section class="offering-marquee-section border-b border-black/5">
      <div class="offering-marquee-fade relative overflow-hidden py-6">
        <div class="offering-marquee-track flex w-max items-center gap-4">
          <div
            v-for="repeat in 2"
            :key="repeat"
            class="flex items-center gap-4"
            :aria-hidden="repeat === 2"
          >
            <span
              v-for="item in offeringHighlights"
              :key="`${repeat}-${item.label}`"
              class="offering-pill inline-flex items-center rounded-full px-6 py-3 text-base font-bold shadow-sm sm:px-7 sm:py-3.5 sm:text-lg"
              :class="item.className"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-black/5 bg-white/78">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-18">
        <div class="grid gap-10 lg:grid-cols-[0.78fr,1.22fr] lg:items-start">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Who it is for</div>
            <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Built for the salon businesses that need a clearer path from inquiry to repeat visit.
            </h2>
            <p class="mt-5 text-base leading-8 text-slate-600">
              Salon owners should be able to see themselves in the product within seconds. This section makes the fit explicit before they ever reach pricing.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="card in whoIsItForCards"
              :key="card.title"
              class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
            >
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-700/80">Salon type</div>
              <h3 class="sf-display mt-3 text-xl font-semibold text-slate-950">{{ card.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{{ card.detail }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-black/5 bg-white/72">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="mx-auto max-w-3xl text-center">
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">What you get</div>
          <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Everything working together for your salon
          </h2>
          <p class="mt-4 text-lg leading-8 text-slate-600">
            Run and grow your salon in one place
          </p>
        </div>

        <div class="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in featureSystems"
            :key="item.title"
            class="feature-system-card rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm">
                <svg
                  v-if="item.icon === 'booking'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18" />
                </svg>
                <svg
                  v-else-if="item.icon === 'reminders'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
                <svg
                  v-else-if="item.icon === 'customers'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="3.5" />
                  <path d="M18 8a3 3 0 0 1 0 6" />
                  <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
                <svg
                  v-else-if="item.icon === 'pos'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="4" y="4" width="16" height="12" rx="2.5" />
                  <path d="M8 20h8" />
                  <path d="M10 16v4" />
                  <path d="M14 16v4" />
                </svg>
                <svg
                  v-else-if="item.icon === 'social'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M18 8a3 3 0 0 0-6 0v8a3 3 0 0 1-6 0" />
                  <path d="M18 8v8" />
                  <path d="M12 12h6" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 20V10" />
                  <path d="M7 15l5-5 5 5" />
                  <path d="M5 4h14" />
                </svg>
              </div>

              <span
                v-if="item.badge"
                class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800"
              >
                {{ item.badge }}
              </span>
            </div>

            <h3 class="sf-display mt-5 text-2xl font-semibold text-slate-950">{{ item.title }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ item.desc }}</p>

            <ul class="mt-5 space-y-3">
              <li
                v-for="point in item.bullets"
                :key="point"
                class="flex items-start gap-3 text-sm leading-6 text-slate-700"
              >
                <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="border-y border-black/5 bg-[#101b17] text-white">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="max-w-3xl">
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Outcome over features</div>
          <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Most salon tools stop at booking. SalonFlow is built to grow the business.
          </h2>
        </div>

        <div class="mt-10 grid gap-6 lg:grid-cols-3">
          <article
            v-for="card in spotlightCards"
            :key="card.title"
            class="overflow-hidden rounded-[30px] border border-white/10 bg-white/6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
          >
            <div class="relative h-64 overflow-hidden">
              <img :src="card.image" :alt="card.title" class="h-full w-full object-cover transition duration-500 hover:scale-105" />
              <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.62))]" />
            </div>
            <div class="p-6">
              <h3 class="sf-display text-2xl font-semibold text-white">{{ card.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-white/76">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Comparison table</div>
          <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            SalonFlow vs typical booking apps
          </h2>
          <p class="mt-5 text-base leading-8 text-slate-600">
            This side-by-side view makes the difference obvious: website, follow-up, growth, and POS rollout are built into one operating system instead of spread across separate tools.
          </p>

          <div class="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <img
              src="/images/landing/marketing-proof.jpg"
              alt="SalonFlow proof"
              class="h-[360px] w-full object-cover"
            />
          </div>
        </div>

        <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div class="grid grid-cols-[1.1fr,1fr,1fr] border-b border-slate-200 bg-slate-50/80 px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <div>Category</div>
            <div>Typical tool</div>
            <div>SalonFlow</div>
          </div>
          <div
            v-for="row in comparisonRows"
            :key="row.label"
            class="grid grid-cols-1 gap-3 border-b border-slate-200 px-6 py-5 last:border-b-0 md:grid-cols-[1.1fr,1fr,1fr]"
          >
            <div class="text-sm font-semibold text-slate-900">{{ row.label }}</div>
            <div class="text-sm leading-7 text-slate-500">{{ row.other }}</div>
            <div class="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900">{{ row.salonFlow }}</div>
          </div>
        </div>
      </div>
    </section>

    <section ref="firstWeekSection" class="border-b border-black/5 bg-white/76" :class="{ 'first-week-pulse': firstWeekPulse }">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-[0.82fr,1.18fr] lg:items-start">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">First week</div>
            <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Here’s what happens after you sign up
            </h2>
            <p class="mt-5 text-base leading-8 text-slate-600">
              This is the part that removes uncertainty. Owners can picture the launch plan before they say yes and see that SalonFlow is an upgrade, not just another login.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="step in firstWeekSteps"
              :key="step.day"
              class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
            >
              <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700/80">{{ step.day }}</div>
              <h3 class="sf-display mt-3 text-xl font-semibold text-slate-950">{{ step.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{{ step.detail }}</p>
            </article>
          </div>
        </div>

        <div class="mt-8 rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-slate-800 shadow-sm">
          <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">You’re live</div>
          <p class="mt-2 text-sm leading-7">
            We don’t just hand over software. We help migrate your salon so the transition is smooth, your customers stay connected, and your team launches with a working setup.
          </p>
        </div>
      </div>
    </section>

    <section class="relative overflow-hidden border-y border-black/5 bg-[linear-gradient(180deg,#eef6f2_0%,#fffdf9_38%,#f5f1e8_100%)]">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute left-[-5rem] top-12 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
        <div class="absolute right-[-4rem] bottom-0 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-12 xl:grid-cols-[0.82fr,1.18fr] xl:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600 shadow-sm">
              First customer spotlight
            </div>

            <div class="mt-6 flex items-center gap-3">
              <div class="flex items-center gap-1 text-amber-400">
                <svg
                  v-for="star in 5"
                  :key="star"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 0 0 .95-.69z"
                  />
                </svg>
              </div>
              <div class="text-sm font-medium text-slate-600">
                Designed to create five-star trust from the first click.
              </div>
            </div>

            <h2 class="sf-display mt-5 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              {{ featuredClient.name }} is already live on SalonFlow.
            </h2>

            <p class="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              This is stronger than a generic testimonial. Salon owners can inspect a real client website, see that SalonFlow is already in market,
              and feel the difference between a concept product and software shaped with an actual salon.
            </p>

            <div class="mt-8 grid gap-3 sm:grid-cols-3">
              <div
                v-for="signal in clientTrustSignals"
                :key="signal.label"
                class="rounded-[24px] border border-white/80 bg-white/88 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {{ signal.label }}
                </div>
                <div class="sf-display mt-2 text-xl font-semibold text-slate-950">{{ signal.value }}</div>
                <p class="mt-2 text-xs leading-5 text-slate-600">{{ signal.detail }}</p>
              </div>
            </div>

            <div class="mt-6 rounded-[28px] border border-slate-900/6 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200/75">Why owners believe it</div>
              <div class="mt-3 space-y-2.5">
                <div
                  v-for="point in clientBeliefPoints"
                  :key="point"
                  class="flex items-start gap-3"
                >
                  <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <p class="text-sm leading-6 text-white/78">{{ point }}</p>
                </div>
              </div>
            </div>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                :href="featuredClient.website"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                @click="handleDemoRequestClick('client-proof-cta')"
              >
                Visit MTV Nails Website
              </a>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/75 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                @click="jumpToAssistant"
              >
                Get My SalonFlow Plan
              </button>
            </div>
          </div>

          <div class="relative min-h-[720px] lg:min-h-[820px]">
            <div class="client-billboard-card rounded-[40px] border border-white/80 bg-white/70 p-4 shadow-[0_34px_110px_rgba(15,23,42,0.16)] backdrop-blur">
              <div class="overflow-hidden rounded-[36px] border border-slate-200/80 bg-[#0c1528] shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
                <div class="flex items-center gap-3 border-b border-white/10 bg-slate-950/92 px-4 py-3 text-white sm:px-5">
                  <div class="flex items-center gap-2">
                    <span class="h-3 w-3 rounded-full bg-rose-400" />
                    <span class="h-3 w-3 rounded-full bg-amber-300" />
                    <span class="h-3 w-3 rounded-full bg-emerald-300" />
                  </div>
                  <div class="hidden flex-1 items-center justify-center sm:flex">
                    <div class="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-medium tracking-[0.08em] text-white/70">
                      {{ featuredClient.websiteLabel }}
                    </div>
                  </div>
                  <a
                    :href="featuredClient.website"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                  >
                    Live site
                  </a>
                </div>

                <div class="grid lg:grid-cols-[1.08fr,0.92fr]">
                  <div class="relative min-h-[560px] overflow-hidden">
                    <img
                      src="/images/landing/marketing-proof.jpg"
                      :alt="`${featuredClient.name} client spotlight`"
                      class="h-full w-full object-cover"
                    />
                    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,21,40,0.12),rgba(12,21,40,0.74))]" />

                    <div class="absolute left-5 top-5 rounded-[22px] border border-white/35 bg-white/90 px-4 py-3 text-slate-900 shadow-lg backdrop-blur sm:left-6 sm:top-6">
                      <div class="flex items-center gap-1 text-amber-400">
                        <svg
                          v-for="star in 5"
                          :key="`proof-star-${star}`"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 0 0 .95-.69z"
                          />
                        </svg>
                      </div>
                      <div class="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Five-star first impression
                      </div>
                    </div>

                    <div class="absolute inset-x-5 bottom-5 rounded-[28px] border border-white/15 bg-slate-950/72 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-6">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                        First customer spotlight
                      </div>
                      <div class="sf-display mt-3 text-3xl font-semibold leading-tight">
                        {{ featuredClient.name }}
                      </div>
                      <p class="mt-2 text-sm leading-6 text-white/76">
                        A live client website in {{ featuredClient.location }} that gives SalonFlow real market proof instead of placeholder branding.
                      </p>
                      <div class="mt-4 flex flex-wrap gap-2">
                        <span class="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">
                          Live website
                        </span>
                        <span class="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">
                          Real salon
                        </span>
                        <span class="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">
                          In-market proof
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-4 sm:p-5">
                    <div class="rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">What this proves</div>
                      <div class="mt-4 grid gap-3">
                        <div
                          v-for="card in clientProofCards"
                          :key="card.title"
                          class="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3"
                        >
                          <div class="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">{{ card.label }}</div>
                          <div class="mt-1.5 font-['Space_Grotesk'] text-lg font-semibold text-slate-950">{{ card.title }}</div>
                          <p class="mt-2 text-sm leading-6 text-slate-600">{{ card.detail }}</p>
                        </div>
                      </div>
                    </div>

                    <div class="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Billboard value</div>
                      <div class="mt-2 font-['Space_Grotesk'] text-xl font-semibold text-slate-950">
                        Owners trust what they can verify.
                      </div>
                      <p class="mt-2 text-sm leading-6 text-slate-700">
                        A public client website reduces doubt fast. It shows SalonFlow is already being used by a real salon and that the brand experience can feel premium from day one.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section ref="assistantSection" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="space-y-10">
        <div class="grid gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Request a tailored demo</div>
            <h2 class="sf-display mt-3 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Let serious leads ask for the right demo without a generic contact form.
            </h2>
            <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              The request flow should qualify the salon, collect the useful context, and create a clean handoff for the admin team before anyone reaches pricing.
            </p>
          </div>

          <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <img
              src="/images/landing/marketing-assistant.jpg"
              alt="SalonFlow lead assistant"
              class="h-[360px] w-full object-cover object-center"
            />
          </div>
        </div>

        <LeadAssistant
          ref="leadAssistant"
          source="marketing-home-assistant"
          title="See how SalonFlow fits your salon in one guided conversation"
          subtitle="Tell us your salon type, team size, current software, and contact details. We capture the request quickly and save progress automatically."
          cta-label="Request Demo"
        />
      </div>
    </section>

    <section class="border-t border-black/5 bg-[linear-gradient(180deg,#fffdf9_0%,#eef6f1_100%)]">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="mx-auto max-w-3xl text-center">
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600 shadow-sm">
            Pricing built to feel clear
          </div>
          <h2 class="sf-display mt-5 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Choose the plan that matches where your salon is growing next.
          </h2>
          <p class="mt-4 text-base leading-8 text-slate-600">
            The pricing should feel like an upgrade path, not a puzzle. Start with the level that fits today, then move up as the salon needs more follow-up, visibility, and growth support.
          </p>
        </div>

        <div class="mt-10 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          <article
            v-for="plan in pricingPlans"
            :key="plan.title"
            :class="plan.cardClass"
          >
            <div class="flex min-h-[32px] items-center justify-between gap-3">
              <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {{ plan.title }}
              </div>
              <span
                v-if="plan.badge"
                class="pricing-badge"
              >
                {{ plan.badge }}
              </span>
            </div>

            <div class="mt-5">
              <div class="sf-display text-5xl font-semibold text-slate-950">
                {{ plan.price }}<span class="ml-1 text-xl font-medium text-slate-400">/month</span>
              </div>
              <p class="mt-4 text-sm leading-7 text-slate-600">{{ plan.description }}</p>
              <p class="mt-3 text-sm font-medium text-slate-500">{{ plan.priceNote }}</p>
            </div>

            <div class="mt-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <ul class="mt-7 space-y-3">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-3 text-sm leading-7 text-slate-700"
              >
                <span class="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      fill-rule="evenodd"
                      d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.312a1 1 0 0 1-1.42.004L3.29 9.27a1 1 0 0 1 1.42-1.408l4.04 4.07 6.54-6.596a1 1 0 0 1 1.414-.006Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>
                <span>{{ feature }}</span>
              </li>
            </ul>

            <button
              type="button"
              :class="plan.buttonClass"
              @click="jumpToAssistant"
            >
              {{ plan.ctaLabel }}
            </button>
          </article>
        </div>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
          <span class="rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">Setup included</span>
          <span class="rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">No contract</span>
          <span class="rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">Upgrade anytime</span>
        </div>

        <p class="mt-6 text-center text-sm font-medium text-slate-500">
          Start simple. Upgrade anytime as your salon grows.
        </p>
        <p class="mt-2 text-center text-sm text-slate-400">
          Need help choosing? We will recommend the right plan during your demo conversation.
        </p>
      </div>
    </section>

    <section class="border-t border-black/5 bg-[linear-gradient(180deg,#eef6f1_0%,#ffffff_100%)]">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-10 xl:grid-cols-[0.85fr,1.15fr] xl:items-start">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Try the software before buying</div>
            <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              See SalonFlow running with real customers, appointments, POS, marketing, and reminders.
            </h2>
            <p class="mt-5 text-base leading-8 text-slate-600">
              The goal is to make the demo feel familiar on the first visit. We match the request to the best demo tenant and then route the owner to the experience that fits them best.
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <RouterLink
                to="/start"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Request Demo
              </RouterLink>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/75 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                @click="jumpToAssistant"
              >
                Qualify my salon
              </button>
            </div>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <article
              v-for="card in demoTemplateCards"
              :key="card.title"
              class="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            >
              <div class="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-700/80">
                {{ card.eyebrow }}
              </div>
              <h3 class="sf-display mt-3 text-2xl font-semibold text-slate-950">{{ card.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{{ card.detail }}</p>
              <div class="mt-5 flex flex-wrap gap-2">
                <span
                  v-for="stat in card.stats"
                  :key="stat"
                  class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  {{ stat }}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-black/5 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-[0.78fr,1.22fr] lg:items-start">
          <div class="lg:sticky lg:top-8">
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600">
              Questions owners ask
            </div>
            <h2 class="sf-display mt-5 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Clear answers before you book a demo.
            </h2>
            <p class="mt-5 text-base leading-8 text-slate-600">
              Salon owners should know what they are buying, how setup works, and why the system can earn trust before a sales call starts.
            </p>
            <button
              type="button"
              class="mt-7 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              @click="jumpToAssistant"
            >
              Ask About My Salon
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article
              v-for="item in faqItems"
              :key="item.question"
              class="faq-card rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
            >
              <div class="flex items-start gap-4">
                <span class="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                  ?
                </span>
                <div>
                  <h3 class="text-base font-semibold leading-7 text-slate-950">{{ item.question }}</h3>
                  <p class="mt-3 text-sm leading-7 text-slate-600">{{ item.answer }}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sf-display {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
}

.hero-media-card {
  transform: perspective(1600px) rotateY(-5deg) rotateX(1.8deg);
  transform-style: preserve-3d;
}

.hero-plan-card {
  background: linear-gradient(180deg, rgba(9, 14, 28, 0.94), rgba(22, 31, 54, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(18px);
}

.hero-plan-card__price {
  color: #ffffff;
  text-shadow: 0 2px 16px rgba(15, 23, 42, 0.22);
}

.hero-plan-card__unit {
  color: rgba(255, 255, 255, 0.84);
}

.hero-plan-card__copy {
  color: rgba(255, 255, 255, 0.9);
}

.offering-marquee-section {
  background:
    radial-gradient(circle at 12% 20%, rgba(56, 189, 248, 0.18), transparent 30%),
    radial-gradient(circle at 82% 30%, rgba(244, 114, 182, 0.14), transparent 28%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9), rgba(255, 251, 235, 0.9));
}

.offering-marquee-fade::before,
.offering-marquee-fade::after {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 10;
  width: min(14vw, 160px);
  content: '';
  pointer-events: none;
}

.offering-marquee-fade::before {
  left: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.98), transparent);
}

.offering-marquee-fade::after {
  right: 0;
  background: linear-gradient(270deg, rgba(255, 251, 235, 0.96), transparent);
}

.offering-marquee-track {
  animation: offering-marquee 28s linear infinite;
}

.offering-marquee-section:hover .offering-marquee-track {
  animation-play-state: paused;
}

.offering-pill {
  min-width: max-content;
  border: 1px solid rgba(255, 255, 255, 0.84);
  letter-spacing: 0;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
}

.offering-pill--sky {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #075985;
}

.offering-pill--violet {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  color: #5b21b6;
}

.offering-pill--amber {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.offering-pill--emerald {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.offering-pill--rose {
  background: linear-gradient(135deg, #ffe4e6, #fecdd3);
  color: #9f1239;
}

.offering-pill--indigo {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  color: #3730a3;
}

.offering-pill--teal {
  background: linear-gradient(135deg, #ccfbf1, #99f6e4);
  color: #115e59;
}

.feature-system-card {
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.feature-system-card:hover {
  transform: translateY(-4px);
  border-color: rgba(203, 213, 225, 0.95);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
}

.pricing-card {
  display: flex;
  flex-direction: column;
  border-radius: 32px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  padding: 28px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

.pricing-card--popular {
  position: relative;
  border-color: rgba(52, 211, 153, 0.42);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(236, 253, 245, 0.88));
  box-shadow: 0 28px 80px rgba(16, 185, 129, 0.16);
}

.pricing-card--value {
  position: relative;
  border-color: rgba(251, 191, 36, 0.38);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 251, 235, 0.94));
  box-shadow: 0 28px 80px rgba(245, 158, 11, 0.14);
}

.pricing-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(16, 185, 129, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(236, 253, 245, 0.94));
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #047857;
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.12);
}

.pricing-button {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 700;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.pricing-button:hover {
  transform: translateY(-1px);
}

.pricing-button--base {
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #ffffff;
  color: #0f172a;
}

.pricing-button--base:hover {
  border-color: rgba(148, 163, 184, 0.9);
  background: #f8fafc;
}

.pricing-button--popular {
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}

.pricing-button--popular:hover {
  background: #111f39;
}

.pricing-button--value {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}

.pricing-button--value:hover {
  background: linear-gradient(135deg, #111f39, #253349);
}

.faq-card {
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.faq-card:hover {
  transform: translateY(-3px);
  border-color: rgba(148, 163, 184, 0.72);
  box-shadow: 0 24px 65px rgba(15, 23, 42, 0.1);
}

.client-billboard-card {
  transform: perspective(1800px) rotateY(-3.5deg) rotateX(1.4deg);
  transform-style: preserve-3d;
}

.first-week-pulse {
  animation: first-week-pulse 1.4s ease-out;
}

@keyframes offering-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-50% - 8px));
  }
}

@keyframes first-week-pulse {
  0% {
    background-color: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0);
  }
  30% {
    background-color: rgba(236, 253, 245, 0.98);
    box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.18);
  }
  100% {
    background-color: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .offering-marquee-track {
    animation: none;
  }

  .offering-marquee-fade {
    overflow-x: auto;
    padding-right: 16px;
    padding-left: 16px;
  }

  .offering-marquee-fade::before,
  .offering-marquee-fade::after {
    display: none;
  }
}

@media (max-width: 1024px) {
  .hero-media-card {
    transform: none;
  }

  .pricing-card--popular,
  .pricing-card--value {
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
  }

  .client-billboard-card {
    transform: none;
  }

  .hero-plan-card {
    margin-left: 12px;
    max-width: 248px;
  }
}

@media (max-width: 640px) {
  .hero-plan-card {
    margin-left: 0;
    max-width: none;
  }
}
</style>
