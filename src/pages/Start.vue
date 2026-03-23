<script setup lang="ts">
import { RouterLink } from 'vue-router';
import LeadAssistant from '../components/marketing/LeadAssistant.vue';

const launchPoints = [
  'We set up the website, booking flow, and growth workflow for you.',
  'Every lead is stored and routed so follow-up does not get missed.',
  'You get a recommendation based on bookings, retention, and front-desk needs.',
];
</script>

<template>
  <div class="min-h-full bg-[linear-gradient(180deg,#f5f2ea_0%,#fffdf9_42%,#eef6f1_100%)]">
    <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-[0.82fr,1.18fr] lg:items-start">
        <div class="lg:sticky lg:top-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
            Free demo intake
          </div>

          <h1 class="mt-6 font-['Space_Grotesk'] text-4xl font-semibold leading-[1.05] text-slate-950 sm:text-5xl">
            Tell us about your salon and we will map the right SalonFlow setup.
          </h1>

          <p class="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            This is the faster path than a generic contact form. Share the business context, and we will respond with a demo plan tailored to how your salon actually runs.
          </p>

          <div class="mt-8 space-y-3">
            <div
              v-for="point in launchPoints"
              :key="point"
              class="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm backdrop-blur"
            >
              {{ point }}
            </div>
          </div>

          <div class="mt-8 rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
            <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">Need a quick answer?</div>
            <div class="mt-3 font-['Space_Grotesk'] text-2xl font-semibold">We usually follow up within one business day.</div>
            <p class="mt-3 text-sm leading-7 text-white/72">
              Prefer to browse first? Head back to the product page to see positioning, proof, and the full growth-system breakdown.
            </p>
            <RouterLink
              to="/"
              class="mt-6 inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/6"
            >
              Back to product page
            </RouterLink>
          </div>
        </div>

        <LeadAssistant
          source="marketing-start-assistant"
          title="Build my SalonFlow demo plan"
          subtitle="Answer the prompts below and your progress will save automatically while we build the right SalonFlow plan for your salon."
          cta-label="Request My Demo"
          :default-fullscreen="true"
        />
      </div>
    </section>
  </div>
</template>
