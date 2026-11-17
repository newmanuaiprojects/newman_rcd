'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/access';
import {
  addRolePermission,
  createRole,
  deleteUnusedRole,
  grantPermission,
  grantRole,
  removeGrant,
} from '@/lib/access/data';
import { parsePermission } from '@/lib/access/permissions';

export interface AccessFormState {
  error?: string;
}

const PAGE = '/admin/access';
const STALE = "That change didn't go through. Reload the page and try again.";
const LAST_MANAGER = 'At least one person needs access:manage. Give it to someone else first.';

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export async function assignRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  const admin = await requirePermission('access:manage');
  const userId = field(formData, 'userId');
  const roleId = field(formData, 'roleId');
  if (!userId || !roleId) return { error: STALE };

  await grantRole(userId, roleId, admin.id);
  revalidatePath(PAGE);
  return {};
}

export async function removeRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  await requirePermission('access:manage');
  const userId = field(formData, 'userId');
  const roleId = field(formData, 'roleId');
  if (!userId || !roleId) return { error: STALE };

  if ((await removeGrant({ kind: 'userRole', userId, roleId })) === 'last-access-manager') {
    return { error: LAST_MANAGER };
  }
  revalidatePath(PAGE);
  return {};
}

export async function grantUserPermission(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  const admin = await requirePermission('access:manage');
  const userId = field(formData, 'userId');
  const permission = parsePermission(field(formData, 'permission') ?? '');
  if (!userId || !permission) return { error: STALE };

  await grantPermission(userId, permission, admin.id);
  revalidatePath(PAGE);
  return {};
}

export async function revokeUserPermission(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  await requirePermission('access:manage');
  const userId = field(formData, 'userId');
  const permission = parsePermission(field(formData, 'permission') ?? '');
  if (!userId || !permission) return { error: STALE };

  if ((await removeGrant({ kind: 'userPermission', userId, permission })) === 'last-access-manager') {
    return { error: LAST_MANAGER };
  }
  revalidatePath(PAGE);
  return {};
}

export async function addPermissionToRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  const admin = await requirePermission('access:manage');
  const roleId = field(formData, 'roleId');
  const permission = parsePermission(field(formData, 'permission') ?? '');
  if (!roleId || !permission) return { error: STALE };

  await addRolePermission(roleId, permission, admin.id);
  revalidatePath(PAGE);
  return {};
}

export async function removePermissionFromRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  await requirePermission('access:manage');
  const roleId = field(formData, 'roleId');
  const permission = parsePermission(field(formData, 'permission') ?? '');
  if (!roleId || !permission) return { error: STALE };

  if ((await removeGrant({ kind: 'rolePermission', roleId, permission })) === 'last-access-manager') {
    return { error: LAST_MANAGER };
  }
  revalidatePath(PAGE);
  return {};
}

export async function addRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  await requirePermission('access:manage');
  const name = field(formData, 'name');
  if (!name) return { error: 'Give the role a name.' };

  if ((await createRole(name, field(formData, 'description') ?? null)) === 'name-taken') {
    return { error: `There's already a role called ${name}.` };
  }
  revalidatePath(PAGE);
  return {};
}

export async function deleteRole(state: AccessFormState, formData: FormData): Promise<AccessFormState> {
  await requirePermission('access:manage');
  const roleId = field(formData, 'roleId');
  if (!roleId) return { error: STALE };

  if ((await deleteUnusedRole(roleId)) === 'in-use') {
    return { error: 'Remove everyone from this role before deleting it.' };
  }
  revalidatePath(PAGE);
  return {};
}
