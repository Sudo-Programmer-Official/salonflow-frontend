import { apiUrl, buildHeaders } from '@/api/client';

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  serviceCount?: number;
  createdAt?: string;
};

const apiBase = apiUrl('/service-categories');

export async function fetchCategories(): Promise<ServiceCategory[]> {
  const res = await fetch(apiBase, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load categories');
  }
  return res.json();
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
}): Promise<ServiceCategory> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create category');
  }
  return res.json();
}

export async function updateCategory(
  categoryId: string,
  input: Partial<{ name: string; icon: string; sortOrder: number; active: boolean }>,
): Promise<ServiceCategory> {
  const res = await fetch(`${apiBase}/${categoryId}`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update category');
  }
  return res.json();
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const res = await fetch(`${apiBase}/${categoryId}`, {
    method: 'DELETE',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (res.status === 204) return;
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || 'Failed to delete category');
}
