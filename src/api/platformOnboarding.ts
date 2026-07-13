import { apiUrl, buildHeaders } from './client';

export type OnboardingLifecycleStage =
  | 'LEAD'
  | 'DEMO_REQUESTED'
  | 'DEMO_SENT'
  | 'CONVERTED'
  | 'ONBOARDING'
  | 'DEPLOYMENT'
  | 'VALIDATION'
  | 'LIVE'
  | 'PAUSED'
  | 'ARCHIVED';

export type OnboardingProjectStage =
  | 'PROVISIONING'
  | 'WEBSITE'
  | 'DEPLOYMENT'
  | 'VALIDATION'
  | 'LIVE'
  | 'PAUSED'
  | 'ARCHIVED';

export type OnboardingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export type OnboardingTaskRecord = {
  id: string;
  onboardingProjectId: string;
  category: string;
  taskKey: string;
  title: string;
  status: OnboardingTaskStatus;
  required: boolean;
  sortOrder: number;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingEventRecord = {
  id: string;
  onboardingProjectId: string;
  eventType: string;
  message: string;
  payload: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
};

export type OnboardingProject = {
  id: string;
  businessId: string;
  businessName: string;
  subdomain: string;
  isDemo: boolean;
  lifecycleStage: OnboardingLifecycleStage;
  lifecycleProgress: number;
  lifecycleNextAction: string | null;
  title: string;
  source: string;
  stage: OnboardingProjectStage;
  progress: number;
  nextAction: string | null;
  status: string;
  assignedToUserId: string | null;
  dueAt: string | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string | null;
  tasks: OnboardingTaskRecord[];
  events: OnboardingEventRecord[];
};

export type OnboardingListResponse = {
  projects: Array<Pick<
    OnboardingProject,
    | 'id'
    | 'businessId'
    | 'businessName'
    | 'subdomain'
    | 'isDemo'
    | 'lifecycleStage'
    | 'lifecycleProgress'
    | 'lifecycleNextAction'
    | 'title'
    | 'source'
    | 'stage'
    | 'progress'
    | 'nextAction'
    | 'status'
    | 'assignedToUserId'
    | 'dueAt'
    | 'startedAt'
    | 'completedAt'
    | 'notes'
    | 'lastActivityAt'
    | 'createdAt'
    | 'updatedAt'
    | 'ownerEmail'
  >>;
};

export async function fetchOnboardingProjects(): Promise<OnboardingListResponse> {
  const res = await fetch(apiUrl('/platform/onboarding-projects'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to load onboarding projects');
  return body as OnboardingListResponse;
}

export async function fetchOnboardingProject(projectId: string): Promise<{ project: OnboardingProject }> {
  const res = await fetch(apiUrl(`/platform/onboarding-projects/${projectId}`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to load onboarding project');
  return body as { project: OnboardingProject };
}

export async function updateOnboardingTask(
  projectId: string,
  taskKey: string,
  payload: {
    status?: OnboardingTaskStatus;
    completedBy?: string | null;
    completedAt?: string | null;
    notes?: string | null;
  },
): Promise<{ project: OnboardingProject }> {
  const res = await fetch(apiUrl(`/platform/onboarding-projects/${projectId}/tasks/${taskKey}`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to update onboarding task');
  return body as { project: OnboardingProject };
}

