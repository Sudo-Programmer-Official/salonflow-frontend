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

const stackItems = [
  {
    title: 'Website + booking that actually converts',
    desc: 'A modern salon website, online booking flow, QR check-in, and a cleaner first impression for new clients.',
  },
  {
    title: 'SMS reminders + repeat visit engine',
    desc: 'Cut no-shows, request reviews, and bring guests back with reminders, loyalty, and targeted follow-up.',
  },
  {
    title: 'Social media scheduling + content posting',
    desc: 'Connect your social presence, schedule posts, and keep promotions moving so the salon stays visible and growing.',
  },
  {
    title: 'Front desk + POS rollout visibility',
    desc: 'Queue, appointments, customer context, and the next phase of SalonFlow POS without stitching together multiple vendors.',
  },
  {
    title: 'Owner visibility + growth control',
    desc: 'See what is driving bookings, follow-up, and client retention without bouncing across disconnected tools.',
  },
  {
    title: 'Done-for-you setup and support',
    desc: 'We load services, shape the flow, and help launch the system with your real salon workflow in mind.',
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

const setupSteps = [
  {
    step: '01',
    title: 'We map your salon flow',
    desc: 'Services, staff, booking rules, reminders, and the parts of your current process slowing growth down.',
  },
  {
    step: '02',
    title: 'We launch the website and workflow',
    desc: 'Your website, booking path, follow-up settings, and front-desk experience are prepared with you.',
  },
  {
    step: '03',
    title: 'You run the floor with less friction',
    desc: 'Owners spend less time chasing no-shows or updating tools and more time serving clients and growing repeat visits.',
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

    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Everything you need</div>
          <h2 class="sf-display mt-3 max-w-2xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            One system to run the floor and grow the business.
          </h2>
        </div>
        <p class="max-w-xl text-base leading-7 text-slate-600">
          This should not feel like another tool. It should feel like the operating layer behind how your salon gets found,
          books faster, posts consistently, follows up, and stays organized.
        </p>
      </div>

      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <div
          v-for="item in stackItems"
          :key="item.title"
          class="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div class="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
            Included
          </div>
          <h3 class="sf-display mt-4 text-2xl font-semibold text-slate-950">{{ item.title }}</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600">{{ item.desc }}</p>
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

    <section class="border-y border-black/5 bg-white/70">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
          <div class="rounded-[32px] border border-white/70 bg-slate-950 p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.2)]">
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/75">Built with salons</div>
            <h2 class="sf-display mt-4 text-3xl font-semibold leading-tight">
              “SalonFlow helped us stay organized without adding more staff.”
            </h2>
            <p class="mt-5 text-sm leading-7 text-white/72">
              Real-world feedback from MTV Nails shaped the way SalonFlow approaches setup, booking, visibility, and owner control.
            </p>
            <div class="mt-6 border-t border-white/10 pt-5 text-sm text-white/75">
              MTV Nails
              <span class="block text-xs uppercase tracking-[0.24em] text-white/45">Corpus Christi</span>
            </div>
          </div>

          <div class="grid gap-5 md:grid-cols-3">
            <article
              v-for="step in setupSteps"
              :key="step.step"
              class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.07)]"
            >
              <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Step {{ step.step }}
              </div>
              <h3 class="sf-display mt-4 text-2xl font-semibold text-slate-950">{{ step.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{{ step.desc }}</p>
            </article>
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

    <section class="border-t border-black/5 bg-[#0f172a] text-white">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-8 lg:grid-cols-[1fr,0.72fr] lg:items-center">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50">Founding plan</div>
            <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Start with the plan that costs less than one extra appointment a week.
            </h2>
            <p class="mt-4 max-w-2xl text-base leading-8 text-white/72">
              One clear monthly plan for salons that want a website, booking, reminders, loyalty, and an owner-facing growth system without a long contract.
            </p>
          </div>

          <div class="rounded-[30px] border border-white/10 bg-white/6 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">SalonFlow founding offer</div>
            <div class="sf-display mt-4 text-5xl font-semibold">$65<span class="text-xl text-white/55">/month</span></div>
            <ul class="mt-6 space-y-3 text-sm leading-7 text-white/75">
              <li>Website + booking + QR check-in</li>
              <li>Reminders, reviews, loyalty, and promotions</li>
              <li>Owner dashboard and staff-friendly workflow</li>
              <li>Setup included. No contract. Cancel anytime.</li>
            </ul>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                @click="jumpToAssistant"
              >
                Get Free Demo Plan
              </button>
              <RouterLink
                to="/start"
                class="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/6"
              >
                Request a walkthrough
              </RouterLink>
            </div>
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

@media (max-width: 1024px) {
  .hero-media-card {
    transform: none;
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
