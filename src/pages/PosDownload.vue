<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const normalizeUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const windowsX64Url = normalizeUrl(import.meta.env.VITE_POS_WINDOWS_X64_URL as string | undefined);
const windowsArm64Url = normalizeUrl(import.meta.env.VITE_POS_WINDOWS_ARM64_URL as string | undefined);
const releaseVersion = normalizeUrl(import.meta.env.VITE_POS_WINDOWS_RELEASE as string | undefined);

const installerCards = computed(() => [
  {
    title: 'Windows 64-bit',
    subtitle: 'Recommended for most salon front-desk PCs',
    arch: 'x64',
    href: windowsX64Url,
    badge: 'Recommended',
    accentClass: 'from-slate-950 via-slate-900 to-slate-800 text-white',
    borderClass: 'border-slate-900/10',
  },
  {
    title: 'Windows on ARM',
    subtitle: 'Use this only for ARM-based Windows devices',
    arch: 'arm64',
    href: windowsArm64Url,
    badge: 'ARM only',
    accentClass: 'from-amber-100 via-orange-50 to-white text-slate-900',
    borderClass: 'border-amber-200/70',
  },
]);

const installSteps = [
  'Download the installer that matches the Windows hardware.',
  'Open the .exe file and complete the install once on the station.',
  'Sign in once so the station can initialize its local session.',
  'Use the POS normally. Internet is only needed for sync, not day-to-day checkout.',
];

const readinessPoints = [
  'Technician-first selling surface built for fast salon checkout.',
  'Local-first runtime so front-desk operations keep moving during connectivity issues.',
  'Receipt, printer, and offline session flow stay inside the desktop app.',
];
</script>

<template>
  <div class="bg-[linear-gradient(180deg,#fbf7f0_0%,#fffdf9_40%,#f3f7f3_100%)] text-slate-900">
    <section class="relative overflow-hidden border-b border-black/5">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute left-[-5rem] top-14 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
        <div class="absolute right-[-5rem] top-16 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div class="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-[1.02fr,0.98fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm">
              Desktop POS download
            </div>
            <h1 class="sf-display mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl">
              Download SalonFlow POS for Windows
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Install the desktop POS on the salon station and keep front-desk checkout inside the local-first app.
              Technician workflows, payment prep, receipts, and printer actions stay in one screen.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
              <a
                v-if="windowsX64Url"
                :href="windowsX64Url"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Download Windows EXE
              </a>
              <RouterLink
                v-else
                to="/start"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Request Installer Link
              </RouterLink>
              <RouterLink
                to="/start"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/75 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
              >
                Need Help Installing?
              </RouterLink>
            </div>

            <div class="mt-8 grid gap-4 sm:grid-cols-3">
              <div
                v-for="point in readinessPoints"
                :key="point"
                class="rounded-[24px] border border-white/80 bg-white/84 px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur"
              >
                {{ point }}
              </div>
            </div>
          </div>

          <div class="rounded-[34px] border border-white/70 bg-white/86 p-4 shadow-[0_28px_100px_rgba(15,23,42,0.14)] backdrop-blur">
            <div class="rounded-[28px] bg-[linear-gradient(145deg,#0f172a_0%,#1f2937_100%)] p-6 text-white">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">Station install</div>
                  <div class="sf-display mt-3 text-3xl font-semibold">One-time desktop setup</div>
                </div>
                <div class="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                  <span v-if="releaseVersion">Release {{ releaseVersion }}</span>
                  <span v-else>Windows installer</span>
                </div>
              </div>

              <div class="mt-6 grid gap-3">
                <div
                  v-for="(step, index) in installSteps"
                  :key="step"
                  class="flex items-start gap-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                    {{ index + 1 }}
                  </div>
                  <div class="text-sm leading-6 text-white/82">{{ step }}</div>
                </div>
              </div>

              <div class="mt-6 rounded-[24px] border border-amber-300/30 bg-amber-100/10 px-4 py-4 text-sm leading-6 text-white/82">
                Windows may show SmartScreen warnings until code signing is configured. For pilot installs, that is
                normal. Use the direct installer link from your hosted release.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div class="grid gap-6 lg:grid-cols-2">
        <article
          v-for="card in installerCards"
          :key="card.arch"
          class="overflow-hidden rounded-[30px] border bg-white/88 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur"
          :class="card.borderClass"
        >
          <div class="bg-gradient-to-br p-6" :class="card.accentClass">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-70">{{ card.arch }}</div>
                <h2 class="sf-display mt-3 text-3xl font-semibold">{{ card.title }}</h2>
                <p class="mt-3 max-w-lg text-sm leading-7 opacity-80">{{ card.subtitle }}</p>
              </div>
              <div class="rounded-full border border-current/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
                {{ card.badge }}
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="rounded-[24px] border border-slate-200 bg-slate-50/85 px-4 py-4 text-sm leading-6 text-slate-600">
              Download the direct `.exe` installer for this hardware profile. Install it once per front-desk station.
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-3">
              <a
                v-if="card.href"
                :href="card.href"
                class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Download EXE
              </a>
              <RouterLink
                v-else
                to="/start"
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Request Access
              </RouterLink>
              <span v-if="card.href" class="text-sm text-slate-500">Hosted installer link configured</span>
              <span v-else class="text-sm text-slate-500">Set the download URL in web env before launch</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="border-t border-black/5 bg-white/70">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr,1.1fr] lg:px-8 lg:py-16">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Before launch</div>
          <h2 class="sf-display mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Host the installer once, then point the website at the release URL
          </h2>
          <p class="mt-4 max-w-xl text-base leading-8 text-slate-600">
            The download page is wired for direct hosted release links. Upload the `.exe` to your release bucket,
            GitHub release, or backend download endpoint, then set the matching environment variable in the web app.
          </p>
        </div>

        <div class="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Recommended</div>
              <div class="mt-3 text-lg font-semibold text-slate-950">Windows 64-bit</div>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                Standard Intel and AMD Windows hardware used by most salons.
              </p>
            </div>
            <div class="rounded-[24px] border border-amber-200 bg-amber-50/80 px-4 py-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">Optional</div>
              <div class="mt-3 text-lg font-semibold text-slate-950">Windows on ARM</div>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                Only use this when the target machine is an ARM-based Windows device.
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
            If you want a branded installer flow later, keep this public page and switch the file URLs to your signed
            release artifacts. The page does not need another rewrite.
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
