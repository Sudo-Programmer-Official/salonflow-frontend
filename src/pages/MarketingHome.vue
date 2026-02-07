<script setup lang="ts">
import { RouterLink } from 'vue-router';

const growthCards = [
  {
    icon: '🖥️',
    title: 'Your Website, Done',
    desc: 'Modern salon site, booking link, and QR check-in kept up to date for you.',
  },
  {
    icon: '📱',
    title: 'Social Media, Simplified',
    desc: 'Post to Instagram and Facebook from one place with AI-written captions and promos.',
  },
  {
    icon: '📈',
    title: 'More Customers, Automatically',
    desc: 'Reviews, loyalty points, and promotions that bring guests back—without manual follow-up.',
  },
];

const aiHighlights = [
  'Write promo posts in seconds',
  'Create seasonal offers without a marketer',
  'Suggested captions, messages, and promos',
  'You approve everything—no auto-posting',
];

const faqs = [
  { q: 'Do you process payments?', a: 'No. Use your existing POS. SalonFlow tracks operations, not payments.' },
  { q: 'Can staff use it on phones?', a: 'Yes. Staff have a mobile-friendly queue and appointments view.' },
  { q: 'Can customers book online?', a: 'Yes. Share your public booking link or QR; bookings stay tenant-scoped.' },
  { q: 'How does SMS work?', a: 'Consent-based reminders, review requests, and manual sends. Usage is metered with credits.' },
  { q: 'Can you migrate my data?', a: 'We can import services and staff basics; customer data import is available on request.' },
];

const googleDataPoints = [
  'Public business profile info (name, address, hours, phone)',
  'Reviews and ratings (if enabled by you)',
  'Connection metadata (access/refresh tokens to sync as requested)',
];
</script>

<template>
  <div class="bg-white">
    <section class="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute right-10 top-10 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
        <div class="absolute left-10 bottom-10 h-52 w-52 rounded-full bg-indigo-100 blur-3xl" />
      </div>
      <div class="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 lg:flex-row lg:items-center lg:py-20">
        <div class="flex-1 space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100">
            Built for salon owners, not tech teams
          </div>
          <h1 class="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Grow your salon without extra work
          </h1>
          <p class="max-w-2xl text-lg text-slate-700">
            SalonFlow handles your website, social media, and customer flow — so you can focus on clients, not tech.
          </p>
          <p class="text-sm font-medium text-slate-600">
            Built for local salons. Setup included. No contracts.
          </p>
          <div class="flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/start"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Try SalonFlow free for 1 month
            </RouterLink>
            <RouterLink
              to="/salon-login"
              class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              See how it works
            </RouterLink>
          </div>
          <div class="mt-4 text-sm font-medium text-slate-600">
            Built with MTV Nails (Corpus Christi)
          </div>
        </div>
        <div class="flex-1">
          <div class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur">
            <div class="grid grid-cols-2 gap-4 text-sm text-slate-800">
              <div class="rounded-lg bg-slate-50 p-4 shadow-sm">
                <div class="text-xs uppercase text-slate-500">Live Queue</div>
                <div class="mt-2 text-lg font-semibold">Mobile-friendly</div>
                <p class="mt-1 text-xs text-slate-600">Staff work from phones; owners see status.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-4 shadow-sm">
                <div class="text-xs uppercase text-slate-500">Loyalty</div>
                <div class="mt-2 text-lg font-semibold">1 point per $1</div>
                <p class="mt-1 text-xs text-slate-600">Automatic earning, VIP tiers, redemptions.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-4 shadow-sm">
                <div class="text-xs uppercase text-slate-500">Booking</div>
                <div class="mt-2 text-lg font-semibold">Public link</div>
                <p class="mt-1 text-xs text-slate-600">Customers book online; staff manage in app.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-4 shadow-sm">
                <div class="text-xs uppercase text-slate-500">SMS</div>
                <div class="mt-2 text-lg font-semibold">Reminders + reviews</div>
                <p class="mt-1 text-xs text-slate-600">Consent-based, logged, metered by credits.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-6xl px-4 py-10">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 sm:px-6">
          Built with local salons in Corpus Christi (including MTV Nails)
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-6xl px-4 py-12 space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">Everything your salon needs to grow — handled for you</h2>
        <p class="text-slate-600">Website, social, and repeat business in one place.</p>
        <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="card in growthCards"
            :key="card.title"
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div class="text-2xl">{{ card.icon }}</div>
            <div class="mt-2 text-base font-semibold text-slate-900">{{ card.title }}</div>
            <p class="mt-2 text-sm text-slate-600">
              {{ card.desc }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-slate-50">
      <div class="mx-auto max-w-6xl px-4 py-12 space-y-3">
        <h2 class="text-2xl font-semibold text-slate-900">Built-in AI that actually helps</h2>
        <p class="text-slate-600">Speed up posts and promos without losing control.</p>
        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <div
            v-for="point in aiHighlights"
            :key="point"
            class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm"
          >
            {{ point }}
          </div>
        </div>
        <div class="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          You stay in control. AI assists — nothing is posted without your approval.
        </div>
      </div>
    </section>

    <section class="bg-slate-50">
      <div class="mx-auto max-w-6xl px-4 py-12">
        <h2 class="text-2xl font-semibold text-slate-900">Get started in minutes</h2>
        <p class="mt-2 text-slate-600">We set it up, you run the floor.</p>
        <div class="mt-8 grid gap-6 md:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs font-semibold uppercase text-sky-700">Step 1</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">We set it up for you</div>
            <p class="mt-2 text-sm text-slate-600">Website, services, staff, and booking—ready to go.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs font-semibold uppercase text-sky-700">Step 2</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">Customers check in or book</div>
            <p class="mt-2 text-sm text-slate-600">Walk-ins, QR check-ins, or online booking.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs font-semibold uppercase text-sky-700">Step 3</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">You manage everything in one place</div>
            <p class="mt-2 text-sm text-slate-600">Queue, checkout, promotions, and social—without juggling tools.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-6xl px-4 py-12">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 class="text-2xl font-semibold text-slate-900">Pricing that makes sense</h3>
              <p class="mt-2 text-slate-600">Founding plan for salons that want clarity and control.</p>
              <p class="mt-3 text-lg font-semibold text-slate-900">$65/month or $700/year</p>
              <p class="text-sm text-slate-600">Includes unlimited staff/customers, booking, check-in, loyalty, dashboards.</p>
              <p class="mt-2 text-sm font-semibold text-slate-700">No contracts. Cancel anytime. Setup included.</p>
              <p class="mt-1 text-sm text-slate-600">Most salons recover the cost with 1–2 extra appointments.</p>
            </div>
            <div class="space-y-3 text-sm text-slate-700">
              <div class="rounded-lg bg-white p-4 shadow-sm">
                <div class="font-semibold text-slate-900">SMS credits</div>
                <p class="mt-1 text-slate-600">Monthly included credits. Buy SMS packs as needed. No expiration; failed sends are refunded automatically.</p>
              </div>
              <div class="rounded-lg bg-white p-4 shadow-sm">
                <div class="font-semibold text-slate-900">Payments</div>
                <p class="mt-1 text-slate-600">Payments for salon services are not processed inside SalonFlow. Use your existing POS.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-6xl px-4 py-12 space-y-3">
        <h2 class="text-2xl font-semibold text-slate-900">Built with and for local salons</h2>
        <p class="text-slate-600">Real feedback from Corpus Christi salons, including MTV Nails.</p>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Local support</div>
            <p class="mt-2 text-sm text-slate-600">Real humans, not a generic software company.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Built with salons</div>
            <p class="mt-2 text-sm text-slate-600">Features shaped by salon owners and staff.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Outcome focused</div>
            <p class="mt-2 text-sm text-slate-600">Designed to drive bookings, reviews, and loyalty.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-slate-50">
      <div class="mx-auto max-w-6xl px-4 py-12">
        <h2 class="text-2xl font-semibold text-slate-900">Frequently asked questions</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div
            v-for="item in faqs"
            :key="item.q"
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="text-base font-semibold text-slate-900">{{ item.q }}</div>
            <p class="mt-2 text-sm text-slate-600">
              {{ item.a }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-6xl px-4 py-12">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
          <h3 class="text-2xl font-semibold text-slate-900">Ready to grow your salon without more stress?</h3>
          <p class="mt-2 text-slate-600">Try SalonFlow free for 1 month. Setup included. No credit card required.</p>
          <div class="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <RouterLink
              to="/start"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Try SalonFlow free for 1 month
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
