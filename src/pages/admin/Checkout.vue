<script setup lang="ts">
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElButton, ElCard, ElSkeleton, ElMessage, ElInput, ElTag } from 'element-plus';
import { fetchQueue, type QueueItem } from '@/api/queue';
import { formatPhone } from '@/utils/format';
import { humanizeTime } from '@/utils/dates';
import { fetchServices, type ServiceItem } from '@/api/services';
import { fetchCategories, type ServiceCategory } from '@/api/serviceCategories';

const route = useRoute();
const router = useRouter();
const checkinId = computed(() => route.params.checkinId as string);

const loading = ref(true);
const item = ref<QueueItem | null>(null);
const categories = ref<ServiceCategory[]>([]);
const services = ref<ServiceItem[]>([]);
const selectedCategory = ref<string>('all');
const search = ref('');
const draftSelections = ref<Record<string, string[]>>({});

const DRAFT_KEY = 'checkoutDraftSelections';

const loadDrafts = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    draftSelections.value = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    draftSelections.value = {};
  }
};

const persistDrafts = () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftSelections.value));
};

const selectedServiceIds = computed({
  get: () => draftSelections.value[checkinId.value] ?? [],
  set: (ids: string[]) => {
    draftSelections.value = { ...draftSelections.value, [checkinId.value]: ids };
  },
});

const filteredCategories = computed(() =>
  categories.value.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
);

const filteredServices = computed(() => {
  const q = search.value.trim().toLowerCase();
  return services.value
    .filter((svc) => svc.isActive !== false)
    .filter((svc) => {
      if (selectedCategory.value === 'all') return true;
      if (selectedCategory.value === 'uncategorized') return !svc.categoryId;
      return svc.categoryId === selectedCategory.value;
    })
    .filter((svc) => (q ? svc.name.toLowerCase().includes(q) : true));
});

const selectedServiceObjects = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s]));
  return selectedServiceIds.value
    .map((id) => map.get(id))
    .filter((s): s is ServiceItem => Boolean(s));
});

const subtotal = computed(() =>
  selectedServiceObjects.value.reduce((acc, svc) => acc + (svc.priceCents ?? 0), 0) / 100,
);
const hasDraft = computed(() => selectedServiceIds.value.length > 0);

const loadCheckin = async () => {
  loading.value = true;
  try {
    // Pull current in-service items and locate the target check-in
    const res = await fetchQueue({ status: 'IN_SERVICE', limit: 100 });
    const list = (res as any).items ?? [];
    const match = list.find((q: QueueItem) => q.id === checkinId.value) as QueueItem | undefined;
    if (!match) {
      ElMessage.warning('Start service before checkout');
      router.replace({ name: 'admin-queue' });
      return;
    }
    item.value = match;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load checkout');
    router.replace({ name: 'admin-queue' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push({ name: 'admin-queue' });
};

onMounted(() => {
  loadDrafts();
  loadCheckin();
  Promise.all([fetchCategories(), fetchServices()])
    .then(([cats, svcs]) => {
      categories.value = cats;
      services.value = svcs;
    })
    .catch(() => {
      categories.value = [];
      services.value = [];
    });
});

watch(
  () => draftSelections.value,
  () => persistDrafts(),
  { deep: true },
);

const toggleService = (id: string) => {
  const current = new Set(selectedServiceIds.value);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  selectedServiceIds.value = Array.from(current);
};

const isSelected = (id: string) => selectedServiceIds.value.includes(id);

// Leave guards to prevent accidental loss of checkout draft
const beforeUnload = (e: BeforeUnloadEvent) => {
  if (!hasDraft.value) return;
  e.preventDefault();
  e.returnValue = '';
};

watch(
  () => hasDraft.value,
  (val) => {
    if (val) {
      window.addEventListener('beforeunload', beforeUnload);
    } else {
      window.removeEventListener('beforeunload', beforeUnload);
    }
  },
  { immediate: true },
);

onBeforeRouteLeave((_to, _from, next) => {
  if (!hasDraft.value) return next();
  const confirmLeave = window.confirm('You have an in-progress checkout. Leave anyway?');
  return confirmLeave ? next() : next(false);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>

<template>
  <div class="checkout-shell">
    <header class="checkout-header">
      <div class="header-left">
        <ElButton text type="primary" size="large" @click="goBack">← Back to Queue</ElButton>
        <div v-if="item" class="customer-meta">
          <div class="customer-name">{{ item.customerName || 'Customer' }}</div>
          <div class="customer-phone">{{ formatPhone(item.customerPhone) }}</div>
          <div class="customer-meta-sub">
            <span v-if="item.serviceName">Service: {{ item.serviceName }}</span>
            <span v-if="item.startedAt"> • In service for {{ humanizeTime(item.startedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <ElButton plain size="large" @click="goBack">Cancel</ElButton>
        <ElButton type="success" size="large" disabled>Complete checkout</ElButton>
      </div>
    </header>

    <main class="checkout-body">
      <!-- Column 1: Categories -->
      <section class="checkout-panel categories">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Categories</div>
          <div class="panel-sub">Pick a category to filter services.</div>
          <div class="category-list">
            <button
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === 'all' }"
              @click="selectedCategory = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === 'uncategorized' }"
              @click="selectedCategory = 'uncategorized'"
            >
              Uncategorized
            </button>
            <button
              v-for="cat in filteredCategories"
              :key="cat.id"
              type="button"
              class="category-pill"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <span class="cat-icon">{{ cat.icon || '🗂' }}</span>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Column 2: Services -->
      <section class="checkout-panel services">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="8" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Services</div>
          <div class="panel-sub">Tap to add/remove. Filters by category.</div>
          <ElInput
            v-model="search"
            size="large"
            placeholder="Search services"
            class="mb-3"
            clearable
          />
          <div v-if="!filteredServices.length" class="empty-state">No services match.</div>
          <div v-else class="service-grid">
            <button
              v-for="svc in filteredServices"
              :key="svc.id"
              type="button"
              class="service-tile"
              :class="{ active: isSelected(svc.id) }"
              @click="toggleService(svc.id)"
            >
              <div class="svc-top">
                <span class="svc-icon">{{ svc.icon || '💅' }}</span>
                <span v-if="isSelected(svc.id)" class="svc-check">✓</span>
              </div>
              <div class="svc-name">{{ svc.name }}</div>
              <div class="svc-meta">
                <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                <span v-if="svc.priceCents !== undefined && svc.priceCents !== null">
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: svc.currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format((svc.priceCents ?? 0) / 100)
                  }}
                </span>
              </div>
            </button>
          </div>
        </ElCard>
      </section>

      <!-- Column 3: Bill -->
      <section class="checkout-panel bill">
        <ElCard v-if="loading" class="glass-card" shadow="never">
          <ElSkeleton :rows="6" animated />
        </ElCard>
        <ElCard v-else class="glass-card" shadow="never">
          <div class="panel-title">Bill</div>
          <div class="panel-sub">Review and complete checkout.</div>

          <div v-if="!selectedServiceObjects.length" class="empty-state">
            Add services to build the bill.
          </div>
          <div v-else class="selected-list">
            <div
              v-for="svc in selectedServiceObjects"
              :key="svc.id"
              class="selected-row"
            >
              <div class="selected-name">
                {{ svc.name }}
              </div>
              <div class="selected-meta">
                <span v-if="svc.durationMinutes">{{ svc.durationMinutes }} min</span>
                <span v-if="svc.priceCents !== undefined && svc.priceCents !== null">
                  {{
                    Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: svc.currency || 'USD',
                      minimumFractionDigits: 2,
                    }).format((svc.priceCents ?? 0) / 100)
                  }}
                </span>
              </div>
              <button class="remove-btn" type="button" @click="toggleService(svc.id)">✕</button>
            </div>
          </div>

          <div class="bill-summary">
            <div class="bill-row">
              <span>Subtotal</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}</span>
            </div>
            <div class="bill-row">
              <span>Tax</span>
              <span>—</span>
            </div>
            <div class="bill-row total">
              <span>Total</span>
              <span>{{ Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal) }}</span>
            </div>
          </div>

          <div class="bill-actions">
            <ElButton plain size="large" @click="goBack">Cancel</ElButton>
            <ElButton type="success" size="large" disabled>Complete checkout</ElButton>
          </div>
        </ElCard>
      </section>
    </main>
  </div>
</template>

<style scoped>
.checkout-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  padding: 18px 20px 24px;
  gap: 16px;
}
.checkout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  position: sticky;
  top: 0;
  z-index: 5;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.customer-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.customer-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.customer-phone {
  font-size: 14px;
  color: #475569;
}
.customer-meta-sub {
  font-size: 13px;
  color: #64748b;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.checkout-body {
  display: grid;
  grid-template-columns: 1.2fr 1.8fr 1.8fr;
  gap: 16px;
  align-items: start;
}
.checkout-panel {
  min-height: 480px;
}
.glass-card {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}
.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.panel-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}
.bill-placeholder {
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  color: #475569;
  background: rgba(248, 250, 252, 0.8);
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.category-pill {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  text-align: left;
  font-weight: 600;
  color: #0f172a;
  transition: all 0.15s ease;
}
.category-pill:hover {
  border-color: rgba(59, 130, 246, 0.6);
}
.category-pill.active {
  border-color: rgba(59, 130, 246, 0.9);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
  background: linear-gradient(180deg, #f0f7ff, #ffffff);
}
.cat-icon {
  font-size: 18px;
}
.cat-name {
  flex: 1;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.service-tile {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.12s ease;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  position: relative;
}
.service-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}
.service-tile.active {
  border-color: rgba(34, 197, 94, 0.9);
  box-shadow: 0 10px 28px rgba(34, 197, 94, 0.16);
  background: linear-gradient(180deg, #f5fff7, #ffffff);
}
.svc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.svc-check {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  box-shadow: 0 6px 14px rgba(22, 163, 74, 0.35);
}
.svc-icon {
  font-size: 18px;
}
.svc-name {
  font-weight: 700;
  color: #0f172a;
}
.svc-meta {
  font-size: 12px;
  color: #475569;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.selected-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
}
.selected-name {
  font-weight: 600;
  color: #0f172a;
}
.selected-meta {
  font-size: 12px;
  color: #475569;
  display: flex;
  gap: 8px;
}
.remove-btn {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}
.bill-summary {
  margin-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #0f172a;
}
.bill-row.total {
  font-size: 18px;
  font-weight: 800;
}
.bill-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.empty-state {
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  color: #475569;
  text-align: center;
}
@media (max-width: 1024px) {
  .checkout-body {
    grid-template-columns: 1fr;
  }
}
</style>
