<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElAlert, ElButton, ElCard, ElColorPicker, ElInput, ElMessage, ElSkeleton } from 'element-plus';
import { fetchSettings, updateSettings, type ThemeTokens } from '../../../api/settings';
import {
  WEBSITE_THEME_PRESETS,
  isWebsiteHexColor,
  mergeWebsiteThemeTokens,
} from '../../../utils/websiteThemePresets';
import { DEFAULT_WEBSITE_THEME } from '../../../utils/websiteTheme';

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const theme = ref<ThemeTokens>(DEFAULT_WEBSITE_THEME);

const colorFields: Array<{ key: keyof ThemeTokens['colors']; label: string; detail: string }> = [
  { key: 'primary', label: 'Primary', detail: 'Buttons and accents' },
  { key: 'secondary', label: 'Secondary', detail: 'Supporting highlights' },
  { key: 'background', label: 'Background', detail: 'Page base' },
  { key: 'surface', label: 'Surface', detail: 'Cards and panels' },
  { key: 'textPrimary', label: 'Text', detail: 'Headings and body' },
  { key: 'textMuted', label: 'Muted text', detail: 'Supporting copy' },
];

const selectedPreset = computed(() => WEBSITE_THEME_PRESETS.find((preset) => preset.key === theme.value.presetKey));

const load = async () => {
  loading.value = true;
  try {
    const settings = await fetchSettings();
    theme.value = settings.themeTokens ?? DEFAULT_WEBSITE_THEME;
  } catch (err: any) {
    error.value = err?.message || 'Failed to load website theme';
  } finally {
    loading.value = false;
  }
};

const applyPreset = (preset: (typeof WEBSITE_THEME_PRESETS)[number]) => {
  theme.value = mergeWebsiteThemeTokens(theme.value, preset.tokens);
};

const setColor = (key: keyof ThemeTokens['colors'], value: string | null) => {
  if (!value) return;
  if (!isWebsiteHexColor(value)) {
    ElMessage.error('Use a 6-digit hex color such as #be185d.');
    return;
  }
  theme.value = mergeWebsiteThemeTokens(theme.value, { colors: { [key]: value } });
};

const reset = () => {
  const legacy = WEBSITE_THEME_PRESETS.find((preset) => preset.key === 'legacy');
  theme.value = mergeWebsiteThemeTokens(DEFAULT_WEBSITE_THEME, legacy?.tokens);
};

const save = async () => {
  saving.value = true;
  try {
    const settings = await updateSettings({ themeTokens: theme.value });
    theme.value = settings.themeTokens ?? DEFAULT_WEBSITE_THEME;
    ElMessage.success('Website theme saved.');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save website theme');
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="mb-1 text-sm text-slate-500">
          <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
          <span class="mx-2">/</span> Theme
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">Website Theme</h1>
        <p class="text-sm text-slate-600">Choose a starting style, then tune the public website colors for this tenant.</p>
      </div>
      <div class="flex gap-2">
        <ElButton @click="reset">Reset to current</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">Save theme</ElButton>
      </div>
    </div>

    <ElAlert v-if="error" type="error" :closable="false" :title="error" />

    <ElCard shadow="never" :loading="loading" class="border border-slate-200">
      <ElSkeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-900">Theme preset</div>
            <div class="text-xs text-slate-600">{{ selectedPreset?.description || 'Custom colors' }}</div>
          </div>
          <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {{ selectedPreset?.label || 'Custom' }}
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ElButton
            v-for="preset in WEBSITE_THEME_PRESETS"
            :key="preset.key"
            class="!m-0 !h-auto !justify-start !py-3"
            :type="theme.presetKey === preset.key ? 'primary' : 'default'"
            plain
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </ElButton>
        </div>

        <div class="my-6 grid gap-3 md:grid-cols-3">
          <div v-for="color in colorFields" :key="color.key" class="rounded-xl border border-slate-200 bg-white p-3">
            <div class="mb-2 text-sm font-semibold text-slate-900">{{ color.label }}</div>
            <div class="mb-3 text-xs text-slate-500">{{ color.detail }}</div>
            <div class="flex items-center gap-2">
              <ElColorPicker
                :model-value="theme.colors[color.key]"
                :show-alpha="false"
                @change="(value: string | null) => setColor(color.key, value)"
              />
              <ElInput
                :model-value="theme.colors[color.key]"
                maxlength="7"
                @change="(value: string) => setColor(color.key, value)"
              />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 p-5" :style="{ background: theme.colors.background, color: theme.colors.textPrimary }">
          <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" :style="{ color: theme.colors.textMuted }">Live preview</div>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="text-xl font-semibold">A website that feels like your business</div>
              <div class="mt-1 text-sm" :style="{ color: theme.colors.textMuted }">Preview the selected color system before saving.</div>
            </div>
            <button class="rounded-full px-4 py-2 text-sm font-semibold text-white" :style="{ background: theme.colors.primary }">Book appointment</button>
          </div>
        </div>

        <div class="mt-4 text-xs text-slate-500">This editor changes the public website only. Kiosk colors and kiosk layout remain in Settings.</div>
      </template>
    </ElCard>
  </div>
</template>
