<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElTable, ElTableColumn, ElTag, ElButton, ElSelect, ElOption, ElMessage, ElInput } from 'element-plus';
import { fetchWebsiteLeads, updateWebsiteLeadStatus, type WebsiteLead } from '../../../api/website';

const leads = ref<WebsiteLead[]>([]);
const loading = ref(false);
const updatingId = ref<string | null>(null);
const filterStatus = ref<string>('');
const notesDraft = ref<Record<string, string>>({});
const router = useRouter();

const load = async () => {
  loading.value = true;
  try {
    leads.value = await fetchWebsiteLeads(filterStatus.value || undefined);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load leads');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const saveStatus = async (lead: WebsiteLead, status: WebsiteLead['status']) => {
  updatingId.value = lead.id;
  try {
    const updated = await updateWebsiteLeadStatus(lead.id, status, notesDraft.value[lead.id]);
    leads.value = leads.value.map((l) => (l.id === updated.id ? updated : l));
    ElMessage.success('Updated');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update lead');
  } finally {
    updatingId.value = null;
  }
};

const openInInbox = (lead: WebsiteLead) => {
  if (!lead.conversation_id) return;
  router.push({ name: 'admin-inbox', query: { conversationId: lead.conversation_id } });
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Website Leads</h1>
        <p class="text-sm text-slate-600">Track inbound requests from your website.</p>
      </div>
      <ElSelect v-model="filterStatus" placeholder="All" clearable size="small" @change="load">
        <ElOption label="All" value="" />
        <ElOption label="New" value="new" />
        <ElOption label="Contacted" value="contacted" />
        <ElOption label="Closed" value="closed" />
        <ElOption label="Converted" value="converted" />
      </ElSelect>
    </div>

    <ElTable :data="leads" :loading="loading" style="width: 100%">
      <ElTableColumn prop="name" label="Lead" min-width="180">
        <template #default="{ row }">
          <div class="text-base font-semibold text-slate-900">{{ row.name }}</div>
          <div class="text-xs text-slate-500 space-x-2">
            <span v-if="row.phone">{{ row.phone }}</span>
            <span v-if="row.email">{{ row.email }}</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="message" label="Message" min-width="220">
        <template #default="{ row }">
          <div class="text-sm text-slate-700">{{ row.message || '—' }}</div>
          <div class="text-xs text-slate-500" v-if="row.preferred_time">Preferred: {{ row.preferred_time }}</div>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="Status" width="150">
        <template #default="{ row }">
          <ElTag
            :type="
              row.status === 'closed'
                ? 'success'
                : row.status === 'contacted'
                  ? 'warning'
                  : row.status === 'converted'
                    ? 'success'
                    : 'info'
            "
          >
            {{ row.status }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Notes" min-width="200">
        <template #default="{ row }">
          <ElInput
            v-model="notesDraft[row.id]"
            :placeholder="row.notes || 'Add note...'"
            type="textarea"
            :rows="2"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Actions" width="260">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-2">
            <ElButton size="small" :loading="updatingId === row.id" @click="saveStatus(row, 'new')">Mark new</ElButton>
            <ElButton size="small" type="warning" plain :loading="updatingId === row.id" @click="saveStatus(row, 'contacted')">
              Contacted
            </ElButton>
            <ElButton size="small" type="success" plain :loading="updatingId === row.id" @click="saveStatus(row, 'closed')">
              Closed
            </ElButton>
            <ElButton size="small" type="success" :loading="updatingId === row.id" @click="saveStatus(row, 'converted')">
              Converted
            </ElButton>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            {{ new Date(row.created_at).toLocaleString() }} — {{ row.locale.toUpperCase() }} — {{ row.source_page || '/' }}
          </div>
          <div v-if="row.conversation_id" class="text-xs text-slate-600 mt-1 flex items-center gap-2">
            <span>Conversation:</span>
            <code class="bg-slate-100 px-2 py-0.5 rounded">{{ row.conversation_id.slice(0, 8) }}…</code>
            <ElButton size="small" text type="primary" @click="openInInbox(row)">Open in Inbox</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>
