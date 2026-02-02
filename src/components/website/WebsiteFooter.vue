<script setup lang="ts">
import { computed } from 'vue';

type HoursRow = { day: string; open: string; close: string };

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

const hours = computed(() => {
  const manual = props.footer?.hours?.manual || [];
  if (manual.length) {
    return manual
      .map((row) => ({
        day: row.day,
        open: row.open,
        close: row.close,
      }))
      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
  }
  if (props.fallbackHoursText) {
    return [{ day: 'Hours', open: props.fallbackHoursText, close: '' }];
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
</script>

<template>
  <footer v-if="footer?.enabled !== false" class="sf-footer">
    <div class="sf-container sf-footer__shell">
      <div v-if="hasLocation" class="sf-footer__card">
        <div class="sf-footer__label">Location</div>
        <p class="sf-footer__text" v-for="line in locationLines" :key="line">{{ line }}</p>
      </div>

      <div v-if="hasHours" class="sf-footer__card">
        <div class="sf-footer__label">Business Hours</div>
        <div class="sf-footer__hours">
          <div v-for="row in hours" :key="row.day" class="sf-footer__hour">
            <span class="day">{{ row.day }}</span>
            <span class="time">{{ row.close ? `${row.open} – ${row.close}` : row.open }}</span>
          </div>
        </div>
        <p v-if="footer?.hours?.source === 'kiosk' && !footer?.hours?.manual?.length" class="sf-footer__note">
          Synced from kiosk hours
        </p>
      </div>

      <div v-if="hasContact" class="sf-footer__card">
        <div class="sf-footer__label">Contact</div>
        <a v-if="contact?.phone" class="sf-footer__link" :href="`tel:${contact.phone}`">{{ contact.phone }}</a>
        <a v-if="contact?.email" class="sf-footer__link" :href="`mailto:${contact.email}`">{{ contact.email }}</a>
      </div>

      <div v-if="hasSocial" class="sf-footer__card">
        <div class="sf-footer__label">Follow Us</div>
        <div class="sf-footer__social">
          <a v-if="social.instagram" :href="social.instagram" target="_blank" rel="noopener" aria-label="Instagram">
            <span class="sf-footer__pill">IG</span> Instagram
          </a>
          <a v-if="social.facebook" :href="social.facebook" target="_blank" rel="noopener" aria-label="Facebook">
            <span class="sf-footer__pill">f</span> Facebook
          </a>
          <a v-if="social.google" :href="social.google" target="_blank" rel="noopener" aria-label="Google">
            <span class="sf-footer__pill">G</span> Google
          </a>
          <a
            v-if="social.google"
            :href="social.google"
            target="_blank"
            rel="noopener"
            class="sf-footer__review"
          >
            ★ Review us on Google
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
  background: color-mix(in srgb, var(--sf-bg, #0f172a) 4%, #0b1220 2%);
  color: var(--sf-text, #0f172a);
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  margin-top: 64px;
}
.sf-footer__shell {
  padding: 36px 0 30px;
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
}
.sf-footer__card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: var(--sf-radius, 14px);
  padding: 16px;
  box-shadow: var(--sf-shadow, 0 16px 40px rgba(15, 23, 42, 0.08));
}
.sf-footer__label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.6);
  margin-bottom: 8px;
}
.sf-footer__text {
  margin: 0;
  font-weight: 600;
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
}
.sf-footer__hour .day {
  color: rgba(15, 23, 42, 0.7);
}
.sf-footer__hour .time {
  color: var(--sf-text, #0f172a);
}
.sf-footer__note {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.6);
}
.sf-footer__link {
  display: block;
  color: var(--sf-text, #0f172a);
  font-weight: 600;
  text-decoration: none;
}
.sf-footer__link:hover {
  text-decoration: underline;
}
.sf-footer__social {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sf-footer__social a {
  color: var(--sf-text, #0f172a);
  font-weight: 600;
  text-decoration: none;
}
.sf-footer__social a:hover {
  text-decoration: underline;
}
.sf-footer__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.08);
  font-size: 12px;
  margin-right: 6px;
}
.sf-footer__review {
  font-weight: 700;
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
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: color-mix(in srgb, var(--sf-bg, #0f172a) 6%, #ffffff 94%);
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
