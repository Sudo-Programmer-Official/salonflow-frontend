<script setup lang="ts">
import { computed } from 'vue';

type HoursRow = { day: string; open: string; close: string };
type GroupedHour = { label: string; open?: string; close?: string; days: string[] };

const props = withDefaults(
  defineProps<{
    footer?: {
      enabled?: boolean;
      location?: { addressLine1?: string; city?: string; state?: string; zip?: string } | null;
      contact?: { phone?: string | null; email?: string | null } | null;
      hours?: { source: 'manual' | 'kiosk'; manual?: HoursRow[] } | null;
      social?: { instagram?: string | null; facebook?: string | null; google?: string | null } | null;
      legal?: {
        showPrivacy?: boolean;
        showTerms?: boolean;
        showDataDeletion?: boolean;
        copyrightText?: string | null;
      } | null;
    } | null;
    fallbackHoursText?: string | null;
  }>(),
  {
    footer: () => ({
      enabled: true,
      location: null,
      contact: null,
      hours: { source: 'manual', manual: [] },
      social: { instagram: null, facebook: null, google: null },
      legal: { showPrivacy: true, showTerms: true, showDataDeletion: true },
    }),
    fallbackHoursText: null,
  },
);

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const locationLines = computed(() => {
  const loc = props.footer?.location;
  if (!loc) return [];
  const parts = [
    loc.addressLine1,
    [loc.city, loc.state, loc.zip].filter(Boolean).join(', ').trim(),
  ]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  return parts;
});

const contact = computed(() => props.footer?.contact || null);

const hours = computed<GroupedHour[]>(() => {
  const manual: HoursRow[] = props.footer?.hours?.manual ?? [];
  if (manual.length) {
    const sorted: Array<{ day: string; open: string; close: string }> = manual
      .map((row) => {
        const day = row.day || '';
        const open = String(row.open ?? '');
        const close = String(row.close ?? '');
        return { day, open, close };
      })
      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    const groups: GroupedHour[] = [];
    for (const row of sorted) {
      const open = row.open ?? '';
      const close = row.close ?? '';
      const key = `${open}__${close}`;
      const last = groups[groups.length - 1];
      if (last && `${last.open}__${last.close}` === key) {
        last.days.push(row.day);
        last.label = formatRange(last.days) || '';
      } else {
        groups.push({
          label: formatRange([row.day]) || '',
          open,
          close,
          days: [row.day],
        } as GroupedHour);
      }
    }
    return groups;
  }
  if (props.fallbackHoursText) {
    return [{ label: 'Hours', open: String(props.fallbackHoursText || ''), close: '', days: [] }];
  }
  return [];
});

const social = computed(() => props.footer?.social || {});
const legal = computed(() => props.footer?.legal || {});

const hasLocation = computed(() => locationLines.value.length > 0);
const hasContact = computed(() => contact.value?.phone || contact.value?.email);
const hasHours = computed(() => hours.value.length > 0);
const hasSocial = computed(
  () => !!(social.value?.instagram || social.value?.facebook || social.value?.google),
);
const hasLegal = computed(
  () =>
    legal.value?.showPrivacy !== false ||
    legal.value?.showTerms !== false ||
    legal.value?.showDataDeletion !== false ||
    !!legal.value?.copyrightText,
);

const currentYear = new Date().getFullYear();
const todayKey = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
  .format(new Date())
  .slice(0, 3);

const isToday = (days: string[] | string) => {
  if (Array.isArray(days)) return days.includes(todayKey);
  return days === todayKey;
};

function formatRange(days: string[]) {
  if (!days.length) return '';
  if (days.length === 1) return days[0];
  return `${days[0]} – ${days[days.length - 1]}`;
}
</script>

<template>
  <footer v-if="footer?.enabled !== false" class="sf-footer">
    <div class="sf-container sf-footer__shell">
      <div v-if="hasLocation" class="sf-footer__card">
        <div class="sf-footer__label">
          <svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21s7-5.373 7-11a7 7 0 1 0-14 0c0 5.627 7 11 7 11Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            />
            <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6" />
          </svg>
          <span>Location</span>
        </div>
        <p class="sf-footer__text" v-for="line in locationLines" :key="line">{{ line }}</p>
      </div>

      <div v-if="hasHours" class="sf-footer__card">
        <div class="sf-footer__label">
          <svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M12 7.5V12l2.8 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>Business Hours</span>
        </div>
        <div class="sf-footer__hours">
          <div
            v-for="row in hours"
            :key="row.label"
            class="sf-footer__hour"
            :class="{ 'is-today': isToday(row.days) }"
          >
            <span class="day">{{ row.label }}</span>
            <span class="time">{{ row.close ? `${row.open || ''} – ${row.close}` : (row.open || '') }}</span>
          </div>
        </div>
        <p v-if="footer?.hours?.source === 'kiosk' && !footer?.hours?.manual?.length" class="sf-footer__note">
          Synced from kiosk hours
        </p>
      </div>

      <div v-if="hasContact" class="sf-footer__card">
        <div class="sf-footer__label">
          <svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6.75 4.5h10.5a1.75 1.75 0 0 1 1.75 1.75v11.5A1.75 1.75 0 0 1 17.25 19.5H6.75A1.75 1.75 0 0 1 5 17.75V6.25A1.75 1.75 0 0 1 6.75 4.5Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            />
            <path
              d="M7 7l4.33 3.11a2 2 0 0 0 2.34 0L18 7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          <span>Contact</span>
        </div>
        <div class="sf-footer__contact">
          <a v-if="contact?.phone" class="sf-footer__link" :href="`tel:${contact.phone}`">
            <svg class="sf-icon-inline" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8.5 3.5 6 6c.5 4 3.5 7 7.5 7.5l2.5-2.5 3 3-1.8 1.8c-.4.4-1 .6-1.6.6-6 0-11-5-11-11 0-.6.2-1.2.6-1.6Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ contact.phone }}</span>
          </a>
          <a v-if="contact?.email" class="sf-footer__link" :href="`mailto:${contact.email}`">
            <svg class="sf-icon-inline" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4.5 5.75h15a.75.75 0 0 1 .75.75v11a.75.75 0 0 1-.75.75h-15A.75.75 0 0 1 3.75 17.5v-11a.75.75 0 0 1 .75-.75Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="m4.5 7 6.44 4.08a2 2 0 0 0 2.12 0L19.5 7"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
            <span>{{ contact.email }}</span>
          </a>
        </div>
      </div>

      <div v-if="hasSocial" class="sf-footer__card">
        <div class="sf-footer__label">
          <svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3.5 9c0-2.5 2-4.5 4.5-4.5S12.5 6.5 12.5 9 10.5 13.5 8 13.5 3.5 11.5 3.5 9Zm8 6c0-2.5 2-4.5 4.5-4.5S20.5 12.5 20.5 15 18.5 19.5 16 19.5 11.5 17.5 11.5 15Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          <span>Follow Us</span>
        </div>
        <div class="sf-footer__social">
          <a v-if="social.instagram" :href="social.instagram" target="_blank" rel="noopener" aria-label="Instagram">
            <span class="sf-footer__pill">
              <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path
                  d="M7.5 4h9A3.5 3.5 0 0 1 20 7.5v9A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5v-9A3.5 3.5 0 0 1 7.5 4Zm0 1.6A1.9 1.9 0 0 0 5.6 7.5v9a1.9 1.9 0 0 0 1.9 1.9h9a1.9 1.9 0 0 0 1.9-1.9v-9a1.9 1.9 0 0 0-1.9-1.9h-9Zm9.4 1.1a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.6A2.4 2.4 0 1 0 12 14a2.4 2.4 0 0 0 0-4.4Z"
                />
              </svg>
            </span>
            Instagram
          </a>
          <a v-if="social.facebook" :href="social.facebook" target="_blank" rel="noopener" aria-label="Facebook">
            <span class="sf-footer__pill">
              <svg class="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path
                  d="M14.5 5.5H16V2.7c-.8-.1-1.7-.2-2.5-.2-2.5 0-4.2 1.6-4.2 4.4V9H7v3h2.3v7h3.1V12h2.6l.4-3H12V7c0-.9.3-1.5 1.5-1.5Z"
                />
              </svg>
            </span>
            Facebook
          </a>
          <a v-if="social.google" :href="social.google" target="_blank" rel="noopener" aria-label="Google">
            <span class="sf-footer__pill">
              <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5.4c1.26 0 2.39.43 3.28 1.14l2.45-2.45C16.38 2.65 14.3 2 12 2 7.7 2 4.06 4.7 2.68 8.41l2.98 2.31C6.36 7.99 8.94 5.4 12 5.4Z"
                />
                <path
                  fill="#4285F4"
                  d="M21.8 12.23c0-.82-.07-1.6-.21-2.36H12v4.47h5.55c-.24 1.17-.95 2.16-2.03 2.82l3.15 2.45c1.85-1.71 2.93-4.23 2.93-7.38Z"
                />
                <path
                  fill="#FBBC04"
                  d="M5.66 13.14a4.55 4.55 0 0 1-.23-1.41c0-.49.08-.96.21-1.41L2.66 8.01A9.94 9.94 0 0 0 2 11.73c0 1.63.39 3.17 1.08 4.52l2.58-2.11Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.15-2.45c-.88.6-2.02.95-3.48.95-2.67 0-4.93-1.8-5.74-4.24l-2.98 2.3C4.72 19.3 7.97 22 12 22Z"
                />
              </svg>
            </span>
            Google
          </a>
          <a
            v-if="social.google"
            :href="social.google"
            target="_blank"
            rel="noopener"
            class="sf-footer__review"
          >
            <svg class="sf-icon-inline text-amber-500" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m12 4.5 2.1 4.26 4.7.68-3.4 3.3.8 4.64L12 15.9 7.8 17.4l.8-4.64-3.4-3.3 4.7-.68Z"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="0.6"
              />
            </svg>
            <span>★★★★★ 4.8 on Google</span>
          </a>
        </div>
      </div>
    </div>
    <div v-if="hasLegal" class="sf-footer__strip">
      <div class="sf-container sf-footer__strip-inner">
        <div class="sf-footer__links">
          <a v-if="legal?.showPrivacy !== false" href="/privacy">Privacy</a>
          <a v-if="legal?.showTerms !== false" href="/terms">Terms</a>
          <a v-if="legal?.showDataDeletion !== false" href="/data-deletion">Data Deletion</a>
        </div>
        <div class="sf-footer__copy">
          {{ legal?.copyrightText || `© ${currentYear} SalonFlow` }}
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.sf-footer {
  background: linear-gradient(180deg, #fff7fb 0%, #ffeef7 100%);
  color: var(--sf-text, #0f172a);
  border-top: 1px solid color-mix(in srgb, var(--sf-border, #f4d9e7) 70%, transparent);
  margin-top: 64px;
}
.sf-footer__shell {
  padding: 42px 0 34px;
  display: grid;
  gap: 22px;
  grid-template-columns: 1fr;
}
.sf-footer__card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid color-mix(in srgb, var(--sf-border, #f4d9e7) 75%, #fff);
  border-radius: var(--sf-radius, 14px);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(236, 72, 153, 0.08);
}
.sf-footer__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: color-mix(in srgb, var(--sf-primary, #ec4899) 55%, #0f172a 45%);
  margin-bottom: 10px;
}
.sf-icon {
  width: 18px;
  height: 18px;
  color: color-mix(in srgb, var(--sf-primary, #ec4899) 55%, #475569 45%);
}
.sf-icon-inline {
  width: 16px;
  height: 16px;
  color: color-mix(in srgb, var(--sf-primary, #ec4899) 50%, #475569 50%);
  flex-shrink: 0;
}
.sf-footer__text {
  margin: 0;
  font-weight: 600;
  font-size: 15px;
  color: var(--sf-text, #0f172a);
}
.sf-footer__hours {
  display: grid;
  gap: 6px;
}
.sf-footer__hour {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  color: var(--sf-text, #0f172a);
  padding: 6px 8px;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;
}
.sf-footer__hour .day {
  color: rgba(15, 23, 42, 0.68);
}
.sf-footer__hour .time {
  color: var(--sf-text, #0f172a);
}
.sf-footer__hour.is-today {
  background: rgba(236, 72, 153, 0.08);
  color: #c02679;
}
.sf-footer__note {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.6);
}
.sf-footer__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sf-text, #0f172a);
  font-weight: 600;
  text-decoration: none;
  padding: 4px 0;
  font-size: 15px;
  word-break: break-word;
}
.sf-footer__contact {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sf-footer__link:hover {
  color: #0f172a;
}
.sf-footer__social {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.sf-footer__social a {
  color: var(--sf-text, #0f172a);
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.sf-footer__social a:hover {
  color: color-mix(in srgb, var(--sf-primary, #ec4899) 60%, #0f172a 40%);
}
.sf-footer__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--sf-primary, #ec4899) 18%, #fff);
  font-size: 12px;
  margin-right: 6px;
  color: var(--sf-primary, #ec4899);
}
.sf-footer__review {
  font-weight: 700;
  color: var(--sf-text, #0f172a);
  gap: 10px;
}
.sf-footer__review .sf-icon-inline {
  color: #f59e0b;
}
.sf-footer__legal {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sf-footer__links {
  display: inline-flex;
  gap: 12px;
  font-weight: 700;
}
.sf-footer__links a {
  color: rgba(15, 23, 42, 0.78);
}
.sf-footer__copy {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.7);
}

.sf-footer__strip {
  position: sticky;
  bottom: 0;
  padding: 12px 0 14px;
  border-top: 1px solid color-mix(in srgb, var(--sf-border, #f4d9e7) 70%, transparent);
  background: linear-gradient(90deg, rgba(255, 247, 251, 0.92), rgba(255, 241, 245, 0.9));
  backdrop-filter: blur(4px);
}

.sf-footer__strip-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sf-footer__strip .sf-footer__links {
  gap: 14px;
}

@media (min-width: 640px) {
  .sf-footer__shell {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .sf-footer__shell {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
