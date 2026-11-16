<template>
  <div class="marketing-shell flex flex-col bg-slate-50 text-slate-900">
    <header class="marketing-header">
      <div class="marketing-header__inner">
        <RouterLink to="/" class="marketing-brand">
          <img src="/images/landing/marketing-mark.webp" alt="" class="marketing-brand__icon" />
          <span>SalonFlow</span>
        </RouterLink>
        <nav class="marketing-nav" aria-label="Main navigation">
          <a href="/#features">Features</a>
          <a href="/#workflow">How It Works</a>
          <a href="/#pricing">Pricing</a>
          <RouterLink to="/salon-login">Login</RouterLink>
          <RouterLink class="marketing-nav__cta" to="/start">Try the Demo</RouterLink>
        </nav>
      </div>
    </header>
    <main class="marketing-content flex-1">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import SiteFooter from '../components/SiteFooter.vue';
</script>

<style scoped>
.marketing-header {
  position: relative;
  z-index: 2;
  border-bottom: 1px solid rgba(214, 223, 231, 0.72);
  background: rgba(252, 250, 247, 0.92);
  backdrop-filter: blur(18px);
}

.marketing-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100% - 48px, 1280px);
  min-height: 86px;
  margin: 0 auto;
  gap: 28px;
}

.marketing-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #0a1833;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.marketing-brand__icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.marketing-nav {
  display: flex;
  align-items: center;
  gap: 38px;
  color: #0d1b35;
  font-size: 0.96rem;
  font-weight: 600;
}

.marketing-nav a {
  transition: color 160ms ease, transform 160ms ease;
}

.marketing-nav a:hover {
  color: #2d8e72;
}

.marketing-nav__cta {
  display: inline-flex;
  align-items: center;
  min-height: 49px;
  padding: 0 24px;
  border-radius: 999px;
  background: #07172f;
  color: #fff !important;
  box-shadow: 0 10px 22px rgba(7, 23, 47, 0.16);
}

.marketing-nav__cta:hover {
  transform: translateY(-2px);
}

.marketing-shell {
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}
.marketing-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

@media (max-width: 720px) {
  .marketing-header__inner {
    width: min(100% - 32px, 1280px);
    min-height: 72px;
  }

  .marketing-nav {
    gap: 12px;
    font-size: 0.78rem;
  }

  .marketing-nav > a:not(.marketing-nav__cta) {
    display: none;
  }

  .marketing-nav__cta {
    min-height: 42px;
    padding: 0 15px;
  }
}
</style>
