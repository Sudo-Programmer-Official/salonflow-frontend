<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trackMarketingEvent } from '@/api/marketing';
import { applyMarketingSeo } from '@/utils/marketingSeo';

const route = useRoute();
const router = useRouter();
const workflowSection = ref<HTMLElement | null>(null);
const firstWeekPulse = ref(false);

const trackHomeEvent = (eventType: 'page_view' | 'cta_click' | 'request_start', payload: Record<string, any> = {}) =>
  trackMarketingEvent({
    eventType,
    sourcePage: 'marketing-home',
    path: route.fullPath,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    payload,
  });

const goToDemo = (placement = 'balanced-hero') => {
  void trackHomeEvent('cta_click', { placement, target: '/start' });
  void router.push('/start');
};

const jumpToWorkflow = () => {
  void trackHomeEvent('cta_click', { placement: 'balanced-hero-how-it-works', target: '#workflow' });
  workflowSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  firstWeekPulse.value = true;
  window.setTimeout(() => {
    firstWeekPulse.value = false;
  }, 1400);
};

const openDemoFromRoute = async () => {
  if (route.query.demo !== '1') return;
  goToDemo('query-demo');
};

onMounted(() => {
  applyMarketingSeo({ path: '/', faqs: faqItems });
  void trackHomeEvent('page_view', { page: 'home' });
  void openDemoFromRoute();
});

watch(() => route.query.demo, openDemoFromRoute);

const heroPillars = [
  { label: 'Bookings & walk-ins', icon: 'calendar' },
  { label: 'Client follow-ups', icon: 'people' },
  { label: 'Staff earnings', icon: 'coins' },
];

const featureSystems = [
  {
    title: 'Website and online booking',
    desc: 'Give new guests a polished first impression and a clear path from discovery to appointment.',
    bullets: ['Branded salon website', 'Online booking and QR check-in', 'Mobile-friendly guest experience'],
  },
  {
    title: 'Reminders and follow-up',
    desc: 'Keep appointments moving and reduce avoidable no-shows without adding more front-desk work.',
    bullets: ['Appointment reminders', 'Missed-visit follow-up', 'Cleaner daily schedule'],
  },
  {
    title: 'Customers and repeat visits',
    desc: 'Keep customer context, reviews, loyalty, and rebooking support in the same operating system.',
    bullets: ['Customer history and notes', 'Review requests and loyalty', 'Repeat-visit workflow'],
  },
  {
    title: 'Services, staff, and earnings',
    desc: 'Give owners and teams a shared view of the work happening across the salon floor.',
    bullets: ['Services and categories', 'Staff visibility', 'Earnings and billing context'],
  },
  {
    title: 'Growth tools that stay active',
    desc: 'Keep promotions, social content, and customer communication connected to the booking flow.',
    bullets: ['Social scheduling', 'Promotions and campaigns', 'Owner growth visibility'],
  },
  {
    title: 'A path to a fuller system',
    desc: 'Start with the essentials and expand into POS rollout and deeper operational control as you grow.',
    bullets: ['Start at $65/month', 'Setup included', 'Upgrade when the salon is ready'],
  },
];

const firstWeekSteps = [
  { day: 'Day 1', title: 'We set up your salon', detail: 'Your branding, services, photos, and contact information are organized into a working website.' },
  { day: 'Day 2', title: 'We import your business', detail: 'Services, pricing, staff, customers, and business settings are brought into the new setup where possible.' },
  { day: 'Day 3', title: 'Everything is connected', detail: 'Booking links, reminders, QR check-in, and notifications are configured and tested.' },
  { day: 'Day 5', title: 'Staff training', detail: 'We walk your team through the workflow and fine-tune anything that needs adjustment.' },
  { day: 'Day 7', title: 'You are fully live', detail: 'Customers can book online and your old process has been replaced with a smoother one.' },
];

const featuredClient = {
  name: 'MTV Nails',
  location: 'Corpus Christi, TX',
  website: 'https://www.mtvnailcorpuschristi.com/',
  websiteLabel: 'www.mtvnailcorpuschristi.com',
};

const pricingPlans = [
  {
    title: 'Core',
    price: '$65',
    description: 'For a polished website, fast booking, and less front-desk friction.',
    features: ['Website + online booking', 'QR check-in', 'Basic SMS reminders', 'Customer capture', 'Setup included'],
    ctaLabel: 'Try Core',
    badge: null,
  },
  {
    title: 'Growth',
    price: '$99',
    description: 'For salons ready to drive repeat visits and turn more attention into bookings.',
    features: ['Everything in Core', 'Reviews and loyalty', 'Social scheduling', 'Owner visibility', 'Growth-focused setup'],
    ctaLabel: 'Try Growth',
    badge: 'Most Popular',
  },
  {
    title: 'Complete',
    price: '$129',
    description: 'For salons that want the fullest operating layer with more control and support.',
    features: ['Everything in Growth', 'POS rollout visibility', 'Front-desk structure', 'Priority support', 'Unified setup'],
    ctaLabel: 'See Complete',
    badge: 'Best Value',
  },
];

const faqItems = [
  {
    question: 'What does SalonFlow include?',
    answer: 'SalonFlow brings your website, online booking, QR check-in, reminders, customer capture, reviews, loyalty, social scheduling, and POS rollout into one salon operating system.',
  },
  {
    question: 'Is setup included?',
    answer: 'Yes. We organize the launch around your salon, services, booking flow, and the plan you choose so your team is not left stitching the system together alone.',
  },
  {
    question: 'Do I need a long-term contract?',
    answer: 'No. Start simple, prove the value, and upgrade when your salon needs more follow-up, visibility, or POS structure.',
  },
  {
    question: 'How does SalonFlow help get more customers?',
    answer: 'It focuses on the moments that usually leak revenue: weak first impressions, lost DMs, slow follow-up, missed reminders, inconsistent reviews, and no clear repeat-visit system.',
  },
];
</script>

<template>
  <main class="marketing-balanced">
    <section class="balanced-hero">
      <div class="balanced-container balanced-hero__inner">
        <div class="balanced-hero__grid">
          <div class="balanced-hero__copy">
            <div class="balanced-eyebrow">Salon management, simplified</div>
            <h1 class="balanced-display balanced-hero__title">Your salon.<br />One simple<br />workspace.</h1>
            <p class="balanced-hero__lede">Bookings, walk-ins, client follow-ups, and staff earnings—organized in one place.</p>
            <div class="balanced-hero__actions">
              <button type="button" class="balanced-button balanced-button--primary" @click="goToDemo('balanced-hero')">Try the Demo</button>
              <button type="button" class="balanced-text-button" @click="jumpToWorkflow">See how it works <span aria-hidden="true">→</span></button>
            </div>
            <p class="balanced-hero__meta">From $65/month · Setup included · No credit card</p>
          </div>

          <div class="balanced-hero__visual">
            <div class="balanced-dashboard-frame">
              <img
                src="/images/landing/marketing-dashboard.png"
                alt="SalonFlow dashboard showing today's appointments, queue, customers, and front-desk tasks"
                width="1600"
                height="1000"
                fetchpriority="high"
              />
            </div>
            <div class="balanced-dashboard-caption">Demo workspace · Sample data</div>
          </div>
        </div>

        <div class="balanced-rail" aria-label="SalonFlow capabilities">
          <div v-for="pillar in heroPillars" :key="pillar.label" class="balanced-rail__item">
            <svg v-if="pillar.icon === 'calendar'" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="7" width="22" height="20" rx="3" /><path d="M10 4v6M22 4v6M5 13h22M10 18h4M18 18h4M10 23h4" /></svg>
            <svg v-else-if="pillar.icon === 'people'" viewBox="0 0 32 32" aria-hidden="true"><circle cx="12" cy="11" r="4" /><circle cx="22" cy="12" r="3" /><path d="M5 26c.8-4.5 3.2-7 7-7s6.2 2.5 7 7M19 20c3.4-.2 5.7 1.8 6.5 6" /></svg>
            <svg v-else viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="9" rx="9" ry="4" /><path d="M7 9v6c0 2.2 4 4 9 4s9-1.8 9-4V9M7 15v6c0 2.2 4 4 9 4s9-1.8 9-4v-6" /></svg>
            <span>{{ pillar.label }}</span>
          </div>
        </div>

        <p class="balanced-trust-line">Built alongside real salon owners in Corpus Christi</p>
      </div>
    </section>

    <section id="features" class="balanced-section balanced-section--white">
      <div class="balanced-container">
        <div class="balanced-section-heading">
          <div class="balanced-eyebrow">What lives in the workspace</div>
          <h2 class="balanced-display">The daily work of your salon, connected.</h2>
          <p>Replace scattered tools and manual follow-up with one calm operating view for the owner, team, and guest.</p>
        </div>
        <div class="balanced-feature-grid">
          <article v-for="(feature, index) in featureSystems" :key="feature.title" class="balanced-feature-card">
            <div class="balanced-feature-number">0{{ index + 1 }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
            <ul>
              <li v-for="bullet in feature.bullets" :key="bullet">{{ bullet }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section id="workflow" ref="workflowSection" class="balanced-section balanced-section--soft" :class="{ 'balanced-section--pulse': firstWeekPulse }">
      <div class="balanced-container">
        <div class="balanced-section-heading balanced-section-heading--split">
          <div>
            <div class="balanced-eyebrow">How it works</div>
            <h2 class="balanced-display">From setup to live in your first week.</h2>
          </div>
          <p>Setup is included, and the launch is organized around the way your salon already works.</p>
        </div>
        <div class="balanced-step-grid">
          <article v-for="step in firstWeekSteps" :key="step.day" class="balanced-step-card">
            <div class="balanced-step-day">{{ step.day }}</div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.detail }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="pricing" class="balanced-section balanced-section--white">
      <div class="balanced-container">
        <div class="balanced-section-heading">
          <div class="balanced-eyebrow">Simple plans</div>
          <h2 class="balanced-display">Start with what your salon needs now.</h2>
          <p>No long-term contract. Upgrade when the workflow needs more.</p>
        </div>
        <div class="balanced-pricing-grid">
          <article v-for="plan in pricingPlans" :key="plan.title" class="balanced-plan-card" :class="{ 'balanced-plan-card--featured': plan.badge === 'Most Popular' }">
            <div v-if="plan.badge" class="balanced-plan-badge">{{ plan.badge }}</div>
            <h3>{{ plan.title }}</h3>
            <div class="balanced-plan-price">{{ plan.price }}<span>/mo</span></div>
            <p>{{ plan.description }}</p>
            <ul>
              <li v-for="feature in plan.features" :key="feature"><span>✓</span>{{ feature }}</li>
            </ul>
            <button type="button" class="balanced-button" :class="plan.badge === 'Most Popular' ? 'balanced-button--primary' : 'balanced-button--outline'" @click="goToDemo(`pricing-${plan.title.toLowerCase()}`)">
              {{ plan.ctaLabel }}
            </button>
          </article>
        </div>
      </div>
    </section>

    <section class="balanced-section balanced-section--proof">
      <div class="balanced-container balanced-proof">
        <div>
          <div class="balanced-eyebrow">Real salon proof</div>
          <h2 class="balanced-display">See a real customer website before you decide.</h2>
          <p>MTV Nails in Corpus Christi is already live on SalonFlow. Inspect the public site and see how the customer-facing experience feels.</p>
          <a :href="featuredClient.website" target="_blank" rel="noreferrer" class="balanced-text-button">Visit {{ featuredClient.websiteLabel }} <span aria-hidden="true">↗</span></a>
        </div>
        <div class="balanced-proof-card">
          <div class="balanced-proof-card__label">Live customer website</div>
          <div class="balanced-proof-card__name">{{ featuredClient.name }}</div>
          <div class="balanced-proof-card__location">{{ featuredClient.location }}</div>
          <div class="balanced-proof-card__line">Public proof · Built with SalonFlow</div>
        </div>
      </div>
    </section>

    <section id="faq" class="balanced-section balanced-section--white">
      <div class="balanced-container balanced-faq">
        <div class="balanced-section-heading">
          <div class="balanced-eyebrow">Questions owners ask</div>
          <h2 class="balanced-display">Clear answers before you book a demo.</h2>
        </div>
        <div class="balanced-faq-list">
          <article v-for="faq in faqItems" :key="faq.question" class="balanced-faq-item">
            <h3>{{ faq.question }}</h3>
            <p>{{ faq.answer }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="balanced-cta">
      <div class="balanced-container balanced-cta__inner">
        <div>
          <div class="balanced-eyebrow balanced-eyebrow--light">Your next week can feel simpler.</div>
          <h2 class="balanced-display">See SalonFlow running with your salon in mind.</h2>
        </div>
        <button type="button" class="balanced-button balanced-button--light" @click="goToDemo('bottom-cta')">Try the Demo</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.marketing-balanced {
  overflow: hidden;
  background: #fcfaf7;
  color: #0d1b35;
}

.balanced-container {
  width: min(100% - 48px, 1280px);
  margin: 0 auto;
}

.balanced-display {
  margin: 0;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  letter-spacing: -0.045em;
}

.balanced-eyebrow {
  color: #3d5573;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.34em;
  line-height: 1.5;
  text-transform: uppercase;
}

.balanced-eyebrow--light {
  color: #a6e7ce;
}

.balanced-hero {
  background: radial-gradient(circle at 5% 48%, rgba(245, 228, 177, 0.3), transparent 30%), radial-gradient(circle at 100% 34%, rgba(194, 240, 216, 0.4), transparent 28%), #fcfaf7;
}

.balanced-hero__inner {
  padding: 72px 0 26px;
}

.balanced-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  align-items: center;
  gap: 64px;
}

.balanced-hero__title {
  max-width: 650px;
  margin-top: 40px;
  font-size: clamp(3.8rem, 6.3vw, 6.6rem);
  font-weight: 650;
  line-height: 0.98;
  color: #0a1833;
}

.balanced-hero__lede {
  max-width: 570px;
  margin: 34px 0 0;
  color: #4a6280;
  font-size: clamp(1.2rem, 1.7vw, 1.55rem);
  line-height: 1.55;
}

.balanced-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 28px;
  margin-top: 34px;
}

.balanced-hero__meta {
  margin: 20px 0 0;
  color: #4f6681;
  font-size: 1rem;
}

.balanced-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 28px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.balanced-button:hover {
  transform: translateY(-2px);
}

.balanced-button--primary {
  background: #07172f;
  color: #fff;
  box-shadow: 0 14px 28px rgba(7, 23, 47, 0.18);
}

.balanced-button--outline {
  border-color: #b7c5d4;
  background: #fff;
  color: #10213c;
}

.balanced-button--light {
  background: #fff;
  color: #0a1833;
}

.balanced-text-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #17365c;
  font-size: 1.05rem;
  font-weight: 700;
}

.balanced-text-button:hover span {
  transform: translateX(4px);
}

.balanced-text-button span {
  display: inline-block;
  transition: transform 160ms ease;
}

.balanced-dashboard-frame {
  overflow: hidden;
  border: 1px solid #b8c6d6;
  border-radius: 24px;
  background: #f3f6f9;
  box-shadow: 0 24px 60px rgba(16, 37, 65, 0.16);
}

.balanced-dashboard-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.balanced-dashboard-caption {
  margin-top: 17px;
  color: #4a6280;
  font-size: 0.93rem;
  text-align: center;
}

.balanced-rail {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 74px;
  border: 1px solid #d6dfe7;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.55);
}

.balanced-rail__item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 92px;
  color: #132846;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
}

.balanced-rail__item + .balanced-rail__item {
  border-left: 1px solid #d6dfe7;
}

.balanced-rail__item svg {
  width: 31px;
  height: 31px;
  fill: none;
  stroke: #294562;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.balanced-trust-line {
  margin: 30px 0 0;
  color: #49617e;
  font-size: 1.05rem;
  text-align: center;
}

.balanced-section {
  padding: 112px 0;
}

.balanced-section--white {
  background: #fff;
}

.balanced-section--soft {
  background: #f1f6f3;
  transition: box-shadow 200ms ease;
}

.balanced-section--pulse {
  box-shadow: inset 0 0 0 3px rgba(36, 169, 129, 0.16);
}

.balanced-section--proof {
  background: #0d1b35;
  color: #fff;
}

.balanced-section-heading {
  max-width: 740px;
}

.balanced-section-heading h2 {
  margin-top: 18px;
  color: #0a1833;
  font-size: clamp(2.4rem, 4.2vw, 4.4rem);
  line-height: 1.02;
}

.balanced-section-heading p {
  max-width: 620px;
  margin: 22px 0 0;
  color: #536a84;
  font-size: 1.1rem;
  line-height: 1.7;
}

.balanced-section-heading--split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  gap: 72px;
  align-items: end;
  max-width: none;
}

.balanced-section-heading--split p {
  margin-bottom: 4px;
}

.balanced-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 54px;
}

.balanced-feature-card,
.balanced-step-card,
.balanced-plan-card,
.balanced-faq-item {
  border: 1px solid #dbe3ea;
  border-radius: 22px;
  background: #fff;
}

.balanced-feature-card {
  min-height: 280px;
  padding: 27px;
}

.balanced-feature-number {
  color: #2d8e72;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.22em;
}

.balanced-feature-card h3,
.balanced-step-card h3,
.balanced-plan-card h3,
.balanced-faq-item h3 {
  margin: 18px 0 0;
  color: #0d1b35;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.balanced-feature-card p,
.balanced-step-card p,
.balanced-plan-card > p,
.balanced-faq-item p {
  margin: 11px 0 0;
  color: #5d7189;
  font-size: 0.95rem;
  line-height: 1.65;
}

.balanced-feature-card ul,
.balanced-plan-card ul {
  display: grid;
  gap: 7px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
  color: #38516d;
  font-size: 0.88rem;
}

.balanced-feature-card li::before {
  margin-right: 8px;
  color: #2d8e72;
  content: '·';
  font-weight: 900;
}

.balanced-step-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-top: 54px;
}

.balanced-step-card {
  padding: 24px;
  background: rgba(255, 255, 255, 0.68);
}

.balanced-step-day {
  color: #2d8e72;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.balanced-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 54px;
}

.balanced-plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 30px;
}

.balanced-plan-card--featured {
  border-color: #6cc7a8;
  box-shadow: 0 20px 55px rgba(36, 137, 102, 0.12);
  transform: translateY(-8px);
}

.balanced-plan-badge {
  position: absolute;
  top: 22px;
  right: 22px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #dff7eb;
  color: #187856;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.balanced-plan-price {
  margin-top: 22px;
  color: #0d1b35;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 3.1rem;
  font-weight: 700;
  letter-spacing: -0.06em;
}

.balanced-plan-price span {
  margin-left: 5px;
  color: #657991;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0;
}

.balanced-plan-card ul {
  flex: 1;
  margin-bottom: 28px;
}

.balanced-plan-card li {
  display: flex;
  gap: 8px;
}

.balanced-plan-card li span {
  color: #2d8e72;
  font-weight: 800;
}

.balanced-proof {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.72fr);
  gap: 72px;
  align-items: center;
}

.balanced-proof h2,
.balanced-cta h2 {
  margin-top: 18px;
  color: #fff;
  font-size: clamp(2.5rem, 4.4vw, 4.5rem);
  line-height: 1.02;
}

.balanced-proof p {
  max-width: 630px;
  margin: 24px 0 28px;
  color: #bdcad9;
  font-size: 1.1rem;
  line-height: 1.7;
}

.balanced-proof .balanced-text-button {
  color: #b7f0d9;
}

.balanced-proof-card {
  padding: 34px;
  border: 1px solid rgba(183, 240, 217, 0.35);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
}

.balanced-proof-card__label,
.balanced-proof-card__line {
  color: #9fb0c4;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.balanced-proof-card__name {
  margin-top: 72px;
  color: #fff;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
}

.balanced-proof-card__location {
  margin-top: 5px;
  color: #b7f0d9;
  font-size: 1rem;
}

.balanced-proof-card__line {
  margin-top: 72px;
}

.balanced-faq {
  display: grid;
  grid-template-columns: minmax(250px, 0.65fr) minmax(0, 1fr);
  gap: 70px;
  align-items: start;
}

.balanced-faq-list {
  display: grid;
  gap: 14px;
}

.balanced-faq-item {
  padding: 25px;
  background: #fbfcfd;
}

.balanced-cta {
  background: #0d1b35;
}

.balanced-cta__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 82px 0;
}

@media (max-width: 1050px) {
  .balanced-hero__grid,
  .balanced-proof {
    grid-template-columns: 1fr;
  }

  .balanced-hero__copy {
    max-width: 760px;
  }

  .balanced-hero__visual {
    max-width: 850px;
    margin: 0 auto;
  }

  .balanced-feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .balanced-step-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .balanced-faq {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .balanced-container {
    width: min(100% - 32px, 1280px);
  }

  .balanced-hero__inner {
    padding-top: 42px;
  }

  .balanced-hero__grid {
    gap: 42px;
  }

  .balanced-hero__title {
    margin-top: 28px;
    font-size: clamp(3.2rem, 15vw, 5rem);
  }

  .balanced-hero__lede {
    margin-top: 24px;
    font-size: 1.15rem;
  }

  .balanced-hero__actions {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .balanced-rail {
    grid-template-columns: 1fr;
    margin-top: 50px;
  }

  .balanced-rail__item {
    justify-content: flex-start;
    min-height: 72px;
    padding: 0 22px;
  }

  .balanced-rail__item + .balanced-rail__item {
    border-top: 1px solid #d6dfe7;
    border-left: 0;
  }

  .balanced-section {
    padding: 76px 0;
  }

  .balanced-section-heading--split,
  .balanced-feature-grid,
  .balanced-step-grid,
  .balanced-pricing-grid {
    grid-template-columns: 1fr;
  }

  .balanced-section-heading--split {
    gap: 22px;
  }

  .balanced-plan-card--featured {
    transform: none;
  }

  .balanced-cta__inner {
    align-items: flex-start;
    flex-direction: column;
    padding: 66px 0;
  }
}
</style>
