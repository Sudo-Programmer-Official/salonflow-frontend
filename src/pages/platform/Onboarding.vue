<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElButton, ElCard, ElDrawer, ElDescriptions, ElDescriptionsItem, ElMessage, ElProgress, ElTable, ElTableColumn, ElTag } from 'element-plus';
import dayjs from 'dayjs';
import { fetchOnboardingProjects, fetchOnboardingProject, updateOnboardingTask, type OnboardingProject } from '../../api/platformOnboarding';

const loading = ref(false);
const projects = ref<OnboardingProject[]>([]);
const detailOpen = ref(false);
const selected = ref<OnboardingProject | null>(null);
const taskLoadingKey = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  try {
    const response = await fetchOnboardingProjects();
    projects.value = response.projects as OnboardingProject[];
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load onboarding projects');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void load();
});

const formatDate = (value: string | null | undefined) => (value ? dayjs(value).format('MMM D, YYYY HH:mm') : '—');

const stageType = (stage: string) => {
  if (stage === 'LIVE') return 'success';
  if (stage === 'VALIDATION' || stage === 'DEPLOYMENT' || stage === 'WEBSITE') return 'warning';
  if (stage === 'PAUSED' || stage === 'ARCHIVED') return 'danger';
  return 'info';
};

const openDetail = async (row: OnboardingProject) => {
  detailOpen.value = true;
  try {
    const response = await fetchOnboardingProject(row.id);
    selected.value = response.project;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load onboarding project');
  }
};

const refreshDetail = async () => {
  if (!selected.value) return;
  const response = await fetchOnboardingProject(selected.value.id);
  selected.value = response.project;
};

const toggleTask = async (taskKey: string, nextStatus: 'DONE' | 'PENDING') => {
  if (!selected.value) return;
  taskLoadingKey.value = taskKey;
  try {
    const response = await updateOnboardingTask(selected.value.id, taskKey, {
      status: nextStatus,
      completedBy: nextStatus === 'DONE' ? 'platform-admin' : null,
      completedAt: nextStatus === 'DONE' ? new Date().toISOString() : null,
    });
    selected.value = response.project;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update task');
  } finally {
    taskLoadingKey.value = null;
  }
};

const completion = computed(() => {
  const count = projects.value.length;
  const live = projects.value.filter((project) => project.stage === 'LIVE').length;
  const active = projects.value.filter((project) => project.stage !== 'LIVE').length;
  return { count, live, active };
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Onboarding</h1>
        <p class="mt-1 text-sm text-slate-600">Operational queue for every active salon onboarding project.</p>
      </div>
      <ElButton :loading="loading" @click="load">Refresh</ElButton>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Projects</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ completion.count }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ completion.live }}</div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">In progress</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ completion.active }}</div>
      </ElCard>
    </div>

    <ElCard class="bg-white">
      <ElTable :data="projects" stripe style="width: 100%" v-loading="loading">
        <ElTableColumn label="Salon" min-width="220">
          <template #default="{ row }">
            <div class="space-y-1">
              <div class="font-semibold text-slate-900">{{ row.businessName }}</div>
              <div class="text-xs text-slate-500">{{ row.subdomain }} · {{ row.ownerEmail || '—' }}</div>
              <div class="text-xs text-slate-500">Created {{ formatDate(row.createdAt) }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Stage" min-width="140">
          <template #default="{ row }">
            <ElTag :type="stageType(row.stage)">{{ row.stage }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Progress" min-width="180">
          <template #default="{ row }">
            <div class="space-y-1">
              <ElProgress :percentage="row.progress" :stroke-width="10" />
              <div class="text-xs text-slate-500">{{ row.progress }}%</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Next action" min-width="200">
          <template #default="{ row }">
            <div class="text-sm text-slate-700">{{ row.nextAction || '—' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Assigned" min-width="140">
          <template #default="{ row }">
            <div class="text-sm text-slate-700">{{ row.assignedToUserId || 'Unassigned' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Updated" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastActivityAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="120">
          <template #default="{ row }">
            <ElButton size="small" @click="openDetail(row)">Open</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && !projects.length" class="py-6 text-center text-sm text-slate-500">
        No onboarding projects yet.
      </div>
    </ElCard>

    <ElDrawer v-model="detailOpen" title="Onboarding project" size="48%">
      <div v-if="selected" class="space-y-5">
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="Salon">{{ selected.businessName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Stage">{{ selected.stage }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Progress">{{ selected.progress }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="Next action">{{ selected.nextAction || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Source">{{ selected.source }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Last updated">{{ formatDate(selected.lastActivityAt) }}</ElDescriptionsItem>
        </ElDescriptions>

        <ElCard>
          <div class="text-sm font-semibold text-slate-900">Tasks</div>
          <div class="mt-4 space-y-3">
            <div v-for="task in selected.tasks" :key="task.taskKey" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-slate-900">{{ task.title }}</div>
                  <div class="text-xs text-slate-500">{{ task.category }} · {{ task.status }}</div>
                </div>
                <ElButton
                  size="small"
                  :loading="taskLoadingKey === task.taskKey"
                  @click="toggleTask(task.taskKey, task.status === 'DONE' ? 'PENDING' : 'DONE')"
                >
                  {{ task.status === 'DONE' ? 'Reopen' : 'Mark done' }}
                </ElButton>
              </div>
              <div class="mt-2 text-xs text-slate-500">
                {{ task.completedBy || '—' }} · {{ formatDate(task.completedAt) }}
              </div>
            </div>
          </div>
        </ElCard>

        <ElCard>
          <div class="text-sm font-semibold text-slate-900">Activity timeline</div>
          <div class="mt-4 space-y-3">
            <div v-for="event in selected.events" :key="event.id" class="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ event.eventType }}</div>
              <div class="mt-1 text-sm text-slate-800">{{ event.message }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ formatDate(event.createdAt) }}</div>
            </div>
          </div>
        </ElCard>

        <div class="flex gap-2">
          <ElButton @click="refreshDetail">Refresh</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

