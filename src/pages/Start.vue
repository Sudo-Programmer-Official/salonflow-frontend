<script setup lang="ts">
import { ref } from 'vue';
import { ElAlert } from 'element-plus';

const name = ref('');
const email = ref('');
const phone = ref('');
const message = ref('');
const success = ref('');
const error = ref('');

const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:3000';
const tenantId =
  (import.meta.env.VITE_TENANT_ID as string | undefined) ||
  (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);

const submit = async () => {
  success.value = '';
  error.value = '';
  if (!name.value.trim() || !email.value.trim()) {
    error.value = 'Name and email are required.';
    return;
  }
  if (!validateEmail(email.value.trim())) {
    error.value = 'Enter a valid email address.';
    return;
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${apiBase}/api/demo-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || undefined,
        message: message.value.trim() || undefined,
      }),
    });
    if (!res.ok) {
      throw new Error('Failed to submit request');
    }
    success.value = 'Thanks! We’ll reach out within 24 hours to schedule your demo.';
    name.value = '';
    email.value = '';
    phone.value = '';
    message.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Submission failed.';
  }
};
</script>

<template>
  <div class="bg-white">
    <div class="mx-auto max-w-3xl px-4 py-12">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
        <h1 class="text-2xl font-semibold text-slate-900">Request a Demo / Get Started</h1>
        <p class="mt-2 text-slate-600">
          Tell us a bit about your salon. We’ll reach out to set up a walkthrough and tailor it to your workflow.
        </p>

        <div class="mt-6 space-y-4">
          <div>
            <label class="text-sm font-medium text-slate-800">Name *</label>
            <input
              v-model="name"
              type="text"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-800">Email *</label>
            <input
              v-model="email"
              type="email"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-800">Phone (optional)</label>
            <input
              v-model="phone"
              type="tel"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="+1 555 123 4567"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-800">Notes (optional)</label>
            <textarea
              v-model="message"
              rows="4"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="Tell us about your salon or what you’d like to see."
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              @click="submit"
            >
              Submit
            </button>
            <p class="text-xs text-slate-500">We respond within one business day.</p>
          </div>
          <ElAlert v-if="success" :title="success" type="success" :closable="false" />
          <ElAlert v-if="error" :title="error" type="error" :closable="false" />
        </div>
      </div>
    </div>
  </div>
</template>
