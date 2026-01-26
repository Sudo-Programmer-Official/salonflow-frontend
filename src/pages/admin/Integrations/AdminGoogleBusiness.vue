<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElButton, ElInput, ElForm, ElFormItem, ElMessage } from 'element-plus';
import { connectGoogleBusiness, pullGoogleBusiness, syncGoogleBusiness } from '../../../api/integrations';

const form = ref({
  accessToken: '',
  refreshToken: '',
  profileName: '',
  profileId: '',
});

const connecting = ref(false);
const syncing = ref(false);

const connect = async () => {
  if (!form.value.accessToken) {
    ElMessage.warning('Provide access token');
    return;
  }
  connecting.value = true;
  try {
    await connectGoogleBusiness({
      access_token: form.value.accessToken,
      refresh_token: form.value.refreshToken || undefined,
      profile_name: form.value.profileName || undefined,
      profile_id: form.value.profileId || undefined,
    });
    ElMessage.success('Connected (tokens stored)');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Connect failed');
  } finally {
    connecting.value = false;
  }
};

const pull = async () => {
  syncing.value = true;
  try {
    await pullGoogleBusiness();
    ElMessage.success('Pull enqueued');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Pull failed');
  } finally {
    syncing.value = false;
  }
};

const sync = async () => {
  syncing.value = true;
  try {
    await syncGoogleBusiness();
    ElMessage.success('Sync enqueued');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Sync failed');
  } finally {
    syncing.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Google Business</span>
    </div>
    <h1 class="text-2xl font-semibold text-slate-900">Google Business Profile</h1>
    <ElCard shadow="never" class="border border-slate-200">
      <ElForm label-position="top" class="space-y-3">
        <ElFormItem label="Access token">
          <ElInput v-model="form.accessToken" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="Refresh token (optional)">
          <ElInput v-model="form.refreshToken" />
        </ElFormItem>
        <ElFormItem label="Profile name (display)">
          <ElInput v-model="form.profileName" />
        </ElFormItem>
        <ElFormItem label="Profile ID">
          <ElInput v-model="form.profileId" />
        </ElFormItem>
        <div class="flex gap-2">
          <ElButton type="primary" :loading="connecting" @click="connect">Save connection</ElButton>
          <ElButton :loading="syncing" @click="pull">Pull now</ElButton>
          <ElButton :loading="syncing" @click="sync">Sync now</ElButton>
        </div>
      </ElForm>
    </ElCard>
  </div>
</template>
