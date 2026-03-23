<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import LeadAssistant from '../components/marketing/LeadAssistant.vue';

const assistantSection = ref<HTMLElement | null>(null);

const jumpToAssistant = () => {
  assistantSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const outcomeStats = [
  { value: '1 system', label: 'Website, booking, social scheduling, reminders, CRM, and POS rollout in one place' },
  { value: '24 hrs', label: 'Lead follow-up target after a salon owner reaches out' },
  { value: '0 contract', label: 'Setup included so owners are not stuck DIYing software' },
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

const differenceRows = [
  {
    label: 'What most salon tools do',
    other: 'Handle booking and stop there',
    salonFlow: 'Drive booking, follow-up, retention, and website conversion in one system',
  },
  {
    label: 'Setup experience',
    other: 'DIY onboarding and scattered tools',
    salonFlow: 'We set it up with you so the launch feels operational, not technical',
  },
  {
    label: 'Owner visibility',
    other: 'One more dashboard to check',
    salonFlow: 'Clear owner-level view of leads, bookings, reminders, and growth levers',
  },
  {
    label: 'Value story',
    other: 'Scheduling software',
    salonFlow: 'Salon growth system',
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
    detail: 'Owners can inspect a real SalonFlow client site instead of guessing from screenshots or promises.',
  },
  {
    label: 'Real salon',
    value: 'Corpus Christi',
    detail: 'Built with a working salon in market, not a fake demo brand or generic mock business.',
  },
  {
    label: 'Product feedback',
    value: 'Owner-shaped',
    detail: 'Launch decisions are being shaped with real salon workflow, not abstract SaaS assumptions.',
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
    detail: 'A real business already trusts SalonFlow enough to be visible in market.',
  },
  {
    label: 'Experience',
    title: 'Desktop + mobile ready',
    detail: 'The website presentation holds up on larger screens and on the phone guests reach for first.',
  },
  {
    label: 'Signal',
    title: 'Built with owner feedback',
    detail: 'Product direction comes from a working salon, not from generic templates.',
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
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                @click="jumpToAssistant"
              >
                Get Free Demo Plan
              </button>
              <RouterLink
                to="/start"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
              >
                Talk to our team
              </RouterLink>
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

            <div class="floating-card floating-card--top-right">
              <img
                src="/images/landing/marketing-mobile.jpg"
                alt="SalonFlow mobile experience"
                class="h-full w-full object-cover"
              />
              <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.5))]" />
              <div class="absolute inset-x-4 bottom-4 text-white">
                <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">Mobile-ready</div>
                <div class="mt-1 sf-display text-lg font-semibold">Owners and staff can move fast</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-black/5 bg-white/70">
      <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-600">
          <span>Website + booking</span>
          <span>Social media scheduling</span>
          <span>SMS reminders</span>
          <span>Loyalty + reviews</span>
          <span>Owner visibility</span>
          <span>POS rollout</span>
          <span>Done-for-you setup</span>
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
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Why it lands better</div>
          <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            You are not selling software. You are selling more revenue with less chaos.
          </h2>
          <p class="mt-5 text-base leading-8 text-slate-600">
            That is the frame salon owners actually care about. More customers. More repeat visits. Less admin drag. Less tool sprawl.
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
            v-for="row in differenceRows"
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

            <div class="mt-8 grid gap-4 sm:grid-cols-3">
              <div
                v-for="signal in clientTrustSignals"
                :key="signal.label"
                class="rounded-[26px] border border-white/80 bg-white/88 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {{ signal.label }}
                </div>
                <div class="sf-display mt-3 text-2xl font-semibold text-slate-950">{{ signal.value }}</div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ signal.detail }}</p>
              </div>
            </div>

            <div class="mt-8 rounded-[30px] border border-slate-900/6 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200/75">Why owners believe it</div>
              <div class="mt-4 space-y-3">
                <div
                  v-for="point in clientBeliefPoints"
                  :key="point"
                  class="flex items-start gap-3"
                >
                  <span class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300" />
                  <p class="text-sm leading-7 text-white/78">{{ point }}</p>
                </div>
              </div>
            </div>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                :href="featuredClient.website"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
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

          <div class="relative min-h-[680px] lg:min-h-[760px]">
            <div class="client-billboard-card rounded-[38px] border border-white/80 bg-white/70 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur">
              <div class="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[#0c1528] shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
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

                <div class="grid lg:grid-cols-[1.02fr,0.98fr]">
                  <div class="relative min-h-[440px] overflow-hidden">
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

                  <div class="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-5 sm:p-6">
                    <div class="rounded-[26px] border border-slate-200 bg-white/95 p-5 shadow-sm">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">What this proves</div>
                      <div class="mt-4 space-y-4">
                        <div
                          v-for="card in clientProofCards"
                          :key="card.title"
                          class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4"
                        >
                          <div class="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">{{ card.label }}</div>
                          <div class="mt-2 font-['Space_Grotesk'] text-xl font-semibold text-slate-950">{{ card.title }}</div>
                          <p class="mt-2 text-sm leading-6 text-slate-600">{{ card.detail }}</p>
                        </div>
                      </div>
                    </div>

                    <div class="mt-5 rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Billboard value</div>
                      <div class="mt-3 font-['Space_Grotesk'] text-2xl font-semibold text-slate-950">
                        Owners trust what they can verify.
                      </div>
                      <p class="mt-3 text-sm leading-7 text-slate-700">
                        A public client website reduces doubt fast. It shows SalonFlow is already being used by a real salon and that the brand experience can feel premium from day one.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="client-phone-card">
              <div class="rounded-[34px] border border-slate-200/90 bg-white/92 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur">
                <div class="mx-auto mt-1 h-6 w-24 rounded-full bg-slate-950" />
                <div class="relative mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950">
                  <img
                    src="/images/landing/marketing-mobile.jpg"
                    alt="MTV Nails mobile preview"
                    class="h-[420px] w-full object-cover"
                  />
                  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,21,40,0.08),rgba(12,21,40,0.58))]" />
                  <div class="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/12 bg-slate-950/78 p-4 text-white backdrop-blur-md">
                    <div class="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/80">
                      Mobile preview
                    </div>
                    <div class="mt-2 font-['Space_Grotesk'] text-xl font-semibold leading-tight">
                      Looks polished on the device guests actually use first.
                    </div>
                    <p class="mt-2 text-xs leading-6 text-white/74">
                      Mobile trust matters because most salon discovery starts on a phone.
                    </p>
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
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Capture more owners</div>
            <h2 class="sf-display mt-3 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Put a smart assistant in front of every serious lead.
            </h2>
            <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              Instead of a cold contact form, SalonFlow can ask the right questions, qualify the owner, save the lead in your database,
              and notify you immediately so high-intent prospects do not sit untouched.
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
          source="marketing-home-assistant"
          title="See how SalonFlow fits your salon in one guided conversation"
          subtitle="Share a few details about your salon and we will tailor the right setup for your team. Your progress saves automatically while we build your demo plan."
          cta-label="Send My Demo Plan"
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

.client-billboard-card {
  transform: perspective(1800px) rotateY(-3.5deg) rotateX(1.4deg);
  transform-style: preserve-3d;
}

.client-phone-card {
  position: absolute;
  right: -10px;
  bottom: 34px;
  width: min(290px, 38%);
  z-index: 20;
  animation: float-client-device 7.2s ease-in-out infinite;
}

.floating-card {
  position: absolute;
  overflow: hidden;
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(18px);
  animation: float-card 6.4s ease-in-out infinite;
}

.floating-card--top-right {
  top: -24px;
  right: -18px;
  width: 180px;
  height: 220px;
  border: 1px solid rgba(255, 255, 255, 0.76);
}

@keyframes float-card {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-12px);
  }
}

@keyframes float-client-device {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
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

  .client-phone-card {
    position: relative;
    right: auto;
    bottom: auto;
    width: min(320px, 82%);
    margin: -44px auto 0;
  }

  .floating-card--top-right {
    right: 12px;
    top: 12px;
    width: 148px;
    height: 180px;
  }

  .hero-plan-card {
    margin-left: 12px;
    max-width: 248px;
  }
}

@media (max-width: 640px) {
  .client-phone-card {
    width: min(280px, 88%);
    margin-top: 18px;
  }

  .floating-card--top-right {
    width: 128px;
    height: 156px;
  }

  .hero-plan-card {
    margin-left: 0;
    max-width: none;
  }
}
</style>
