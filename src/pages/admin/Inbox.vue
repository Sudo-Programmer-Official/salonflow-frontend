<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ElButton, ElCard, ElEmpty, ElInput, ElMessage, ElSkeleton, ElTag, ElSelect, ElOption } from 'element-plus';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  fetchConversations,
  fetchMessages,
  replyToConversation,
  markConversationRead,
  updateConversationStatus,
  type Conversation,
  type Message,
  type ConversationStatusFilter,
  type ConversationChannelFilter,
} from '../../api/inbox';
import { useInboxNotifications } from '../../utils/inboxNotifications';

dayjs.extend(relativeTime);

const conversations = ref<Conversation[]>([]);
const loading = ref(false);
const loadingThread = ref(false);
const sending = ref(false);
const updatingStatus = ref(false);
const statusFilter = ref<ConversationStatusFilter>('active');
const channelFilter = ref<ConversationChannelFilter>('all');
const selectedId = ref<string | null>(null);
const messages = ref<Message[]>([]);
const selectedConversation = computed(() => conversations.value.find((c) => c.id === selectedId.value) || null);
const replyText = ref('');
const pollId = ref<number | null>(null);
const { refreshUnread: refreshUnreadCount } = useInboxNotifications();
const route = useRoute();

const statusFilterOptions: { label: string; value: ConversationStatusFilter }[] = [
  { label: 'Active', value: 'active' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Closed', value: 'closed' },
  { label: 'Converted', value: 'converted' },
  { label: 'All', value: 'all' },
];

const formatTime = (ts?: string | null) => (ts ? dayjs(ts).fromNow() : '');

const loadConversations = async () => {
  loading.value = true;
  try {
    conversations.value = await fetchConversations(statusFilter.value, channelFilter.value);
    const targetId = selectedId.value || (route.query.conversationId as string | undefined);
    const target = targetId ? conversations.value.find((c) => c.id === targetId) : null;
    const first = conversations.value[0];
    if (target) {
      selectConversation(target.id);
    } else if (!selectedId.value && first) {
      selectConversation(first.id);
    } else if (!first) {
      selectedId.value = null;
      messages.value = [];
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load conversations');
  } finally {
    loading.value = false;
  }
};

const mergeMessages = (existing: Message[], incoming: Message[]) => {
  const key = (m: Message) => m.providerMessageId || `${m.created_at}|${m.direction}|${m.body}`;
  const seen = new Set(existing.map(key));
  const merged = [...existing];
  for (const m of incoming) {
    const k = key(m);
    if (!seen.has(k)) {
      merged.push(m);
      seen.add(k);
    }
  }
  return merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

const loadMessages = async (id: string, merge = false) => {
  loadingThread.value = true;
  try {
    const data = await fetchMessages(id);
    messages.value = merge ? mergeMessages(messages.value, data.messages) : data.messages;
    await markConversationRead(id);
    await refreshUnreadCount({ silent: true });
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load messages');
  } finally {
    loadingThread.value = false;
  }
};

const selectConversation = (id: string) => {
  selectedId.value = id;
  loadMessages(id);
};

const sendReply = async () => {
  if (!selectedConversation.value || !replyText.value.trim()) return;
  sending.value = true;
  try {
    await replyToConversation(selectedConversation.value.id, replyText.value.trim());
    replyText.value = '';
    await loadMessages(selectedConversation.value.id);
    await loadConversations();
  } catch (err: any) {
    if (err?.code === 'NO_CONSENT') {
      ElMessage.warning('Customer opted out (STOP). Cannot reply.');
    } else if (err?.code === 'NO_PHONE') {
      ElMessage.warning('No phone available to reply.');
    } else if (err?.code === 'COMMS_PAUSED') {
      ElMessage.warning('Comms are paused.');
    } else {
      ElMessage.error(err?.message || 'Failed to send reply');
    }
  } finally {
    sending.value = false;
  }
};

const setStatus = async (status: Conversation['status']) => {
  if (!selectedConversation.value) return;
  updatingStatus.value = true;
  try {
    await updateConversationStatus(selectedConversation.value.id, status);
    await loadConversations();
    if (selectedId.value) {
      await loadMessages(selectedId.value, true);
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update status');
  } finally {
    updatingStatus.value = false;
  }
};

const badgeText = (c: Conversation) => {
  switch (c.status) {
    case 'new':
      return 'New';
    case 'contacted':
      return 'Contacted';
    case 'converted':
      return 'Converted';
    case 'closed':
    default:
      return 'Closed';
  }
};
const badgeType = (c: Conversation) => {
  switch (c.status) {
    case 'new':
      return 'info';
    case 'contacted':
      return 'warning';
    case 'converted':
      return 'success';
    case 'closed':
    default:
      return 'info';
  }
};
const channelBadgeType = (c: Conversation) =>
  c.channel === 'email' ? 'info' : c.channel === 'website' ? 'primary' : 'warning';
const channelBadgeText = (c: Conversation) =>
  c.channel === 'email' ? 'Email' : c.channel === 'website' ? 'Website' : 'SMS';

const messageAlign = (m: Message) => (m.direction === 'outbound' ? 'flex-row-reverse' : 'flex-row');
const messageTone = (m: Message) => (m.direction === 'outbound' ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-900');

onMounted(() => {
  loadConversations();
  pollId.value = window.setInterval(() => {
    loadConversations();
    if (selectedId.value) {
      loadMessages(selectedId.value, true);
    }
  }, 5000);
});

onUnmounted(() => {
  if (pollId.value) window.clearInterval(pollId.value);
});
</script>

<template>
  <div class="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
    <ElCard class="md:col-span-1 h-full overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-3">
        <div class="font-semibold">Inbox</div>
        <ElSelect
          v-model="statusFilter"
          size="small"
          class="status-select"
          @change="() => loadConversations()"
          placeholder="Filter status"
        >
          <ElOption v-for="opt in statusFilterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </ElSelect>
      </div>
      <div class="flex gap-2 mb-3 text-sm">
        <ElButton
          size="small"
          :type="channelFilter === 'all' ? 'primary' : 'default'"
          @click="() => { channelFilter = 'all'; loadConversations(); }"
        >
          All
        </ElButton>
        <ElButton
          size="small"
          :type="channelFilter === 'sms' ? 'primary' : 'default'"
          @click="() => { channelFilter = 'sms'; loadConversations(); }"
        >
          SMS
        </ElButton>
        <ElButton
          size="small"
          :type="channelFilter === 'email' ? 'primary' : 'default'"
          @click="() => { channelFilter = 'email'; loadConversations(); }"
        >
          Email
        </ElButton>
        <ElButton
          size="small"
          :type="channelFilter === 'website' ? 'primary' : 'default'"
          @click="() => { channelFilter = 'website'; loadConversations(); }"
        >
          Website
        </ElButton>
      </div>
      <div class="flex-1 overflow-y-auto">
        <ElSkeleton v-if="loading" animated :rows="6" />
        <template v-else>
          <ElEmpty v-if="!conversations.length" description="No conversations yet" />
          <div v-else class="space-y-2">
            <button
              v-for="c in conversations"
              :key="c.id"
              class="w-full rounded-lg border p-3 text-left transition hover:border-sky-300"
              :class="selectedId === c.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'"
              @click="selectConversation(c.id)"
            >
              <div class="flex items-center justify-between">
                <div class="font-semibold">{{ c.contactName || c.contactPhone || 'Unknown' }}</div>
                <div class="flex gap-1">
                  <ElTag size="small" :type="channelBadgeType(c)">{{ channelBadgeText(c) }}</ElTag>
                  <ElTag size="small" :type="badgeType(c)">{{ badgeText(c) }}</ElTag>
                </div>
              </div>
              <div class="text-xs text-slate-500">{{ formatTime(c.lastMessageAt) }}</div>
              <div class="mt-1 text-sm text-slate-700 line-clamp-2">{{ c.lastMessagePreview || '...' }}</div>
              <div v-if="c.unreadCount > 0" class="mt-1 inline-flex rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white">
                {{ c.unreadCount }} new
              </div>
            </button>
          </div>
        </template>
      </div>
    </ElCard>

    <ElCard class="md:col-span-2 h-full flex flex-col">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-slate-900">
              {{ selectedConversation?.contactName || selectedConversation?.contactPhone || 'Select a conversation' }}
            </div>
            <div class="text-xs text-slate-500 flex gap-2 items-center">
              <span v-if="selectedConversation">{{ badgeText(selectedConversation) }}</span>
              <ElTag v-if="selectedConversation" size="small" :type="channelBadgeType(selectedConversation)">
                {{ channelBadgeText(selectedConversation) }}
              </ElTag>
            </div>
          </div>
          <div class="flex gap-2">
            <ElButton
              size="small"
              type="warning"
              plain
              :disabled="
                !selectedConversation ||
                selectedConversation.status === 'contacted' ||
                selectedConversation.status === 'closed' ||
                selectedConversation.status === 'converted' ||
                updatingStatus
              "
              :loading="updatingStatus"
              @click="setStatus('contacted')"
            >
              Mark contacted
            </ElButton>
            <ElButton
              size="small"
              type="success"
              plain
              :disabled="!selectedConversation || selectedConversation.status === 'converted' || updatingStatus"
              :loading="updatingStatus"
              @click="setStatus('converted')"
            >
              Mark converted
            </ElButton>
            <ElButton
              size="small"
              type="info"
              plain
              :disabled="!selectedConversation || selectedConversation.status === 'closed' || updatingStatus"
              :loading="updatingStatus"
              @click="setStatus('closed')"
            >
              Close
            </ElButton>
          </div>
        </div>
      </template>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <ElSkeleton v-if="loadingThread" :rows="5" animated />
        <ElEmpty v-else-if="!selectedConversation" description="Select a conversation" />
        <div v-else class="space-y-3">
          <div
            v-for="m in messages"
            :key="m.providerMessageId || m.created_at"
            class="flex"
            :class="messageAlign(m)"
          >
            <div class="max-w-[80%] rounded-lg px-3 py-2 shadow-sm" :class="messageTone(m)">
              <div class="text-sm whitespace-pre-line">{{ m.body }}</div>
              <div class="mt-1 text-[11px] text-slate-500 flex gap-2 justify-end">
                <span>{{ dayjs(m.created_at).format('MMM D, h:mm a') }}</span>
                <span v-if="m.direction === 'outbound'" class="uppercase">{{ m.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedConversation" class="mt-3 border-t pt-3">
        <div class="mb-2 text-xs text-slate-500">
          Replies are sent from the shared SalonFlow number on behalf of this salon.
        </div>
        <ElInput
          v-model="replyText"
          type="textarea"
          :rows="3"
          placeholder="Type a reply..."
          :disabled="selectedConversation.status === 'closed' || selectedConversation.status === 'converted'"
          @keydown.enter.prevent="sendReply"
        />
        <div class="mt-2 flex justify-between items-center">
          <div class="text-xs text-slate-500">
            {{
              selectedConversation.status === 'closed' || selectedConversation.status === 'converted'
                ? 'Conversation is closed.'
                : ''
            }}
          </div>
          <div class="flex gap-2">
            <ElButton
              type="primary"
              :disabled="
                !replyText.trim() ||
                selectedConversation.status === 'closed' ||
                selectedConversation.status === 'converted' ||
                sending
              "
              :loading="sending"
              @click="sendReply"
            >
              Send reply
            </ElButton>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>
<style scoped>
.status-select { min-width: 160px; }
</style>
