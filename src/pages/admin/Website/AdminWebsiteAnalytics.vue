<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElSelect, ElOption, ElTable, ElTableColumn, ElMessage, ElTag } from 'element-plus';
import { fetchWebsiteAnalyticsSummary } from '../../../api/website';

const loading = ref(false);
const rows = ref<Array<{ event_type: string; path: string | null; count: number; locale?: string | null }>>([]);
const days = ref(30);
const locale = ref<string>('');

const pageViewByLocale = () => {
  const agg: Record<string, number> = {};
  rows.value
    .filter((r) => r.event_type === 'page_view')
    .forEach((r) => {
      const key = r.locale || 'unknown';
      agg[key] = (agg[key] || 0) + r.count;
    });
  return agg;
};

const clicksBreakdown = () => {
  const agg: Record<string, number> = { click_call: 0, click_directions: 0 };
  rows.value
    .filter((r) => r.event_type === 'click_call' || r.event_type === 'click_directions')
    .forEach((r) => {
      agg[r.event_type] = (agg[r.event_type] || 0) + r.count;
    });
  return agg;
};

const load = async () => {
  loading.value = true;
  try {
    rows.value = await fetchWebsiteAnalyticsSummary(days.value, locale.value || undefined);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load analytics');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Website Analytics</h1>
          <p class="text-sm text-slate-600">First-party events only. No external trackers.</p>
      </div>
      <div class="flex items-center gap-2">
        <ElSelect v-model="locale" placeholder="All locales" size="small" style="width: 140px" @change="load">
          <ElOption label="All locales" value="" />
          <ElOption label="English" value="en" />
          <ElOption label="Español" value="es" />
        </ElSelect>
        <ElSelect v-model="days" size="small" style="width: 140px" @change="load">
          <ElOption :value="7" label="Last 7 days" />
          <ElOption :value="30" label="Last 30 days" />
          <ElOption :value="60" label="Last 60 days" />
        </ElSelect>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <ElCard shadow="never" class="border border-slate-200">
        <div class="mb-3 text-sm font-semibold text-slate-800">Page views by locale (stacked)</div>
        <div class="space-y-2">
          <template v-if="Object.keys(pageViewByLocale()).length">
            <div class="h-4 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                v-for="(value, key) in pageViewByLocale()"
                :key="key"
                class="h-full inline-block"
                :style="{
                  width: ((value / Math.max(1, Object.values(pageViewByLocale()).reduce((a,b)=>a+b,0))) * 100) + '%',
                  backgroundColor: key === 'es' ? '#22c55e' : key === 'en' ? '#0ea5e9' : '#cbd5e1',
                }"
                :title="`${key}: ${value}`"
              />
            </div>
            <div class="flex flex-wrap gap-3 text-xs text-slate-600">
              <span
                v-for="(value, key) in pageViewByLocale()"
                :key="key"
                class="inline-flex items-center gap-1"
              >
                <span
                  class="h-3 w-3 rounded-sm inline-block"
                  :style="{ backgroundColor: key === 'es' ? '#22c55e' : key === 'en' ? '#0ea5e9' : '#cbd5e1' }"
                />
                {{ key }}: {{ value }}
              </span>
            </div>
          </template>
          <div v-else class="text-xs text-slate-500">No data yet.</div>
        </div>
      </ElCard>

      <ElCard shadow="never" class="border border-slate-200">
        <div class="mb-3 text-sm font-semibold text-slate-800">CTA clicks</div>
        <div class="space-y-2">
          <div class="h-4 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              class="h-full inline-block bg-amber-400"
              :style="{ width: (( (clicksBreakdown().click_call || 0) / Math.max(1, (clicksBreakdown().click_call || 0) + (clicksBreakdown().click_directions || 0))) * 100) + '%' }"
              title="Call clicks"
            />
            <div
              class="h-full inline-block bg-emerald-400"
              :style="{ width: (( (clicksBreakdown().click_directions || 0) / Math.max(1, (clicksBreakdown().click_call || 0) + (clicksBreakdown().click_directions || 0))) * 100) + '%' }"
              title="Directions clicks"
            />
          </div>
          <div class="flex gap-4 text-xs text-slate-600">
            <span class="inline-flex items-center gap-1">
              <span class="h-3 w-3 rounded-sm inline-block bg-amber-400" /> Call: {{ clicksBreakdown().click_call || 0 }}
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="h-3 w-3 rounded-sm inline-block bg-emerald-400" /> Directions: {{ clicksBreakdown().click_directions || 0 }}
            </span>
          </div>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="rows" style="width: 100%">
        <ElTableColumn prop="event_type" label="Event">
          <template #default="{ row }">
            <ElTag size="small" type="info">{{ row.event_type }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="locale" label="Locale" width="120">
          <template #default="{ row }">
            <ElTag size="small" effect="plain" type="success">{{ row.locale || '—' }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="path" label="Path" />
        <ElTableColumn prop="count" label="Count" width="120" />
      </ElTable>
      <div v-if="!loading && rows.length === 0" class="text-sm text-slate-600 py-4">
        No events yet.
      </div>
    </ElCard>
  </div>
</template>
