<template>
  <div class="mx-auto max-w-4xl px-4 py-10 text-slate-800">
    <h1 class="text-3xl font-semibold text-slate-900">Terms of Service</h1>
    <p class="mt-2 text-sm text-slate-500">Effective date: {{ effectiveDate }}</p>

    <div class="mt-6 space-y-6 leading-7 text-slate-800">
      <section>
        <h2 class="text-xl font-semibold text-slate-900">Service</h2>
        <p>SalonFlow (by Sudo Programmer Inc.) provides salon management tools for appointments, check-ins, queue management, messaging, and related features.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Accounts &amp; responsibilities</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>Admin users are responsible for maintaining accurate business information and access control.</li>
          <li>You must keep login credentials secure and notify us of any unauthorized access.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Acceptable use</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>No unlawful, abusive, or fraudulent activity.</li>
          <li>No harassment or sending unsolicited messages without consent.</li>
          <li>No interference with platform security or operations.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Messaging terms</h2>
        <ul class="list-disc space-y-2 pl-5">
          <li>We send transactional SMS (appointment reminders, check-in confirmations, queue updates, review requests).</li>
          <li>Users opt-in by providing their phone number during check-in or booking.</li>
          <li>Reply STOP to opt out; HELP for help. Msg &amp; data rates may apply.</li>
          <li>Business users must respect customer consent and applicable messaging laws.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Disclaimers</h2>
        <p>The service is provided “as is” without warranties of any kind. We disclaim implied warranties to the maximum extent permitted by law.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Limitation of liability</h2>
        <p>To the extent permitted by law, Sudo Programmer Inc. is not liable for indirect, incidental, or consequential damages arising from use of the service.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Termination</h2>
        <p>We may suspend or terminate access for violations of these terms or misuse of the service. You may terminate by ceasing use; some data retention may be required for legal reasons.</p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-slate-900">Governing law</h2>
        <p>These terms are governed by the laws of the State of Texas, USA.</p>
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
