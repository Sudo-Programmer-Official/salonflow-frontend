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
        <h2 class="text-xl font-semibold text-slate-900">Data we collect</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Contact details: names, phone numbers, emails.</li>
          <li>Appointment details: services, preferred staff, scheduled times, notes.</li>
          <li>Check-in and queue details: arrival time, status updates.</li>
          <li>Messaging data: message content, delivery status, timestamps.</li>
          <li>Basic usage data: device/browser info needed to run the service.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">How we use data</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Run core features: appointments, queue, check-ins, and account access.</li>
          <li>Send transactional messages: reminders, check-in confirmations, queue updates, review requests.</li>
          <li>Provide support and service quality, including troubleshooting.</li>
          <li>Comply with legal requirements and prevent abuse.</li>
        </ul>
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
        <p>We do not sell personal data. We may share data with service providers (e.g., Twilio for SMS) to operate the platform and with authorities if required by law.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Data retention</h2>
        <p>We retain data as long as needed to provide the service and to meet legal or compliance requirements. Data may be archived or deleted when no longer required.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Your rights</h2>
        <p>You may request access, updates, or deletion of your information, subject to applicable law and record-keeping obligations.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Contact</h2>
        <p>Email: <a class="text-sky-700 hover:underline" href="mailto:support@salonflow.studio">support@salonflow.studio</a></p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const effectiveDate = 'January 1, 2025';
</script>
