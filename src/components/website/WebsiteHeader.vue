<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    brand?: string;
    nav?: Array<{ label: string; path: string }>;
    activePath?: string;
    ctas?: {
      call?: { enabled?: boolean; phone?: string | null };
      book?: { enabled?: boolean; url?: string | null };
    };
  }>(),
  {
    brand: 'SalonFlow',
    nav: () => [],
    activePath: '/',
    ctas: () => ({
      call: { enabled: true, phone: null },
      book: { enabled: true, url: '/check-in/book' },
    }),
  },
);

const mobileOpen = ref(false);

const navItems = computed(() => (Array.isArray(props.nav) ? props.nav : []).filter((n) => n?.label && n?.path));
const normalizedPhone = computed(() => {
  const raw = props.ctas?.call?.phone || '';
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return raw;
});
const bookUrl = computed(() => props.ctas?.book?.url || '/check-in/book');
const isExternalBook = computed(() => /^https?:\/\//i.test(bookUrl.value));

const isActive = (path: string) => {
  const current = props.activePath || '/';
  return current === path || current.replace(/\/$/, '') === path.replace(/\/$/, '');
};
</script>

<template>
  <header class="sf-header">
    <div class="sf-container sf-header__bar">
      <div class="sf-header__brand">
        <div class="sf-header__brand-mark">{{ brand?.[0] || 'S' }}</div>
        <div class="sf-header__brand-text">
          <div class="sf-header__brand-name">{{ brand || 'SalonFlow' }}</div>
          <div class="sf-header__brand-tag">Premium salon experience</div>
        </div>
      </div>

      <button class="sf-header__menu" @click="mobileOpen = !mobileOpen" aria-label="Toggle navigation">
        <span :class="{ open: mobileOpen }"></span>
        <span :class="{ open: mobileOpen }"></span>
      </button>

      <nav class="sf-header__nav" :class="{ open: mobileOpen }">
        <a
          v-for="item in navItems"
          :key="item.path"
          class="sf-header__link"
          :class="{ active: isActive(item.path) }"
          :href="item.path"
          @click="mobileOpen = false"
        >
          {{ item.label }}
        </a>
      </nav>

      <div class="sf-header__ctas">
        <a
          v-if="ctas?.call?.enabled && normalizedPhone"
          class="sf-button ghost"
          :href="`tel:${normalizedPhone}`"
        >
          📞 Call
        </a>
        <component
          v-if="ctas?.book?.enabled"
          :is="isExternalBook ? 'a' : 'a'"
          class="sf-button solid"
          :href="bookUrl"
          :target="isExternalBook ? '_blank' : undefined"
          rel="noopener"
        >
          📅 Book
        </component>
      </div>
    </div>
  </header>
</template>

<style scoped>
.sf-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--sf-bg, #f8fafc) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.sf-header__bar {
  padding: 14px 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}
.sf-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.sf-header__brand-mark {
  width: 40px;
  height: 40px;
  border-radius: var(--sf-radius, 14px);
  background: color-mix(in srgb, var(--sf-primary, #0ea5e9) 10%, #0f172a 90%);
  color: #fff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--sf-shadow, 0 12px 30px rgba(15, 23, 42, 0.14));
}
.sf-header__brand-text {
  line-height: 1.1;
}
.sf-header__brand-name {
  font-weight: 700;
  color: var(--sf-text, #0f172a);
}
.sf-header__brand-tag {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.6);
}
.sf-header__menu {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  padding: 8px 10px;
}
.sf-header__menu span {
  width: 18px;
  height: 2px;
  background: var(--sf-text, #0f172a);
  border-radius: 2px;
  transition: transform 180ms ease, opacity 180ms ease;
}
.sf-header__menu span.open:nth-child(1) {
  transform: translateY(3px) rotate(45deg);
}
.sf-header__menu span.open:nth-child(2) {
  transform: translateY(-3px) rotate(-45deg);
}
.sf-header__nav {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  justify-content: flex-end;
}
.sf-header__link {
  font-weight: 600;
  font-size: 14px;
  color: rgba(15, 23, 42, 0.8);
  padding: 8px 10px;
  border-radius: 12px;
  transition: color 150ms ease, background 150ms ease;
}
.sf-header__link:hover {
  color: var(--sf-text, #0f172a);
  background: rgba(15, 23, 42, 0.05);
}
.sf-header__link.active {
  color: var(--sf-primary, #0ea5e9);
  background: rgba(14, 165, 233, 0.12);
}
.sf-header__ctas {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.sf-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: var(--sf-radius, 14px);
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.sf-button.solid {
  background: var(--sf-primary, #0ea5e9);
  color: #fff;
  box-shadow: var(--sf-shadow, 0 12px 30px rgba(15, 23, 42, 0.12));
}
.sf-button.solid:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 36px rgba(14, 165, 233, 0.25);
}
.sf-button.ghost {
  background: rgba(14, 165, 233, 0.12);
  color: var(--sf-primary, #0ea5e9);
}
.sf-button.ghost:hover {
  transform: translateY(-1px);
}

@media (max-width: 860px) {
  .sf-header__bar {
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    align-items: start;
  }
  .sf-header__menu {
    display: inline-flex;
    justify-self: end;
  }
  .sf-header__nav {
    grid-column: 1 / -1;
    width: 100%;
    flex-wrap: wrap;
    padding: 6px 0;
    display: none;
  }
  .sf-header__nav.open {
    display: flex;
  }
  .sf-header__ctas {
    display: none;
  }
}
</style>
