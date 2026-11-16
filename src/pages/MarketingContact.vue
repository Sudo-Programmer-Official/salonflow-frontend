<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { applyMarketingSeo } from '@/utils/marketingSeo';

onMounted(() => {
  applyMarketingSeo({
    path: '/contact',
    title: 'Contact SalonFlow | Salon growth software',
    description: 'Talk with the SalonFlow team about website, booking, reminders, reviews, loyalty, and salon growth tools.',
  });
});
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div class="grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:items-start">
      <section>
        <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Contact SalonFlow</div>
        <h1 class="sf-display mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          Have a question before you start?
        </h1>
        <p class="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          Tell us what you are trying to improve. We can point you to the right demo, plan, and first-week setup for your salon.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            to="/start"
            class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Request a demo →
          </RouterLink>
          <a
            href="mailto:support@salonflow.studio"
            class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
          >
            Email the team
          </a>
        </div>
      </section>

      <section class="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-9">
        <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">What we can help with</div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <article v-for="item in ['Website + online booking', 'Reminders and follow-up', 'Reviews and loyalty', 'POS and front desk']" :key="item" class="rounded-2xl bg-slate-50 p-5">
            <h2 class="text-base font-semibold text-slate-950">{{ item }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">We will show you the workflow and what setup would look like for your salon.</p>
          </article>
        </div>
        <div class="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-950">
          Prefer a guided path? The demo request takes about 60 seconds and gives us enough context to make the follow-up useful.
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.sf-display {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
}
</style>
