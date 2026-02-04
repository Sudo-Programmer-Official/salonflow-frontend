<template>
  <div class="mx-auto max-w-4xl px-4 py-10 text-slate-800">
    <h1 class="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
    <p class="mt-2 text-sm text-slate-500">Effective date: {{ effectiveDate }}</p>

    <div class="mt-6 space-y-6 leading-7 text-slate-800">
      <section>
        <h2 class="text-xl font-semibold text-slate-900">Who we are</h2>
        <p>SalonFlow is a product of Sudo Programmer Inc. This policy explains how we handle data in the SalonFlow platform.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">What we collect</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Account info: business name, owner/staff contact details, login email.</li>
          <li>Operational data: appointments, queue/check-in details, services, staff assignments, messaging logs.</li>
          <li>Google Business Profile data (only if you connect): business profile info and reviews, plus connection metadata (access/refresh tokens).</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">How we use data</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Provide core features: appointments, check-ins, queue, messaging, loyalty, and reporting.</li>
          <li>Sync and display Google Business Profile info and reviews (when connected by you).</li>
          <li>Operate, secure, and support the service, including troubleshooting and abuse prevention.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Google API Services User Data Policy</h2>
        <p class="mt-2">
          SalonFlow’s use and transfer of information received from Google APIs will adhere to the Google API Services User Data
          Policy, including the Limited Use requirements. We only use Google data to provide user-facing features you request; we do
          not use Google data for ads, data-brokering, or selling.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">SMS and consent</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>We send transactional SMS such as appointment reminders, check-in confirmations, queue updates, and review requests.</li>
          <li>Users opt-in by providing their phone number during check-in or appointment booking.</li>
          <li>Opt-out anytime by replying STOP. Reply HELP for help. Msg &amp; data rates may apply.</li>
          <li>We enforce consent checks before sending messages.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Sharing</h2>
        <p>We do not sell personal data. We share data only with service providers needed to operate the product (e.g., hosting, database, logging, messaging) and with authorities if required by law. No third-party marketing use.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Data retention &amp; deletion</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>We retain operational data while your account is active and as required for legal/compliance purposes.</li>
          <li>Google access/refresh tokens are retained only while the integration is connected. When you disconnect in Settings → Integrations, we stop syncing and delete stored tokens within 7 days.</li>
          <li>You can request deletion of personal data by emailing <a class="text-sky-700 hover:underline" href="mailto:support@salonflow.studio">support@salonflow.studio</a>.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Security</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Encryption in transit and at rest for stored data.</li>
          <li>Least-privilege access for internal tools.</li>
          <li>Monitoring to detect abuse or misuse.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Your rights</h2>
        <p>You may request access, updates, or deletion of your information, subject to applicable law and record-keeping obligations.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Contact</h2>
        <p>Email: <a class="text-sky-700 hover:underline" href="mailto:help@sudoprogrammer.com">help@sudoprogrammer.com</a></p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const effectiveDate = 'February 4, 2026';
</script>
